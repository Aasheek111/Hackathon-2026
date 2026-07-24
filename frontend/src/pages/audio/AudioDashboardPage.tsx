import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  BookOpen,
  ClipboardList,
  TrendingUp,
  Settings as SettingsIcon,
  Hand,
  Sparkles,
  Loader2,
  Volume2,
  Zap,
  Award,
  Flame,
  Gamepad2,
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
 * CONTENT PARITY IS THE POINT
 * ---------------------------
 * An earlier version of this page was a five-item menu. Everyone else's
 * dashboard showed XP, streak, badges, a learning profile and assessment
 * history - so a blind learner was quietly given LESS of their own data than
 * a sighted classmate. On a platform about inclusive education that is the
 * exact failure mode to avoid: accessible must not mean abridged.
 *
 * So this now renders the same information as DashboardPage, from the same
 * three endpoints. What differs is presentation, not content:
 *   - high contrast and large targets (which serve LOW VISION - a different
 *     group from blind learners, who are served by the audio layer)
 *   - a numbered menu, because saying "one" is far more reliable than saying
 *     "open lessons", and the same number works as a keypress with no mic
 *   - the engagement chart becomes a spoken/written comparison, since a
 *     line chart carries nothing to a screen reader
 *   - every figure is in the page description, so "read screen" reads the
 *     real numbers rather than a summary of them
 */

interface Attempt {
  id: string;
  textEngagement: number;
  audioEngagement: number;
  visualEngagement: number;
  preferredMode: string;
  scorePercent: number;
  completedAt: string;
}
interface ProgressSummary {
  xp: number;
  streakDays: number;
  badges: Array<{ name: string }>;
}
interface Enrolment {
  classroom: { id: string; name: string };
}

const OPTIONS = [
  { key: "1", label: "Lessons", detail: "Your classroom units, with every lesson read aloud.", path: "/classroom", icon: BookOpen },
  { key: "2", label: "Quiz", detail: "A voice quiz. Questions and options are read aloud.", path: "/dashboard/audio/quiz", icon: ClipboardList },
  { key: "3", label: "My progress", detail: "Your full report card, subject by subject.", path: "/progress", icon: TrendingUp },
  { key: "4", label: "Sign practice", detail: "Learn the sign language alphabet.", path: "/practice/signs", icon: Hand },
  { key: "5", label: "Settings", detail: "Change your profile, text size and narration.", path: "/settings", icon: SettingsIcon },
  { key: "6", label: "AR game", detail: "The 3D balloon game, using this unit's own questions.", path: "/ar-game", icon: Gamepad2 },
] as const;

