import { useCallback, useRef, useState } from "react";
import api from "../lib/api";

const RAG_SERVICE_URL =
  import.meta.env.VITE_RAG_SERVICE_URL || "http://localhost:8100";

/**
 * Server TTS availability, remembered for the page session.
 *
 * The server clip is the nicer voice, but it is genuinely optional: Groq's
 * TTS model requires a one-time terms acceptance in the Groq console, and
 * until an org admin does that every /tts call returns 502 (see
 * rag_engine._generate_speech_via_groq). Retrying a known-dead endpoint
 * before EVERY utterance added a visible stall to each question, so once we
 * see it fail we stop asking and go straight to the browser voice.
 *
 * Module-level rather than per-hook so all the components using speech share
 * one verdict instead of each rediscovering it.
 */
let serverTtsAvailable: boolean | null = null; // null = not yet tried

/**
 * Chrome populates getVoices() asynchronously; speaking before the list is
 * ready can produce silence with no error. Resolves once voices exist, or
 * after a short grace period (some browsers legitimately report none and
 * still speak fine with the default voice).
 */
function voicesReady(synth: SpeechSynthesis): Promise<void> {
  if (synth.getVoices().length > 0) return Promise.resolve();
  return new Promise((resolve) => {
    const done = () => {
      synth.removeEventListener("voiceschanged", done);
      resolve();
    };
    synth.addEventListener("voiceschanged", done);
    setTimeout(done, 500);
  });
}

/**
 * Text-to-speech with a real fallback chain:
 *   pre-generated clip  ->  server TTS (/api/tts)  ->  the browser's own voice
 *
 * `speak` resolves to whether sound was actually produced, and the hook
 * exposes `blocked` so a screen can tell the learner "tap to enable sound"
 * rather than silently saying nothing - which is the worst possible failure
 * mode on an audio-first dashboard.
 *
 * Shared by the curriculum player, storybook, and the audio dashboard/quiz.
 */
export function useSpeech() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [loading, setLoading] = useState(false);
  // True when the last attempt produced no sound at all. Almost always the
  // browser's autoplay policy: audio and speechSynthesis both refuse to start
  // until the user has interacted with the page, so a greeting fired from a
  // mount effect on a fresh page load is silently dropped.
  const [blocked, setBlocked] = useState(false);
  const synth = typeof window !== "undefined" ? window.speechSynthesis : undefined;

  const playUrl = useCallback(async (url: string, onEnded?: () => void) => {
    if (!audioRef.current) audioRef.current = new Audio();
    audioRef.current.onended = onEnded ?? null;
    audioRef.current.src = url.startsWith("http") ? url : `${RAG_SERVICE_URL}${url}`;
    await audioRef.current.play();
  }, []);

  /**
   * Speak with the browser's built-in voice. Resolves true only once the
   * utterance actually STARTS - speechSynthesis.speak() is fire-and-forget
   * and stays silent (without throwing) when it's blocked, so waiting for
   * `onstart` is the only reliable way to know a learner heard anything.
   */
  const speakViaBrowser = useCallback(
    async (text: string, onEnded?: () => void): Promise<boolean> => {
      if (!synth) return false;
      await voicesReady(synth);

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.95;
      if (onEnded) utterance.onend = onEnded;

      return new Promise<boolean>((resolve) => {
        let settled = false;
        const finish = (ok: boolean) => {
          if (settled) return;
          settled = true;
          resolve(ok);
        };
        utterance.onstart = () => finish(true);
        utterance.onerror = () => finish(false);
        // Nothing started within a second => blocked or dropped on the floor.
        setTimeout(() => {
          if (!settled) {
            synth.cancel(); // don't leave a stuck utterance queued
            finish(false);
          }
        }, 1000);
        synth.speak(utterance);
        // Chrome occasionally parks the queue in a paused state after a
        // cancel(); resume() is a no-op when it isn't.
        synth.resume();
      });
    },
    [synth],
  );

  /**
   * preGeneratedUrl: a clip produced on the queue worker (instant, no
   * round-trip). onEnded: fires when the clip finishes - used by audiobook
   * mode to chain into the next lesson hands-free.
   *
   * Returns true if sound was produced.
   */
  const speak = useCallback(
    async (text: string, preGeneratedUrl?: string | null, onEnded?: () => void): Promise<boolean> => {
      const trimmed = (text || "").trim();
      if (!trimmed && !preGeneratedUrl) return false;

      synth?.cancel();
      audioRef.current?.pause();
      setLoading(true);

      try {
        if (preGeneratedUrl) {
          try {
            await playUrl(preGeneratedUrl, onEnded);
            setBlocked(false);
            return true;
          } catch {
            /* fall through to the browser voice below */
          }
        }

        if (trimmed && serverTtsAvailable !== false) {
          try {
            const { data } = await api.post("/tts", { text: trimmed });
            serverTtsAvailable = true;
            await playUrl(data.audioUrl, onEnded);
            setBlocked(false);
            return true;
          } catch (err: any) {
            // A 502 means the TTS provider itself is unavailable (Groq terms
            // not accepted) - remember that so we stop paying the round-trip.
            // A media error just means this clip wouldn't play; keep the
            // endpoint marked usable and let the browser voice handle it.
            if (err?.response) serverTtsAvailable = false;
          }
        }

        if (trimmed) {
          const spoke = await speakViaBrowser(trimmed, onEnded);
          setBlocked(!spoke);
          return spoke;
        }

        onEnded?.();
        return false;
      } finally {
        setLoading(false);
      }
    },
    [playUrl, speakViaBrowser, synth],
  );

  const stop = useCallback(() => {
    audioRef.current?.pause();
    synth?.cancel();
  }, [synth]);

  return { speak, stop, loading, blocked };
}

export default useSpeech;
