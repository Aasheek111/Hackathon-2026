import React from "react";
import { Volume2, Square, Mic, MicOff, Headphones, X } from "lucide-react";
import { useAudioNavigation } from "../contexts/AudioNavigationContext";
import { useAuth } from "../contexts/AuthContext";

/**
 * Always-present audio controls.
 *
 * Rendered FIRST in the app's DOM so it is the first thing reached by Tab.
 * That ordering is the whole point: a blind learner pressing Tab once on any
 * screen lands on "Read this screen" and can drive the app from there,
 * instead of having to already know that a button exists somewhere below.
 * It is pinned to the bottom visually so it doesn't fight each page's header.
 *
 * Hidden entirely for signed-out visitors, and collapsed to a single small
 * button for anyone who hasn't switched audio navigation on - it should not
 * be clutter for learners who don't need it.
 */
export const AudioControlBar: React.FC = () => {
  const { token, user } = useAuth();
  const {
    enabled,
    applicable,
    dismissed,
    setEnabled,
    unlocked,
    listening,
    lastHeard,
    micError,
    numberedTargets,
    micSupported,
    readPage,
    stop,
    toggleMic,
  } = useAudioNavigation();

  if (!token) return null;

  // Learner-only. disabilityType is a student-only column (see the schema),
  // so audio navigation can never actually be profile-enabled for a teacher
  // or admin - offering it on their consoles would be a control that leads
  // nowhere, and it would sit over their UI for no reason.
  if (user?.role !== 'STUDENT') return null;

  // Nothing at all for a deaf learner - an audio prompt is pure noise in the
  // way. Also nothing once it has been explicitly turned off: re-offering it
  // straight after someone dismissed it is nagging. Settings keeps a
  // permanent toggle for both cases.
  if (!applicable || dismissed) return null;

  // Off: a single quiet affordance. Kept in the tab order and clearly named so
  // it is discoverable by keyboard and screen reader without being visual noise.
  if (!enabled) {
    return (
      <button
        onClick={() => {
          setEnabled(true);
          // The click is a user gesture, so this first read also unlocks audio.
          setTimeout(readPage, 60);
        }}
        className="fixed bottom-3 left-3 z-50 flex items-center gap-2 px-3 py-2 rounded-full bg-slate-900/90 text-white text-xs font-bold shadow-lg hover:bg-slate-900 focus:outline-none focus:ring-4 focus:ring-emerald-400"
      >
        <Headphones className="w-4 h-4" aria-hidden="true" />
        Turn on audio navigation
      </button>
    );
  }

  return (
    <div
      role="region"
      aria-label="Audio navigation controls"
      className="fixed bottom-0 inset-x-0 z-50 bg-slate-900 text-white border-t-4 border-yellow-400 px-3 py-2"
    >
      {/* Sound is switched on but the browser hasn't let us make any yet. Say
          so rather than appearing to work - this is the failure that made the
          audio dashboard seem silently broken. */}
      {!unlocked && (
        <p className="text-yellow-200 text-sm font-bold mb-2 text-center">
          Press any button below to switch sound on.
        </p>
      )}

      <div className="flex flex-wrap items-center justify-center gap-2">
        <button
          onClick={readPage}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-yellow-400 text-black text-sm font-bold hover:bg-yellow-300 focus:outline-none focus:ring-4 focus:ring-white"
        >
          <Volume2 className="w-5 h-5" aria-hidden="true" />
          Read this screen
          <kbd className="hidden sm:inline text-[10px] font-mono opacity-70">Alt+R</kbd>
        </button>

        <button
          onClick={stop}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-black text-sm font-bold hover:bg-gray-200 focus:outline-none focus:ring-4 focus:ring-yellow-300"
        >
          <Square className="w-4 h-4" aria-hidden="true" />
          Stop
          <kbd className="hidden sm:inline text-[10px] font-mono opacity-70">Alt+S</kbd>
        </button>

        {micSupported ? (
          <button
            onClick={toggleMic}
            aria-pressed={listening}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold focus:outline-none focus:ring-4 focus:ring-white ${
              listening
                ? "bg-red-500 text-white hover:bg-red-400"
                : "bg-yellow-400 text-black hover:bg-yellow-300"
            }`}
          >
            {listening ? <Mic className="w-5 h-5" aria-hidden="true" /> : <MicOff className="w-5 h-5" aria-hidden="true" />}
            {listening ? "Listening — say a command" : "Voice control"}
            <kbd className="hidden sm:inline text-[10px] font-mono opacity-70">Alt+V</kbd>
          </button>
        ) : (
          <span className="text-xs text-yellow-200 px-2">
            Voice commands need Chrome or Edge — the buttons and keyboard still work.
          </span>
        )}

        <button
          onClick={() => setEnabled(false)}
          aria-label="Turn off audio navigation"
          className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-slate-700 text-white text-xs font-bold hover:bg-slate-600 focus:outline-none focus:ring-4 focus:ring-white"
        >
          <X className="w-4 h-4" aria-hidden="true" />
          Turn off
        </button>
      </div>

      {listening && (
        <p className="text-center text-xs text-gray-300 mt-1.5">
          {/* Echoing the last transcript makes a misheard word obvious
              immediately - otherwise a command that silently didn't match is
              indistinguishable from a microphone that isn't working. */}
          {lastHeard ? (
            <>
              Heard: <strong className="text-yellow-300">&ldquo;{lastHeard}&rdquo;</strong>
              <span className="mx-2 opacity-50">|</span>
            </>
          ) : null}
          Say &ldquo;read screen&rdquo;, &ldquo;read navigation&rdquo;, &ldquo;open lessons&rdquo;,
          &ldquo;my progress&rdquo;, &ldquo;help&rdquo;, or &ldquo;log out&rdquo;.
        </p>
      )}

      {/* What 1-9 do on THIS screen. Without this the numbers are invisible
          knowledge, and the classroom page in particular looked like it had
          no keyboard navigation at all. */}
      {numberedTargets.length > 0 && (
        <ul className="flex flex-wrap justify-center gap-x-3 gap-y-1 mt-2 text-xs text-gray-200 list-none p-0">
          {numberedTargets.map((t, i) => (
            <li key={`${t.label}-${i}`}>
              <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-yellow-400 text-black font-bold mr-1">
                {i + 1}
              </span>
              {t.label}
            </li>
          ))}
        </ul>
      )}

      {/* Voice can fail even where the API exists - Brave and most Chromium
          builds ship without the Google keys the transcription needs, so it
          errors `network` forever. Say that plainly instead of leaving a
          "Listening" button that never hears anything. */}
      {micError && (
        <p role="alert" className="text-center text-xs text-yellow-100 bg-yellow-950/60 border border-yellow-700 rounded-lg px-3 py-2 mt-2">
          {micError}
        </p>
      )}

      {user?.disabilityType === "BLINDNESS" && !micSupported && (
        <p className="text-center text-xs text-yellow-200 mt-1.5">
          Tip: use Tab and Enter to move around. Alt+R reads any screen.
        </p>
      )}
    </div>
  );
};

export default AudioControlBar;