export const AudioDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    announce,
    enabled: audioNavOn,
    dismissed: audioDismissed,
    setEnabled,
    listening,
    registerNumberedTargets,
  } = useAudioNavigation();

  const [history, setHistory] = useState<Attempt[]>([]);
  const [progress, setProgress] = useState<ProgressSummary | null>(null);
  const [enrolment, setEnrolment] = useState<Enrolment | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [asking, setAsking] = useState(false);

  // The same three endpoints DashboardPage uses - same data, same freshness.
  useEffect(() => {
    Promise.all([
      api.get("/assessments/history"),
      api.get("/progress"),
      api.get("/classrooms/mine/enrolment"),
    ])
      .then(([hist, prog, enr]) => {
        setHistory(hist.data.attempts || []);
        setProgress(prog.data);
        setEnrolment(enr.data.enrolment);
      })
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
  }, []);

  const latest = history[0];

  const stats = useMemo(
    () => [
      { label: "Experience points", short: "XP", value: progress?.xp ?? 0, icon: Zap },
      { label: "Assessments taken", short: "Assessments", value: history.length, icon: BookOpen },
      { label: "Day streak", short: "Streak", value: progress?.streakDays ?? 0, icon: Flame },
      { label: "Badges earned", short: "Badges", value: progress?.badges?.length ?? 0, icon: Award },
    ],
    [progress, history.length],
  );

  const modes = useMemo(
    () =>
      latest
        ? [
            { key: "VISUAL", label: "Visual", score: Math.round(latest.visualEngagement) },
            { key: "AUDIO", label: "Audio", score: Math.round(latest.audioEngagement) },
            { key: "TEXT", label: "Text", score: Math.round(latest.textEngagement) },
          ]
        : [],
    [latest],
  );

  const menuScript = useMemo(
    () =>
      `There are ${OPTIONS.length} choices. ` +
      OPTIONS.map((o) => `${o.key}, ${o.label}. ${o.detail}`).join(" ") +
      " Say the number, or press that number key.",
    [],
  );

  // Everything a sighted learner can see, in words - not a shortened version.
  usePageAudio("Audio dashboard", () => {
    const name = user?.name ? `, ${user.name.split(" ")[0]}` : "";
    const parts = [`Welcome back${name}.`];

    if (loadError) parts.push("Your latest data could not be loaded. Check your connection and reload.");
    parts.push(enrolment ? `You are in the classroom ${enrolment.classroom.name}.` : "You have not joined a classroom yet.");
    parts.push(
      `You have ${progress?.xp ?? 0} experience points, a ${progress?.streakDays ?? 0} day streak, ` +
        `${progress?.badges?.length ?? 0} badges, and you have taken ${history.length} assessments.`,
    );

    if (latest) {
      parts.push(
        `Your learning profile: ` +
          modes.map((m) => `${m.label} ${m.score} percent`).join(", ") +
          `. You engage best in ${latest.preferredMode} mode.`,
      );
      parts.push(`Your most recent assessment scored ${Math.round(latest.scorePercent)} percent.`);
    } else {
      parts.push("You have not taken the adaptive assessment yet, so you have no learning profile.");
    }

    parts.push(menuScript);
    return parts.join(" ");
  });

  // This page curates its own menu rather than letting the provider
  // auto-detect one, so the numbers match the six options below exactly.
  // The provider owns the key/voice handling for them - see
  // registerNumberedTargets - so there is only one place numbers are wired.
  useEffect(() => {
    registerNumberedTargets(
      OPTIONS.map((o) => ({
        label: o.label,
        run: () => navigate(o.path),
      })),
    );
    return () => registerNumberedTargets(null);
  }, [registerNumberedTargets, navigate]);

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
      // Word forms only - the provider already registers the digits for the
      // numbered targets above, and registering them twice would double-fire.
      ...OPTIONS.map((o) => ({
        phrases: [o.label.toLowerCase()],
        description: `${o.key} — ${o.label}`,
        run: () => {
          announce(`Opening ${o.label}`);
          navigate(o.path);
        },
      })),
      { phrases: ["menu", "options", "what are my choices", "read menu"], description: "Read the menu again", run: () => announce(menuScript) },
      {
        phrases: ["my stats", "my scores", "how am i doing"],
        description: "Read your stats",
        run: () =>
          announce(
            `You have ${progress?.xp ?? 0} experience points, a ${progress?.streakDays ?? 0} day streak, ` +
              `${progress?.badges?.length ?? 0} badges, and ${history.length} assessments taken.` +
              (latest ? ` You engage best in ${latest.preferredMode} mode.` : ""),
          ),
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
    [navigate, announce, menuScript, progress, history.length, latest],
  );
  usePageVoiceCommands(pageCommands);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-yellow-300" aria-hidden="true" />
        <span className="sr-only">Loading your dashboard</span>
      </div>
    );
  }

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
          Welcome back, {user?.name?.split(" ")[0] || "Learner"}. Press a number key, or say the
          number. Tab reaches the audio controls.
        </p>
        <p className="text-base text-gray-300 mt-1">
          {enrolment ? (
            <>In <strong className="text-yellow-200">{enrolment.classroom.name}</strong></>
          ) : (
            <Link to="/recommendation" className="text-yellow-300 underline font-bold">
              You have not joined a classroom yet — find one
            </Link>
          )}
        </p>
      </header>

      <main id="main" className="max-w-4xl mx-auto px-5 py-6 space-y-8">
        {loadError && (
          <p role="alert" className="text-lg text-red-100 bg-red-950/60 border-2 border-red-700 rounded-xl p-4">
            Couldn&apos;t load your latest data — check your connection and reload the page.
          </p>
        )}

        {!audioNavOn && !audioDismissed && (
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

        {/* Same four figures as everyone else's dashboard. */}
        <section aria-labelledby="stats-heading">
          <h2 id="stats-heading" className="text-2xl font-bold text-yellow-300 mb-3">
            Your progress so far
          </h2>
          <ul className="grid grid-cols-2 sm:grid-cols-4 gap-3 list-none p-0">
            {stats.map((stat) => {
              const Icon = stat.icon;
              return (
                <li
                  key={stat.label}
                  className="p-5 rounded-2xl bg-gray-900 border-4 border-gray-700 text-center"
                >
                  <Icon className="w-7 h-7 text-yellow-300 mx-auto mb-2" aria-hidden="true" />
                  <div className="text-3xl font-bold text-white">{stat.value}</div>
                  <div className="text-base text-gray-300 mt-0.5">{stat.short}</div>
                </li>
              );
            })}
          </ul>
        </section>

        {/* The learning profile, as numbers and text rather than a chart -
            a line chart conveys nothing through a screen reader. */}
        <section aria-labelledby="profile-heading">
          <h2 id="profile-heading" className="text-2xl font-bold text-yellow-300 mb-3">
            Your learning profile
          </h2>
          {latest ? (
            <>
              <ul className="space-y-3 list-none p-0">
                {modes.map((m) => {
                  const preferred = latest.preferredMode === m.key;
                  return (
                    <li
                      key={m.key}
                      className={`p-4 rounded-2xl border-4 ${
                        preferred ? "border-yellow-400 bg-yellow-950/40" : "border-gray-700 bg-gray-900"
                      }`}
                    >
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="text-xl font-bold text-white">
                          {m.label}
                          {preferred && (
                            <span className="ml-2 text-sm font-bold text-yellow-300">
                              — you engage best here
                            </span>
                          )}
                        </span>
                        <span className="text-2xl font-bold text-yellow-300">{m.score}%</span>
                      </div>
                      {/* Decorative: the number above is the real content. */}
                      <div className="h-3 w-full bg-black/60 rounded-full overflow-hidden mt-2" aria-hidden="true">
                        <div className="h-full bg-yellow-400 rounded-full" style={{ width: `${m.score}%` }} />
                      </div>
                    </li>
                  );
                })}
              </ul>
              <p className="text-lg text-gray-200 mt-3">
                Most recent assessment: <strong className="text-yellow-200">{Math.round(latest.scorePercent)}%</strong>
              </p>
            </>
          ) : (
            <div className="p-5 rounded-2xl bg-gray-900 border-4 border-gray-700">
              <p className="text-lg text-gray-200 mb-3">
                You haven&apos;t taken the adaptive assessment yet, so there&apos;s no profile to show.
              </p>
              <button
                onClick={() => navigate("/dashboard/audio/quiz")}
                className="px-5 py-3 rounded-xl bg-yellow-400 text-black text-lg font-bold hover:bg-yellow-300 focus:outline-none focus:ring-4 focus:ring-white"
              >
                Take the voice quiz
              </button>
            </div>
          )}
        </section>

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
                    className="w-full h-full text-left p-5 rounded-2xl bg-gray-900 border-4 border-gray-700 hover:border-yellow-300 focus:outline-none focus:border-yellow-300"
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

        {/* Same "Recent Assessments" list as the standard dashboard. */}
        <section aria-labelledby="recent-heading">
          <h2 id="recent-heading" className="text-2xl font-bold text-yellow-300 mb-3">
            Recent assessments
          </h2>
          {history.length > 0 ? (
            <ul className="space-y-2 list-none p-0">
              {history.slice(0, 5).map((a) => (
                <li
                  key={a.id}
                  className="flex items-center justify-between gap-4 p-4 rounded-2xl bg-gray-900 border-2 border-gray-700"
                >
                  <span className="text-lg text-gray-200">
                    {new Date(a.completedAt).toLocaleDateString()} · {a.preferredMode} mode
                  </span>
                  <span className="text-xl font-bold text-yellow-300">
                    {Math.round(a.scorePercent)}%
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-lg text-gray-300">No sessions completed yet.</p>
          )}
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
          <div aria-live="polite" aria-atomic="true">
            {answer && (
              <div className="p-5 rounded-2xl bg-gray-900 border-4 border-gray-700">
                <p className="text-xl text-white leading-relaxed">{answer}</p>
              </div>
            )}
          </div>
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
            <li><strong className="text-white">&ldquo;my stats&rdquo;</strong> — read your progress</li>
            <li><strong className="text-white">&ldquo;read screen&rdquo;</strong> — read this page</li>
            <li><strong className="text-white">&ldquo;menu&rdquo;</strong> — repeat the choices</li>
            <li><strong className="text-white">&ldquo;help&rdquo;</strong> — list every command</li>
          </ul>
        </section>
      </main>
    </div>
  );
};

export default AudioDashboardPage;
