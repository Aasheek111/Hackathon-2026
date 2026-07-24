import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BookOpen,
  ClipboardList,
  TrendingUp,
  Settings as SettingsIcon,
  Hand,
  Sparkles,
  Loader2,
  Volume2,
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import {
  usePageAudio,
  usePageVoiceCommands,
  useAudioNavigation,
} from "../../contexts/AudioNavigationContext";
import { VoiceCommand } from "../../hooks/useVoiceCommands";
import api from "../../lib/api";

/**
 * Audio-first dashboard.
 *
 * The first version of this page was a wall of large yellow buttons, which is
 * a LOW VISION design - genuinely useful if you have some sight, useless if
 * you have none: you cannot press "Read screen" if you cannot find it. That
 * was the core mistake.
 *
 * What actually makes this usable without sight now lives app-wide (see
 * AudioNavigationContext + AudioControlBar): every route announces itself, the
 * microphone is already on for a blind learner, and one Tab press from
 * anywhere reaches "Read this screen".
 *
 * What this page adds on top:
 *   - a NUMBERED menu. Saying "one" is far more reliable than saying "open
 *     lessons" - shorter utterances survive noisy rooms and accents better -
 *     and pressing the 1 key works with no microphone at all.
 *   - the same options as visible, high-contrast, large-target controls,
 *     because low-vision learners land here too and they are not the same
 *     people as blind learners.
 */

interface ProgressSummary {
  xp: number;
  streakDays: number;
  badges: Array<{ name: string }>;
}

const OPTIONS = [
  { key: "1", label: "Lessons", detail: "Your classroom units, with every lesson read aloud.", path: "/classroom", icon: BookOpen },
  { key: "2", label: "Quiz", detail: "A voice quiz. Questions and options are read aloud.", path: "/dashboard/audio/quiz", icon: ClipboardList },
  { key: "3", label: "My progress", detail: "Your scores, streak and badges.", path: "/progress", icon: TrendingUp },
  { key: "4", label: "Sign practice", detail: "Learn the sign language alphabet.", path: "/practice/signs", icon: Hand },
  { key: "5", label: "Settings", detail: "Change your profile, text size and narration.", path: "/settings", icon: SettingsIcon },
] as const;

const SPOKEN_NUMBERS: Record<string, string[]> = {
  "1": ["one", "number one", "first"],
  "2": ["two", "number two", "second"],
  "3": ["three", "number three", "third"],
  "4": ["four", "number four", "fourth"],
  "5": ["five", "number five", "fifth"],
};

