import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Mic,
  MicOff,
  Volume2,
  Square,
  BookOpen,
  ClipboardList,
  TrendingUp,
  Settings as SettingsIcon,
  LogOut,
  Sparkles,
  Loader2,
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { useSpeech } from "../../hooks/useSpeech";
import { useVoiceCommands, VoiceCommand } from "../../hooks/useVoiceCommands";
import api from "../../lib/api";

/**
 * Audio-first dashboard for blind and low-vision learners.
 *
 * Design rules, in priority order:
 *  1. Everything is reachable by keyboard alone, in a sensible tab order,
 *     with a visible focus ring. Voice is an accelerator on top, never the
 *     only route - `useVoiceCommands` is unsupported in some browsers.
 *  2. Every action is a real <button>/<a> with a real accessible name, so a
 *     screen reader announces it correctly without us reimplementing one.
 *  3. Status changes are announced through an aria-live region rather than
 *     only shown.
 *  4. Large hit targets and high contrast, because "blind" covers a wide
 *     range of usable vision.
 */

interface ProgressSummary {
  xp: number;
  streakDays: number;
  badges: Array<{ name: string }>;
}

const ACTIONS = [
  { key: "quiz", label: "Start quiz", detail: "Take a voice quiz. Questions and options are read aloud.", path: "/dashboard/blind/quiz", icon: ClipboardList },
  { key: "lessons", label: "Open lessons", detail: "Your classroom units, with every lesson narrated.", path: "/classroom", icon: BookOpen },
  { key: "progress", label: "My progress", detail: "Your scores, streak and badges.", path: "/progress", icon: TrendingUp },
  { key: "settings", label: "Settings", detail: "Change your accessibility profile, text size and narration.", path: "/settings", icon: SettingsIcon },
] as const;

