import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Voice navigation built on the browser's own Web Speech API
 * (`SpeechRecognition` / `webkitSpeechRecognition`).
 *
 * Deliberately browser-native rather than a hosted STT service: it needs no
 * API key, costs nothing per utterance, and - the point for this platform -
 * it keeps working with no network. It is genuinely not supported everywhere
 * though (Firefox ships it off by default), so `supported` is exposed and
 * every screen using this MUST keep a full keyboard/button path working. This
 * is an accelerator, never the only way to operate a page.
 *
 * Recognition is restarted on `onend` while listening is on, because Chrome
 * stops the stream after a few seconds of silence; without that the mic
 * appears to "go deaf" a moment after being switched on.
 */

export interface VoiceCommand {
  /** Spoken phrases that trigger this command, lower-case. Matched as substrings. */
  phrases: string[];
  run: (transcript: string) => void;
  /** Shown in the on-screen command list. */
  description: string;
}

// Minimal structural types - TS's DOM lib doesn't ship SpeechRecognition.
interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: any) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: any) => void) | null;
}

function getRecognitionCtor(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === 'undefined') return null;
  const w = window as any;
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

/**
 * Voice activity goes to the console under one filterable prefix, so
 * "[voice]" in the devtools filter shows the whole conversation: whether the
 * microphone actually started, what words came back, and whether they matched
 * a command. Diagnosing voice control without this means guessing which of
 * those three steps failed.
 *
 * Dev-only - a learner's console shouldn't fill up with this in production.
 */
function voiceLog(message: string, ...rest: unknown[]) {
  if (import.meta.env.PROD) return;
  // eslint-disable-next-line no-console
  console.log(`%c[voice]%c ${message}`, 'color:#059669;font-weight:bold', 'color:inherit', ...rest);
}

export function useVoiceCommands(commands: VoiceCommand[], enabled = true) {
  const [listening, setListening] = useState(false);
  const [lastHeard, setLastHeard] = useState('');
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  // Listening state and the command list are read from inside long-lived
  // recognition callbacks, so they're mirrored into refs - reading the state
  // variable directly would capture the value from the render that installed
  // the handler and go stale the moment a command changes.
  const listeningRef = useRef(false);
  const commandsRef = useRef(commands);
  commandsRef.current = commands;

  const supported = getRecognitionCtor() !== null;

  const handleTranscript = useCallback((raw: string) => {
    const transcript = raw.toLowerCase().trim();
    if (!transcript) return;
    setLastHeard(transcript);
    // Longest phrase first so "next question" beats a bare "next" when both
    // are registered - otherwise the shorter, more generic command shadows it.
    const ranked = commandsRef.current
      .flatMap((command) => command.phrases.map((phrase) => ({ command, phrase })))
      .sort((a, b) => b.phrase.length - a.phrase.length);
    const hit = ranked.find(({ phrase }) => transcript.includes(phrase));

    // Logged because "it didn't hear me" and "it heard me but matched
    // nothing" are completely different bugs, and without this they look
    // identical from the outside. On a miss, list what WAS available so the
    // gap between what was said and what is registered is obvious.
    if (hit) {
      voiceLog(`heard "${transcript}" -> matched "${hit.phrase}" (${hit.command.description})`);
    } else {
      voiceLog(
        `heard "${transcript}" -> NO MATCH. Available: ` +
          commandsRef.current.map((c) => `"${c.phrases[0]}"`).join(', '),
      );
    }

    if (hit) hit.command.run(transcript);
  }, []);

  const stop = useCallback(() => {
    if (listeningRef.current) voiceLog('microphone stopped');
    listeningRef.current = false;
    setListening(false);
    recognitionRef.current?.abort();
    recognitionRef.current = null;
  }, []);

  const start = useCallback(() => {
    const Ctor = getRecognitionCtor();
    if (!Ctor) {
      setError('Voice control is not supported in this browser. Try Chrome or Edge.');
      return;
    }
    if (recognitionRef.current) return;

    const recognition = new Ctor();
    recognition.lang = 'en-US';
    recognition.continuous = true;
    recognition.interimResults = false;

    recognition.onresult = (event: any) => {
      const result = event.results[event.results.length - 1];
      if (result?.isFinal !== false) handleTranscript(result[0].transcript);
    };
    recognition.onerror = (event: any) => {
      voiceLog(`recognition error: ${event.error}`);
      // 'no-speech' and 'aborted' are normal in continuous mode - only a
      // genuine permission/hardware problem is worth telling the learner about.
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        setError('Microphone access was blocked. Allow it in your browser to use voice control.');
        listeningRef.current = false;
        setListening(false);
      } else if (event.error === 'audio-capture') {
        setError('No microphone was found.');
        listeningRef.current = false;
        setListening(false);
      }
    };
    recognition.onend = () => {
      // Chrome ends the stream after a silence; restart so "listening" means
      // listening. Guarded by the ref so an explicit stop() stays stopped.
      if (listeningRef.current && recognitionRef.current === recognition) {
        voiceLog('stream ended (silence) - restarting');
        try {
          recognition.start();
        } catch {
          /* already starting - harmless */
        }
      }
    };

    recognitionRef.current = recognition;
    listeningRef.current = true;
    setError(null);
    setListening(true);
    voiceLog(
      `microphone starting - ${commandsRef.current.length} commands registered`,
      commandsRef.current.map((c) => c.phrases[0]),
    );
    try {
      recognition.start();
    } catch {
      /* start() throws if called twice in a row - already listening */
    }
  }, [handleTranscript]);

  const toggle = useCallback(() => {
    if (listeningRef.current) stop();
    else start();
  }, [start, stop]);

  // Always release the microphone on unmount - leaving it live after
  // navigating away would keep the browser's recording indicator on.
  useEffect(() => stop, [stop]);

  useEffect(() => {
    if (!enabled && listeningRef.current) stop();
  }, [enabled, stop]);

  return { listening, lastHeard, error, supported, start, stop, toggle };
}

export default useVoiceCommands;