export const AudioDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { announce, enabled: audioNavOn, setEnabled, listening } = useAudioNavigation();

  const [progress, setProgress] = useState<ProgressSummary | null>(null);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [asking, setAsking] = useState(false);

  useEffect(() => {
    api
      .get("/progress")
      .then(({ data }) => setProgress(data))
      .catch(() => setProgress(null));
  }, []);

  const menuScript = useMemo(
    () =>
      `There are ${OPTIONS.length} choices. ` +
      OPTIONS.map((o) => `${o.key}, ${o.label}. ${o.detail}`).join(" ") +
      " Say the number, or press that number key.",
    [],
  );

  usePageAudio("Audio dashboard", () => {
    const name = user?.name ? `, ${user.name}` : "";
    const stats = progress
      ? `You have ${progress.xp} experience points, a ${progress.streakDays} day streak, and ${progress.badges?.length ?? 0} badges.`
      : "";
    return `Welcome back${name}. ${stats} ${menuScript}`;
  });

  // Number keys work with no microphone at all - the reliable path.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      const target = e.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
      const option = OPTIONS.find((o) => o.key === e.key);
      if (option) {
        e.preventDefault();
        announce(`Opening ${option.label}`);
        navigate(option.path);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [navigate, announce]);

  const askAssistant = async (raw: string) => {
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
  };

  const pageCommands: VoiceCommand[] = useMemo(
    () => [
      ...OPTIONS.map((o) => ({
        phrases: [...SPOKEN_NUMBERS[o.key], o.label.toLowerCase()],
        description: `${o.key} — ${o.label}`,
        run: () => {
          announce(`Opening ${o.label}`);
          navigate(o.path);
        },
      })),
      {
        phrases: ["menu", "options", "what are my choices", "read menu"],
        description: "Read the menu again",
        run: () => announce(menuScript),
      },
      {
        phrases: ["ask ", "explain ", "what is ", "tell me about "],
        description: 'Ask the assistant, e.g. "explain fractions"',
        run: (transcript: string) => {
          const cleaned = transcript.replace(/^(ask|explain|tell me about)\s+/i, "").trim();
          askAssistant(cleaned || transcript);
        },
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [navigate, announce, menuScript],
  );
  usePageVoiceCommands(pageCommands);

  return (
    <div className="min-h-screen bg-black text-white font-sans pb-32">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:bg-yellow-300 focus:text-black focus:px-4 focus:py-2 focus:rounded-lg focus:font-bold"
      >
        Skip to main content
      </a>

      <header className="border-b-2 border-yellow-400/40 px-5 py-4">
        <h1 className="text-3xl font-bold text-yellow-300">Audio Dashboard</h1>
        <p className="text-lg text-gray-200 mt-1">
          {user?.name ? `Welcome back, ${user.name}.` : "Welcome back."}{" "}
          Press a number key, or say the number. Tab reaches the audio controls.
        </p>
      </header>

      <main id="main" className="max-w-4xl mx-auto px-5 py-6 space-y-6">
        {!audioNavOn && (
          <div className="rounded-2xl border-2 border-yellow-500 bg-yellow-950/50 p-5">
            <p className="text-lg text-yellow-100 font-bold mb-3">
              Audio navigation is off, so nothing will be read aloud.
            </p>
            <button
              onClick={() => setEnabled(true)}
              className="flex items-center gap-2 px-5 py-3 rounded-xl bg-yellow-400 text-black text-lg font-bold hover:bg-yellow-300 focus:outline-none focus:ring-4 focus:ring-white"
            >
              <Volume2 className="w-5 h-5" aria-hidden="true" /> Turn on audio navigation
            </button>
          </div>
        )}

        <section aria-labelledby="menu-heading">
          <h2 id="menu-heading" className="text-2xl font-bold text-yellow-300 mb-3">
            What would you like to do?
          </h2>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 list-none p-0">
            {OPTIONS.map((option) => {
              const Icon = option.icon;
              return (
                <li key={option.key}>
                  <button
                    onClick={() => {
                      announce(`Opening ${option.label}`);
                      navigate(option.path);
                    }}
                    className="w-full text-left p-5 rounded-2xl bg-gray-900 border-4 border-gray-700 hover:border-yellow-300 focus:outline-none focus:border-yellow-300"
                  >
                    <span className="flex items-center gap-3 text-2xl font-bold text-yellow-300">
                      <span
                        aria-hidden="true"
                        className="w-9 h-9 shrink-0 rounded-lg bg-yellow-400 text-black flex items-center justify-center text-xl"
                      >
                        {option.key}
                      </span>
                      <Icon className="w-6 h-6 shrink-0" aria-hidden="true" />
                      {option.label}
                    </span>
                    <span className="block text-lg text-gray-200 mt-1">{option.detail}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>

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
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Explain fractions to me"
              className="flex-1 text-xl p-4 rounded-2xl bg-gray-900 text-white border-4 border-gray-700 placeholder:text-gray-400 focus:outline-none focus:border-yellow-300"
            />
            <button
              type="submit"
              disabled={asking || !question.trim()}
              className="flex items-center justify-center gap-2 px-6 py-4 rounded-2xl bg-yellow-400 text-black text-xl font-bold hover:bg-yellow-300 focus:outline-none focus:ring-4 focus:ring-white disabled:opacity-60"
            >
              {asking ? <Loader2 className="w-6 h-6 animate-spin" aria-hidden="true" /> : <Sparkles className="w-6 h-6" aria-hidden="true" />}
              Ask
            </button>
          </form>
          {answer && (
            <div className="p-5 rounded-2xl bg-gray-900 border-4 border-gray-700">
              <p className="text-xl text-white leading-relaxed">{answer}</p>
            </div>
          )}
        </section>

        <section aria-labelledby="say-heading">
          <h2 id="say-heading" className="text-2xl font-bold text-yellow-300 mb-2">
            What you can say{listening ? " (listening now)" : ""}
          </h2>
          <ul className="text-lg text-gray-200 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
            {OPTIONS.map((o) => (
              <li key={o.key}>
                <strong className="text-white">&ldquo;{o.key}&rdquo;</strong> — {o.label}
              </li>
            ))}
            <li><strong className="text-white">&ldquo;read screen&rdquo;</strong> — read this page</li>
            <li><strong className="text-white">&ldquo;menu&rdquo;</strong> — repeat the choices</li>
            <li><strong className="text-white">&ldquo;help&rdquo;</strong> — list every command</li>
            <li><strong className="text-white">&ldquo;log out&rdquo;</strong> — sign out</li>
          </ul>
        </section>
      </main>
    </div>
  );
};

export default AudioDashboardPage;