export const BlindDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { speak, stop: stopSpeaking, loading: ttsLoading } = useSpeech();

  const [progress, setProgress] = useState<ProgressSummary | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [asking, setAsking] = useState(false);
  const questionRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api
      .get("/progress")
      .then(({ data }) => setProgress(data))
      .catch(() => setProgress(null));
  }, []);

  /** Say something AND put it in the live region, so it lands for both TTS and a screen reader. */
  const announce = useCallback(
    (text: string) => {
      setAnnouncement(text);
      speak(text);
    },
    [speak],
  );

  const screenSummary = useMemo(() => {
    const name = user?.name ? `, ${user.name}` : "";
    const stats = progress
      ? `You have ${progress.xp} experience points, a ${progress.streakDays} day streak, and ${progress.badges?.length ?? 0} badges.`
      : "";
    return (
      `Welcome back${name}. This is your audio dashboard. ${stats} ` +
      `There are ${ACTIONS.length} things you can do: ` +
      ACTIONS.map((a, i) => `${i + 1}. ${a.label}. ${a.detail}`).join(" ") +
      " You can say: start quiz, open lessons, my progress, settings, read screen, repeat, stop, or log out."
    );
  }, [user?.name, progress]);

  const go = useCallback(
    (path: string, label: string) => {
      stopSpeaking();
      setAnnouncement(`Opening ${label}`);
      navigate(path);
    },
    [navigate, stopSpeaking],
  );

  const askAssistant = useCallback(
    async (raw: string) => {
      const q = raw.trim();
      if (!q) return;
      setAsking(true);
      setAnswer("");
      announce("Thinking.");
      try {
        const { data } = await api.post("/assistant/ask", { question: q });
        setAnswer(data.answer);
        announce(data.answer);
      } catch (err: any) {
        const message =
          err.response?.data?.error || "Sorry, I could not answer that right now. Please try again.";
        setAnswer(message);
        announce(message);
      } finally {
        setAsking(false);
      }
    },
    [announce],
  );

  const commands: VoiceCommand[] = useMemo(
    () => [
      { phrases: ["start quiz", "open quiz", "take quiz", "begin quiz"], description: "Start quiz", run: () => go("/dashboard/blind/quiz", "the quiz") },
      { phrases: ["open lessons", "my lessons", "open classroom", "lessons"], description: "Open lessons", run: () => go("/classroom", "lessons") },
      { phrases: ["my progress", "open progress", "progress"], description: "My progress", run: () => go("/progress", "progress") },
      { phrases: ["open settings", "settings"], description: "Settings", run: () => go("/settings", "settings") },
      { phrases: ["read screen", "read this", "what is on the screen", "where am i"], description: "Read screen", run: () => announce(screenSummary) },
      { phrases: ["repeat"], description: "Repeat", run: () => speak(announcement || screenSummary) },
      { phrases: ["stop", "be quiet", "silence"], description: "Stop reading", run: () => stopSpeaking() },
      { phrases: ["log out", "logout", "sign out"], description: "Log out", run: () => { stopSpeaking(); logout(); navigate("/"); } },
      {
        // Anything starting "ask ..." / "explain ..." goes to the AI tutor.
        phrases: ["ask ", "explain ", "what is ", "tell me about "],
        description: 'Ask the assistant, e.g. "explain fractions"',
        run: (transcript: string) => {
          const cleaned = transcript.replace(/^(ask|explain|tell me about)\s+/i, "").trim();
          askAssistant(cleaned || transcript);
        },
      },
    ],
    [go, announce, screenSummary, speak, announcement, stopSpeaking, logout, navigate, askAssistant],
  );

  const { listening, lastHeard, error: voiceError, supported, toggle } = useVoiceCommands(commands);

  // Greet on arrival so a learner who cannot see the page immediately knows
  // where they are and what they can say - the audio equivalent of a heading.
  const greetedRef = useRef(false);
  useEffect(() => {
    if (greetedRef.current || !progress) return;
    greetedRef.current = true;
    announce(screenSummary);
  }, [progress, screenSummary, announce]);

  return (
    <div className="min-h-screen bg-black text-white font-sans">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:bg-yellow-300 focus:text-black focus:px-4 focus:py-2 focus:rounded-lg focus:font-bold"
      >
        Skip to main content
      </a>

      {/* Every status change lands here for screen readers, not just as speech. */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </div>

      <header className="border-b-2 border-yellow-400/40 px-5 py-4">
        <h1 className="text-3xl font-bold text-yellow-300">Audio Dashboard</h1>
        <p className="text-lg text-gray-200 mt-1">
          {user?.name ? `Welcome back, ${user.name}.` : "Welcome back."} Press Tab to move, Enter to choose.
        </p>
      </header>

      <main id="main" className="max-w-4xl mx-auto px-5 py-6 space-y-6">
        {/* Voice + read controls */}
        <section aria-labelledby="controls-heading" className="space-y-3">
          <h2 id="controls-heading" className="text-2xl font-bold text-yellow-300">
            Controls
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              onClick={() => announce(screenSummary)}
              disabled={ttsLoading}
              className="flex items-center justify-center gap-3 p-5 rounded-2xl bg-yellow-400 text-black text-xl font-bold border-4 border-transparent hover:bg-yellow-300 focus:outline-none focus:border-white disabled:opacity-70"
            >
              {ttsLoading ? <Loader2 className="w-7 h-7 animate-spin" /> : <Volume2 className="w-7 h-7" />}
              Read screen
            </button>
            <button
              onClick={() => { stopSpeaking(); setAnnouncement("Stopped reading."); }}
              className="flex items-center justify-center gap-3 p-5 rounded-2xl bg-white text-black text-xl font-bold border-4 border-transparent hover:bg-gray-200 focus:outline-none focus:border-yellow-300"
            >
              <Square className="w-7 h-7" /> Stop
            </button>
            <button
              onClick={toggle}
              aria-pressed={listening}
              disabled={!supported}
              className={`flex items-center justify-center gap-3 p-5 rounded-2xl text-xl font-bold border-4 border-transparent focus:outline-none focus:border-white disabled:opacity-50 ${
                listening ? "bg-red-500 text-white hover:bg-red-400" : "bg-yellow-400 text-black hover:bg-yellow-300"
              }`}
            >
              {listening ? <MicOff className="w-7 h-7" /> : <Mic className="w-7 h-7" />}
              {listening ? "Stop voice" : "Voice control"}
            </button>
          </div>

          {!supported && (
            <p className="text-lg text-yellow-200 bg-yellow-950/60 border-2 border-yellow-700 rounded-xl p-4">
              Voice control needs Chrome or Edge. Everything here still works with the keyboard and
              the buttons above.
            </p>
          )}
          {voiceError && (
            <p role="alert" className="text-lg text-red-200 bg-red-950/60 border-2 border-red-700 rounded-xl p-4">
              {voiceError}
            </p>
          )}
          {listening && (
            <p className="text-lg text-gray-200">
              Listening. {lastHeard ? `I heard: "${lastHeard}"` : "Say a command, for example: start quiz."}
            </p>
          )}
        </section>

        {/* Primary destinations */}
        <section aria-labelledby="actions-heading" className="space-y-3">
          <h2 id="actions-heading" className="text-2xl font-bold text-yellow-300">
            What would you like to do?
          </h2>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 list-none p-0">
            {ACTIONS.map((action) => {
              const Icon = action.icon;
              return (
                <li key={action.key}>
                  <button
                    onClick={() => go(action.path, action.label)}
                    className="w-full text-left p-5 rounded-2xl bg-gray-900 border-4 border-gray-700 hover:border-yellow-300 focus:outline-none focus:border-yellow-300"
                  >
                    <span className="flex items-center gap-3 text-2xl font-bold text-yellow-300">
                      <Icon className="w-7 h-7 shrink-0" aria-hidden="true" />
                      {action.label}
                    </span>
                    <span className="block text-lg text-gray-300 mt-1">{action.detail}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>

        {/* AI assistant */}
        <section aria-labelledby="assistant-heading" className="space-y-3">
          <h2 id="assistant-heading" className="text-2xl font-bold text-yellow-300">
            Ask the assistant
          </h2>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              askAssistant(question);
            }}
            className="flex flex-col sm:flex-row gap-3"
          >
            <label htmlFor="assistant-question" className="sr-only">
              Ask a question, for example: explain fractions
            </label>
            <input
              id="assistant-question"
              ref={questionRef}
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Explain fractions to me"
              className="flex-1 text-xl p-4 rounded-2xl bg-gray-900 text-white border-4 border-gray-700 placeholder:text-gray-500 focus:outline-none focus:border-yellow-300"
            />
            <button
              type="submit"
              disabled={asking || !question.trim()}
              className="flex items-center justify-center gap-2 px-6 py-4 rounded-2xl bg-yellow-400 text-black text-xl font-bold hover:bg-yellow-300 focus:outline-none focus:border-white border-4 border-transparent disabled:opacity-60"
            >
              {asking ? <Loader2 className="w-6 h-6 animate-spin" /> : <Sparkles className="w-6 h-6" />}
              Ask
            </button>
          </form>
          {answer && (
            <div className="p-5 rounded-2xl bg-gray-900 border-4 border-gray-700">
              <p className="text-xl text-white leading-relaxed">{answer}</p>
              <button
                onClick={() => speak(answer)}
                className="mt-3 flex items-center gap-2 text-lg font-bold text-yellow-300 underline focus:outline-none focus:ring-4 focus:ring-yellow-300 rounded"
              >
                <Volume2 className="w-5 h-5" /> Read this answer again
              </button>
            </div>
          )}
        </section>

        <section aria-labelledby="commands-heading">
          <h2 id="commands-heading" className="text-2xl font-bold text-yellow-300 mb-2">
            Voice commands
          </h2>
          <ul className="text-lg text-gray-300 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
            {commands.map((c) => (
              <li key={c.description}>
                <strong className="text-white">&ldquo;{c.phrases[0].trim()}&rdquo;</strong> — {c.description}
              </li>
            ))}
          </ul>
        </section>

        <button
          onClick={() => { stopSpeaking(); logout(); navigate("/"); }}
          className="flex items-center gap-3 p-4 rounded-2xl bg-gray-900 border-4 border-gray-700 text-xl font-bold text-white hover:border-red-400 focus:outline-none focus:border-red-400"
        >
          <LogOut className="w-6 h-6" /> Log out
        </button>
      </main>
    </div>
  );
};

export default BlindDashboardPage;
