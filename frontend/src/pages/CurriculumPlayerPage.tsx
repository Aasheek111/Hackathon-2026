import React, { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Volume2,
  Loader2,
  AlertCircle,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Trophy,
  Check,
  X,
  BookOpen,
  Image as ImageIcon,
  Gamepad2,
  Wand2,
  Eye,
  EyeOff,
  Hand,
  Mic,
  MicOff,
} from "lucide-react";
import Button from "../components/ui/Button";
import StorybookView from "../components/StorybookView";
import ThemeToggle from "../components/ThemeToggle";
import AslFingerspellingStrip from "../components/AslFingerspellingStrip";
import api, { resolveMediaUrl } from "../lib/api";
import {
  useConcentrationTracking,
  hasCameraConsent,
} from "../hooks/useConcentrationTracking";
import { useAccessibility } from "../contexts/AccessibilityContext";
import { useSpeech } from "../hooks/useSpeech";
import { useVoiceCommands, VoiceCommand } from "../hooks/useVoiceCommands";
import { pickKeyWord } from "../data/aslAlphabet";

/** A small floating "Listen" button that appears over a text selection. */
const SelectionListenButton: React.FC<{
  containerRef: React.RefObject<HTMLElement | null>;
  onListen: (text: string) => void;
}> = ({ containerRef, onListen }) => {
  const [selection, setSelection] = useState<{
    text: string;
    x: number;
    y: number;
  } | null>(null);

  useEffect(() => {
    const handleSelectionChange = () => {
      const sel = window.getSelection();
      const text = sel?.toString().trim();
      if (!text || !sel || sel.rangeCount === 0) {
        setSelection(null);
        return;
      }
      const range = sel.getRangeAt(0);
      if (!containerRef.current?.contains(range.commonAncestorContainer)) {
        setSelection(null);
        return;
      }
      const rect = range.getBoundingClientRect();
      setSelection({
        text,
        x: rect.left + rect.width / 2,
        y: rect.top + window.scrollY,
      });
    };
    document.addEventListener("selectionchange", handleSelectionChange);
    return () =>
      document.removeEventListener("selectionchange", handleSelectionChange);
  }, [containerRef]);

  if (!selection) return null;

  return (
    <button
      style={{
        position: "absolute",
        left: selection.x,
        top: selection.y - 44,
        transform: "translateX(-50%)",
      }}
      onClick={() => {
        onListen(selection.text);
        setSelection(null);
        window.getSelection()?.removeAllRanges();
      }}
      className="z-50 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary text-white text-xs shadow-lg hover:opacity-90"
    >
      <Volume2 className="w-3.5 h-3.5" /> Listen
    </button>
  );
};

const RAG_SERVICE_URL =
  import.meta.env.VITE_RAG_SERVICE_URL || "http://localhost:8100";

interface KnowledgeCheck {
  id: string;
  question: string;
  options: string[];
  correct: string;
}
interface Lesson {
  id: string;
  order: number;
  title: string;
  explanation: string;
  example: string | null;
  imageUrl: string | null;
  audioUrl: string | null;
  knowledgeCheck: KnowledgeCheck | null;
}
interface FinalAssessmentQuestion {
  id: string;
  order: number;
  question: string;
  options: string[];
  correct: string;
}
interface Curriculum {
  id: string;
  title: string;
  lessons: Lesson[];
  finalAssessmentQuestions: FinalAssessmentQuestion[];
}
interface Progress {
  id: string;
  currentLessonOrder: number;
  completed: boolean;
}
type LearningMode = "TEXT" | "AUDIO" | "VISUAL" | "AR" | "STORY" | "SIGN";

interface Personalization {
  preferredMode: LearningMode;
  attentionSpanScore: number;
}

type View = "lesson" | "final-assessment" | "complete";

const MODES: {
  key: LearningMode;
  label: string;
  icon: React.FC<{ className?: string }>;
}[] = [
  { key: "TEXT", label: "Text", icon: BookOpen },
  { key: "AUDIO", label: "Audio", icon: Volume2 },
  { key: "VISUAL", label: "Visual", icon: ImageIcon },
  { key: "AR", label: "AR Game", icon: Gamepad2 },
  { key: "STORY", label: "Storybook", icon: Wand2 },
  { key: "SIGN", label: "Sign", icon: Hand },
];

/**
 * AR presentation of a unit: the balloon game (public/ar-game.html) embedded
 * in an iframe and seeded with THIS unit's own MCQs (knowledge-checks + final
 * assessment) via postMessage - no extra AI generation, the questions already
 * exist. A ready/questions handshake avoids racing the iframe's scene setup;
 * an 'ar-complete' message reports the score back so AR counts as real work.
 */
const ArLessonGame: React.FC<{
  unitId: string;
  onComplete: (score: number, total: number) => void;
}> = ({ unitId, onComplete }) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [questions, setQuestions] = useState<Array<{
    q: string;
    options: string[];
    answer: string;
  }> | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    api
      .get(`/units/${unitId}/ar-game`)
      .then(({ data }) => {
        if (!cancelled) setQuestions(data.questions || []);
      })
      .catch((err) => {
        if (!cancelled)
          setError(err.response?.data?.error || "Could not load the AR game");
      });
    return () => {
      cancelled = true;
    };
  }, [unitId]);

  const postQuestions = useCallback(() => {
    if (questions && questions.length > 0) {
      iframeRef.current?.contentWindow?.postMessage(
        { type: "ar-questions", questions },
        "*",
      );
    }
  }, [questions]);

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      const data = event.data;
      if (!data || typeof data !== "object") return;
      if (data.type === "ar-ready") postQuestions();
      if (data.type === "ar-complete") onComplete(data.score, data.total);
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [postQuestions, onComplete]);

  // Also push as soon as questions arrive, in case the iframe signalled ready
  // before the fetch resolved (either ordering works).
  useEffect(() => {
    postQuestions();
  }, [postQuestions]);

  if (error) {
    return (
      <div className="bg-white border border-slate-200/80 shadow-xs dark:bg-white/[0.09] dark:backdrop-blur-2xl dark:border-white/[0.14] dark:shadow-none p-8 rounded-3xl text-center text-slate-600 dark:text-gray-300">
        <AlertCircle className="w-8 h-8 text-amber-500 dark:text-amber-400 mx-auto mb-3" />
        {error}
      </div>
    );
  }
  if (questions && questions.length === 0) {
    return (
      <div className="bg-white border border-slate-200/80 shadow-xs dark:bg-white/[0.09] dark:backdrop-blur-2xl dark:border-white/[0.14] dark:shadow-none p-8 rounded-3xl text-center text-slate-600 dark:text-gray-300">
        <Gamepad2 className="w-8 h-8 text-primary mx-auto mb-3" />
        This unit doesn&apos;t have any 4-option questions for the balloon game
        yet. Try another mode, or ask your teacher to regenerate the lesson
        plan.
      </div>
    );
  }
  return (
    <iframe
      ref={iframeRef}
      src="/ar-game.html"
      title="AR balloon game"
      onLoad={postQuestions}
      allow="camera; microphone; accelerometer; gyroscope; magnetometer"
      className="w-full h-[75vh] rounded-3xl border border-slate-200 dark:border-white/10 bg-black"
    />
  );
};

/** One lesson's inline check-for-understanding question. Resets whenever the lesson changes. */
const KnowledgeCheckCard: React.FC<{ unitId: string; lesson: Lesson }> = ({
  unitId,
  lesson,
}) => {
  const [selected, setSelected] = useState<string | null>(null);
  const [result, setResult] = useState<{
    correct: boolean;
    correctAnswer: string;
  } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setSelected(null);
    setResult(null);
  }, [lesson.id]);

  if (!lesson.knowledgeCheck) return null;
  const check = lesson.knowledgeCheck;

  const submit = async () => {
    if (!selected) return;
    setSubmitting(true);
    try {
      const { data } = await api.post(
        `/units/${unitId}/curriculum/lessons/${lesson.id}/knowledge-check`,
        {
          answer: selected,
        },
      );
      setResult(data);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200/70 dark:bg-white/5 dark:backdrop-blur-xl dark:border-white/[0.08] p-6 rounded-2xl mb-6">
      <p className="text-xs text-slate-500 dark:text-gray-400 uppercase tracking-wide mb-3">
        Quick check
      </p>
      <p className="font-medium mb-4 text-slate-800 dark:text-white">
        {check.question}
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
        {check.options.map((opt) => {
          const chosen = selected === opt;
          let cls =
            "border-slate-200 hover:border-slate-400 text-slate-700 dark:border-white/10 dark:hover:border-white/30 dark:text-gray-200";
          if (result) {
            if (opt === result.correctAnswer)
              cls =
                "border-green-500 bg-green-500/10 text-green-700 dark:text-green-300";
            else if (chosen)
              cls =
                "border-red-500 bg-red-500/10 text-red-700 dark:text-red-300";
          } else if (chosen) {
            cls = "border-primary bg-primary/10 text-slate-800 dark:text-white";
          }
          return (
            <button
              key={opt}
              disabled={!!result}
              onClick={() => setSelected(opt)}
              className={`text-left px-4 py-3 rounded-xl border text-sm transition-all ${cls}`}
            >
              {opt}
            </button>
          );
        })}
      </div>
      {result ? (
        <div
          role="status"
          aria-live="polite"
          className={`flex items-center gap-2 text-sm ${result.correct ? "text-green-600 dark:text-green-400" : "text-amber-600 dark:text-amber-400"}`}
        >
          {result.correct ? (
            <Check className="w-4 h-4" />
          ) : (
            <X className="w-4 h-4" />
          )}
          {result.correct
            ? "Correct!"
            : `Not quite - the answer was "${result.correctAnswer}"`}
        </div>
      ) : (
        <Button
          size="sm"
          onClick={submit}
          disabled={!selected}
          loading={submitting}
        >
          Check answer
        </Button>
      )}
    </div>
  );
};

const FinalAssessmentView: React.FC<{
  unitId: string;
  questions: FinalAssessmentQuestion[];
  onSubmitted: (
    score: { scoreCorrect: number; scoreTotal: number },
    newBadges: Array<{ name: string }>,
  ) => void;
}> = ({ unitId, questions, onSubmitted }) => {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    setSubmitting(true);
    try {
      const payload = questions.map((q) => ({
        questionId: q.id,
        answer: answers[q.id] || "",
      }));
      const { data } = await api.post(
        `/units/${unitId}/curriculum/final-assessment`,
        { answers: payload },
      );
      onSubmitted(
        {
          scoreCorrect: data.attempt.scoreCorrect,
          scoreTotal: data.attempt.scoreTotal,
        },
        data.newBadges || [],
      );
    } finally {
      setSubmitting(false);
    }
  };

  const allAnswered = questions.every((q) => answers[q.id]);

  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-6 pt-8 pb-20">
      <div className="bg-white border border-slate-200/80 shadow-xs dark:bg-white/[0.09] dark:backdrop-blur-2xl dark:border-white/[0.14] dark:shadow-none p-6 sm:p-8 rounded-3xl">
        <div className="flex items-center gap-2 mb-6">
          {/* This view has no other heading (its own header above is just a
              "Back to lessons" link) and, like the "complete" view below,
              is effectively its own full-page state - so h1, not h2. */}
          <h1 className="text-xl font-bold text-slate-800 dark:text-white">
            Final assessment
          </h1>
        </div>
        <div className="space-y-6">
          {questions.map((q, qi) => (
            <div key={q.id}>
              <p className="font-medium mb-3 text-slate-800 dark:text-white">
                {qi + 1}. {q.question}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {q.options.map((opt) => (
                  <button
                    key={opt}
                    onClick={() => setAnswers({ ...answers, [q.id]: opt })}
                    className={`text-left px-4 py-3 rounded-xl border text-sm transition-all text-slate-700 dark:text-gray-200 ${
                      answers[q.id] === opt
                        ? "border-primary bg-primary/10"
                        : "border-slate-200 hover:border-slate-400 dark:border-white/10 dark:hover:border-white/30"
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
        <Button
          className="mt-6"
          onClick={submit}
          disabled={!allAnswered}
          loading={submitting}
        >
          Submit assessment
        </Button>
      </div>
    </main>
  );
};

/**
 * The full-curriculum player (TODO.md Phases 5/7-10) - a unit only reaches
 * this page once a TutorialCurriculum exists for it (see TutorialRouter).
 * Unlike the legacy TutorialPage, the whole curriculum is fetched once and
 * navigated client-side: no regeneration, no re-fetch, on Next/Previous.
 */
export const CurriculumPlayerPage: React.FC = () => {
  const { unitId } = useParams<{ unitId: string }>();
  const navigate = useNavigate();
  const { speak, stop: stopSpeaking, loading: ttsLoading } = useSpeech();
  const { prefs } = useAccessibility();
  const lessonContentRef = useRef<HTMLDivElement>(null);

  const [curriculum, setCurriculum] = useState<Curriculum | null>(null);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [lessonIndex, setLessonIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [view, setView] = useState<View>("lesson");
  const [finalScore, setFinalScore] = useState<{
    scoreCorrect: number;
    scoreTotal: number;
  } | null>(null);
  const [newBadges, setNewBadges] = useState<Array<{ name: string }>>([]);
  const [personalization, setPersonalization] =
    useState<Personalization | null>(null);
  const [isPreview, setIsPreview] = useState(false);
  // Presentation mode over the ONE shared curriculum. Switching it never
  // refetches or regenerates - same lessons, different layout - and progress
  // is kept whichever mode is active (the "switch freely, never lose place"
  // requirement). Seeded from the student's last-used mode, then their
  // assessment's preferred mode, then TEXT.
  const [mode, setMode] = useState<LearningMode>("TEXT");
  // Concentration tracking: on by default once the student has given camera
  // consent (and never while a teacher is previewing). Feeds the teacher's
  // per-unit heatmap. The student can toggle it off any time.
  const [focusTracking, setFocusTracking] = useState(() => hasCameraConsent());
  const trackingOn = focusTracking && !isPreview && view === "lesson";
  const { active: trackingActive, score: focusScore } =
    useConcentrationTracking(unitId as string, lessonIndex, mode, trackingOn);

  useEffect(() => {
    let cancelled = false;
    api
      .get(`/units/${unitId}/curriculum`)
      .then(({ data }) => {
        if (cancelled) return;
        setCurriculum(data.curriculum);
        setProgress(data.progress);
        setPersonalization(data.personalization || null);
        setIsPreview(!!data.preview);
        setMode(
          data.progress?.preferredMode ||
            data.personalization?.preferredMode ||
            "TEXT",
        );
        const resumeIndex = Math.min(
          Math.max(data.progress?.currentLessonOrder ?? 0, 0),
          Math.max(data.curriculum.lessons.length - 1, 0),
        );
        setLessonIndex(resumeIndex);
        if (data.progress?.completed) setView("complete");
      })
      .catch((err) =>
        setError(err.response?.data?.error || "Could not load this curriculum"),
      )
      .finally(() => setLoading(false));
    return () => {
      cancelled = true;
      stopSpeaking();
    };
  }, [unitId]); // eslint-disable-line react-hooks/exhaustive-deps

  const saveProgress = useCallback(
    (nextIndex: number, completed?: boolean, nextMode?: LearningMode) => {
      if (isPreview) return; // a teacher previewing isn't "a student progressing"
      api
        .patch(`/units/${unitId}/curriculum/progress`, {
          currentLessonOrder: nextIndex,
          completed,
          ...(nextMode ? { preferredMode: nextMode } : {}),
        })
        .then(({ data }) => {
          if (data.newBadges?.length) setNewBadges(data.newBadges);
        })
        .catch(() => {
          /* progress is a convenience pointer - a failed save just means the
             student re-reads this lesson next visit, never blocks navigation */
        });
    },
    [unitId, isPreview],
  );

  const changeMode = (next: LearningMode) => {
    if (next === mode) return;
    stopSpeaking();
    setMode(next);
    saveProgress(lessonIndex, undefined, next); // remember the choice, keep place
  };

  const goTo = (index: number) => {
    if (!curriculum) return;
    const clamped = Math.min(Math.max(index, 0), curriculum.lessons.length - 1);
    stopSpeaking();
    setLessonIndex(clamped);
    saveProgress(clamped);
  };

  const finishCurriculum = () => {
    if (!curriculum) return;
    if (isPreview) {
      setView("complete");
    } else if (curriculum.finalAssessmentQuestions.length > 0) {
      setView("final-assessment");
    } else {
      saveProgress(lessonIndex, true);
      setView("complete");
    }
  };

  // Voice navigation - the same Web Speech API commands as the audio
  // dashboard, brought into the REAL curriculum player rather than living
  // only in a separate practice quiz. This is what actually makes a
  // teacher's uploaded lesson blind-navigable, not just the standalone demo.
  // An accelerator, never the only way to move: every action here already
  // has a working button, and this hook self-reports `supported: false` in
  // browsers without Web Speech.
  const voiceCommands: VoiceCommand[] = React.useMemo(() => {
    const currentLesson = () => curriculum?.lessons[lessonIndex];
    const readCurrent = () => {
      const l = currentLesson();
      if (l)
        speak(`${l.title}. ${l.explanation} ${l.example || ""}`, l.audioUrl);
    };
    return [
      {
        phrases: ["next lesson", "next"],
        description: "Next lesson",
        run: () => {
          if (view !== "lesson" || !curriculum) return;
          if (lessonIndex >= curriculum.lessons.length - 1) finishCurriculum();
          else goTo(lessonIndex + 1);
        },
      },
      {
        phrases: ["previous lesson", "go back", "previous"],
        description: "Previous lesson",
        run: () => {
          if (view === "lesson" && lessonIndex > 0) goTo(lessonIndex - 1);
        },
      },
      {
        phrases: ["read lesson", "read this", "read aloud"],
        description: "Read the lesson aloud",
        run: readCurrent,
      },
      { phrases: ["repeat"], description: "Repeat", run: readCurrent },
      {
        phrases: ["stop reading", "stop", "be quiet"],
        description: "Stop reading",
        run: () => stopSpeaking(),
      },
      {
        phrases: ["text mode", "switch to text"],
        description: "Switch to Text mode",
        run: () => changeMode("TEXT"),
      },
      {
        phrases: ["audio mode", "switch to audio"],
        description: "Switch to Audio mode",
        run: () => changeMode("AUDIO"),
      },
      {
        phrases: ["visual mode", "switch to visual"],
        description: "Switch to Visual mode",
        run: () => changeMode("VISUAL"),
      },
      {
        phrases: ["sign mode", "switch to sign"],
        description: "Switch to Sign mode",
        run: () => changeMode("SIGN"),
      },
      {
        phrases: ["exit lesson", "leave lesson", "go to classroom"],
        description: "Back to classroom",
        run: () => {
          stopSpeaking();
          navigate("/classroom");
        },
      },
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [curriculum, lessonIndex, view]);

  // enabled=false auto-stops recognition the moment the learner leaves the
  // lesson view (final assessment, completion screen) - the toggle button
  // below is the user-driven on/off switch; this is the external kill-switch
  // so commands like "next lesson" can't fire somewhere they'd be nonsense.
  const {
    listening: voiceListening,
    toggle: toggleVoice,
    supported: voiceSupported,
    error: voiceError,
  } = useVoiceCommands(voiceCommands, view === "lesson");

  // Auto-narrates each lesson as you land on it (the pre-generated clip when
  // available, else live TTS, else the browser voice) - same canonical
  // content, just read aloud. Always on in AUDIO mode; also on in any mode
  // when the student's "Always narrate lessons" accessibility pref is set
  // (blind/low-vision students shouldn't have to switch modes to get audio).
  // With "Audiobook mode" on too, finishing a clip auto-advances to the next
  // lesson - hands-free playback across the whole unit.
  // Hands-free continuous playback - only auto-plays when audiobookMode is explicitly enabled
  useEffect(() => {
    if (!curriculum || view !== "lesson") return;
    if (!prefs.audiobookMode) return;
    if (mode === "AR" || mode === "STORY") return;
    const activeLesson = curriculum.lessons[lessonIndex];
    if (!activeLesson) return;
    const isLastLesson = lessonIndex >= curriculum.lessons.length - 1;
    const onEnded = !isLastLesson ? () => goTo(lessonIndex + 1) : undefined;
    speak(
      `${activeLesson.title}. ${activeLesson.explanation} ${activeLesson.example || ""}`,
      activeLesson.audioUrl,
      onEnded,
    );
  }, [curriculum, lessonIndex, view, mode, prefs.audiobookMode]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF9F5] dark:bg-dark flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !curriculum || curriculum.lessons.length === 0) {
    return (
      <div className="min-h-screen bg-[#FAF9F5] dark:bg-dark flex items-center justify-center p-6">
        <div className="bg-white border border-slate-200/80 shadow-xs dark:bg-white/[0.09] dark:backdrop-blur-2xl dark:border-white/[0.14] dark:shadow-none max-w-md p-10 rounded-3xl text-center">
          <AlertCircle className="w-10 h-10 text-amber-500 dark:text-amber-400 mx-auto mb-4" />
          <h1 className="text-xl font-bold mb-2 text-slate-800 dark:text-white">
            Can&apos;t open this curriculum
          </h1>
          <p className="text-slate-500 dark:text-gray-400 mb-6">
            {error || "This curriculum has no lessons yet"}
          </p>
          <button
            onClick={() => navigate("/classroom")}
            className="px-6 py-3 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 dark:border-white/20 dark:text-white dark:hover:bg-white/5 dark:hover:border-white/40 transition-colors font-medium"
          >
            Back to classroom
          </button>
        </div>
      </div>
    );
  }

  if (view === "complete") {
    return (
      <div className="min-h-screen bg-[#FAF9F5] dark:bg-dark flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white border border-slate-200/80 shadow-xs dark:bg-white/[0.09] dark:backdrop-blur-2xl dark:border-white/[0.14] dark:shadow-none max-w-md w-full p-10 rounded-3xl text-center"
        >
          <Trophy className="w-12 h-12 text-accent mx-auto mb-4" />
          <h1 className="text-2xl font-display font-bold mb-2 text-slate-800 dark:text-white">
            {isPreview ? "End of preview" : "Coursework complete!"}
          </h1>
          <p className="text-slate-500 dark:text-gray-400 mb-2">
            {curriculum.title}
          </p>
          {isPreview && (
            <p className="text-sm text-slate-500 dark:text-gray-400 mb-4">
              This is what a student sees after finishing every lesson -
              knowledge checks and the final assessment aren't shown here since
              you're viewing as the teacher.
            </p>
          )}
          {finalScore && (
            <p className="text-lg font-bold mb-4 text-slate-800 dark:text-white">
              Score: {finalScore.scoreCorrect} / {finalScore.scoreTotal}
            </p>
          )}
          {newBadges.length > 0 && (
            <p className="text-sm text-accent mb-4">
              New badge: {newBadges.map((b) => b.name).join(", ")}
            </p>
          )}
          <div className="w-full h-2 bg-slate-100 dark:bg-dark-card rounded-full overflow-hidden mb-6">
            <div
              className="h-full bg-gradient-to-r from-primary to-accent"
              style={{ width: "100%" }}
            />
          </div>
          <Button
            onClick={() => navigate(isPreview ? "/teacher" : "/classroom")}
            className="w-full"
          >
            {isPreview ? "Back to dashboard" : "Back to classroom"}
          </Button>
        </motion.div>
      </div>
    );
  }

  if (view === "final-assessment") {
    return (
      <div className="min-h-screen bg-[#FAF9F5] dark:bg-dark">
        <header className="bg-white/90 backdrop-blur-md border-b border-slate-200 dark:bg-transparent dark:backdrop-blur-2xl dark:border-white/10 px-6 py-4 sticky top-0 z-30">
          <button
            onClick={() => setView("lesson")}
            className="flex items-center gap-2 text-slate-500 hover:text-slate-900 dark:text-gray-400 dark:hover:text-white"
          >
            <ArrowLeft className="w-5 h-5" /> Back to lessons
          </button>
        </header>
        <FinalAssessmentView
          unitId={unitId as string}
          questions={curriculum.finalAssessmentQuestions}
          onSubmitted={(score, badges) => {
            setFinalScore(score);
            setNewBadges(badges);
            setView("complete");
          }}
        />
      </div>
    );
  }

  const lesson = curriculum.lessons[lessonIndex];
  const onFirstLesson = lessonIndex === 0;
  const onLastLesson = lessonIndex >= curriculum.lessons.length - 1;
  const progressPercent = Math.round(
    ((lessonIndex + 1) / curriculum.lessons.length) * 100,
  );
  // Adaptive presentation (PLAN §23): a low attention-span score gets larger,
  // less dense text - same canonical lesson, not a different one.
  const isSimplified = (personalization?.attentionSpanScore ?? 100) < 50;
  // Accessibility prefs (Settings page). fontSize is applied globally (root
  // font-size, see AccessibilityContext) so Tailwind's rem-based text-lg/
  // text-xl below already scale correctly with no per-element override
  // needed here. highContrast and reducedMotion stay scoped to this card,
  // same "local literal classes, never touch shared CSS" convention as the
  // light/dark theme toggle - highContrast swaps the card's palette,
  // reducedMotion drops the page-turn slide animation.
  const hc = prefs.highContrast;
  const cardMotionProps = prefs.reducedMotion
    ? {
        initial: false as const,
        animate: { opacity: 1, x: 0 },
        exit: { opacity: 1, x: 0 },
        transition: { duration: 0 },
      }
    : {
        initial: { opacity: 0, x: 20 },
        animate: { opacity: 1, x: 0 },
        exit: { opacity: 0, x: -20 },
      };

  return (
    <div className="min-h-screen bg-[#FAF9F5] dark:bg-dark pb-20">
      <header className="bg-white/90 backdrop-blur-md border-b border-slate-200 dark:bg-transparent dark:backdrop-blur-2xl dark:border-white/10 px-6 py-4 sticky top-0 z-30">
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={() => navigate("/classroom")}
            className="flex items-center gap-2 text-slate-500 hover:text-slate-900 dark:text-gray-400 dark:hover:text-white"
          >
            <ArrowLeft className="w-5 h-5" /> Back
          </button>
          <div className="flex items-center gap-2">
            {!isPreview && (
              <button
                onClick={() => setFocusTracking((v) => !v)}
                title={
                  focusTracking
                    ? "Focus tracking is on - your camera helps your teacher see where lessons lose you"
                    : "Focus tracking is off"
                }
                className={`flex items-center gap-1.5 text-xs px-3 py-1 rounded-full border transition-colors ${
                  focusTracking
                    ? "bg-primary/15 text-primary border-primary/40"
                    : "bg-slate-100 text-slate-500 border-slate-200 hover:text-slate-700 dark:bg-dark-card dark:text-gray-500 dark:border-white/10 dark:hover:text-gray-300"
                }`}
              >
                {focusTracking ? (
                  <Eye className="w-3.5 h-3.5" />
                ) : (
                  <EyeOff className="w-3.5 h-3.5" />
                )}
                {focusTracking
                  ? trackingActive
                    ? (focusScore ?? "…")
                    : "Focus"
                  : "Focus off"}
              </button>
            )}
            {voiceSupported && mode !== "AR" && mode !== "STORY" && (
              <button
                onClick={toggleVoice}
                aria-pressed={voiceListening}
                title={
                  voiceListening
                    ? 'Voice control is on - try "next lesson", "read this", "sign mode"'
                    : "Turn on voice control"
                }
                className={`flex items-center gap-1.5 text-xs px-3 py-1 rounded-full border transition-colors ${
                  voiceListening
                    ? "bg-rose-500/15 text-rose-600 border-rose-400/40 dark:text-rose-300"
                    : "bg-slate-100 text-slate-500 border-slate-200 hover:text-slate-700 dark:bg-dark-card dark:text-gray-500 dark:border-white/10 dark:hover:text-gray-300"
                }`}
              >
                {voiceListening ? (
                  <Mic className="w-3.5 h-3.5" />
                ) : (
                  <MicOff className="w-3.5 h-3.5" />
                )}
                {voiceListening ? "Listening" : "Voice"}
              </button>
            )}
            {progress?.completed && (
              <span className="text-xs px-3 py-1 rounded-full bg-green-500/20 text-green-600 dark:text-green-400 border border-green-500/30">
                ✓ Completed
              </span>
            )}
            {mode !== "AR" && mode !== "STORY" && (
              <span className="text-xs px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-600 dark:bg-dark-card dark:border-white/10 dark:text-gray-300">
                Lesson {lessonIndex + 1} of {curriculum.lessons.length}
              </span>
            )}
            <ThemeToggle />
          </div>
        </div>
        <h1 className="text-lg font-display font-bold mb-3 text-slate-800 dark:text-white">
          {curriculum.title}
        </h1>

        {voiceError && (
          <p
            role="alert"
            className="text-xs text-rose-600 dark:text-rose-300 mb-3"
          >
            {voiceError}
          </p>
        )}

        {/* Presentation modes - the same lessons shown six ways. Switching is
            instant (no regeneration) and keeps your place. */}
        <div className="flex flex-wrap gap-2 mb-3">
          {MODES.map((m) => {
            const Icon = m.icon;
            const active = mode === m.key;
            return (
              <button
                key={m.key}
                onClick={() => changeMode(m.key)}
                className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border transition-all ${
                  active
                    ? "bg-primary/30 text-white border-primary shadow-[0_0_12px_rgba(108,61,231,0.35)]"
                    : "bg-slate-100 text-slate-600 border-slate-200 hover:border-slate-400 hover:bg-slate-200 hover:text-slate-900 dark:bg-white/5 dark:text-gray-300 dark:border-white/15 dark:hover:border-white/30 dark:hover:bg-white/10 dark:hover:text-white"
                }`}
              >
                <Icon className="w-3.5 h-3.5" /> {m.label}
              </button>
            );
          })}
        </div>

        {mode !== "AR" && mode !== "STORY" && (
          <div className="w-full h-2 bg-slate-100 dark:bg-dark-card rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-primary to-accent"
              initial={false}
              animate={{ width: `${progressPercent}%` }}
              transition={{ type: "spring", damping: 20 }}
            />
          </div>
        )}
      </header>

      <main
        className={`pt-8 ${
          mode === "AR" || mode === "STORY"
            ? "w-full px-0"
            : "mx-auto max-w-3xl px-4 sm:px-6"
        }`}
      >
        {mode === "STORY" ? (
          <StorybookView unitId={unitId as string} />
        ) : mode === "AR" ? (
          <div>
            <ArLessonGame
              unitId={unitId as string}
              onComplete={(score, total) => {
                // Finishing the balloon game counts as completing the unit's
                // active work - mark progress so AR isn't a dead end.
                if (!isPreview) saveProgress(lessonIndex, true, "AR");
                setFinalScore({ scoreCorrect: score, scoreTotal: total });
              }}
            />
            <p className="text-center text-xs text-slate-500 dark:text-gray-400 mt-4">
              Pop the balloon with the correct answer. Switch back to Text,
              Audio, or Visual any time — your place is saved.
            </p>
          </div>
        ) : (
          <>
            <AnimatePresence mode="wait">
              <motion.div
                key={lesson.id}
                {...cardMotionProps}
                className={`p-6 sm:p-10 rounded-3xl mb-6 ${
                  hc
                    ? "bg-black text-yellow-300 border-2 border-yellow-400"
                    : "bg-white border border-slate-200/80 shadow-xs dark:bg-white/[0.09] dark:backdrop-blur-2xl dark:border-white/[0.14] dark:shadow-none"
                }`}
              >
                <h2
                  className={`text-2xl font-display font-bold mb-4 ${hc ? "text-yellow-300" : "text-slate-800 dark:text-white"}`}
                >
                  {lesson.title}
                </h2>

                {/* VISUAL mode only - previously the image rendered in every
                    mode whenever one existed, so TEXT/AUDIO/SIGN were showing
                    "supporting" pictures despite the mode switcher promising
                    a text-only / audio-only / caption-only presentation. Each
                    mode should show exactly what it says it shows. */}
                {mode === "VISUAL" &&
                  (lesson.imageUrl ? (
                    <img
                      src={resolveMediaUrl(lesson.imageUrl)}
                      alt={lesson.title}
                      className="w-full object-contain rounded-2xl mb-6 bg-slate-100 dark:bg-black/20 max-h-[32rem]"
                    />
                  ) : (
                    <div className="w-full h-48 rounded-2xl mb-6 bg-slate-100 border border-slate-200 dark:bg-black/20 dark:border-white/10 flex items-center justify-center text-slate-500 dark:text-gray-400 text-sm">
                      <ImageIcon className="w-5 h-5 mr-2" /> No picture for this
                      lesson yet
                    </div>
                  ))}

                <div ref={lessonContentRef}>
                  <p
                    className={`leading-relaxed mb-4 ${
                      isSimplified || mode === "VISUAL" || mode === "SIGN"
                        ? "text-xl"
                        : "text-lg"
                    } ${hc ? "text-yellow-200" : "text-slate-700 dark:text-gray-200"}`}
                  >
                    {lesson.explanation}
                  </p>

                  {lesson.example && (
                    <div
                      className={`rounded-xl p-4 mb-4 text-sm ${
                        hc
                          ? "bg-yellow-950/40 border border-yellow-700 text-yellow-100"
                          : "bg-slate-50 border border-slate-100 dark:bg-dark/50 dark:border-transparent text-slate-500 dark:text-gray-400"
                      }`}
                    >
                      <span
                        className={
                          hc
                            ? "text-yellow-300 font-medium"
                            : "text-primary font-medium"
                        }
                      >
                        Example:{" "}
                      </span>
                      {lesson.example}
                    </div>
                  )}

                  {/* SIGN mode: caption-first, never plays audio by itself.
                      Fingerspells key vocabulary from the title and the
                      explanation - same honest scope as StorybookView's
                      strip (letter-by-letter guide, not full sentence
                      translation - see aslAlphabet.ts). */}
                  {mode === "SIGN" && (
                    <div className="space-y-3">
                      {pickKeyWord(lesson.title) && (
                        <AslFingerspellingStrip
                          word={pickKeyWord(lesson.title) as string}
                          highContrast={hc}
                        />
                      )}
                      {pickKeyWord(lesson.explanation) &&
                        pickKeyWord(lesson.explanation) !==
                          pickKeyWord(lesson.title) && (
                          <AslFingerspellingStrip
                            word={pickKeyWord(lesson.explanation) as string}
                            highContrast={hc}
                          />
                        )}
                    </div>
                  )}
                </div>

                <button
                  onClick={() =>
                    speak(
                      `${lesson.title}. ${lesson.explanation} ${lesson.example || ""}`,
                      lesson.audioUrl,
                    )
                  }
                  disabled={ttsLoading}
                  className={`flex items-center gap-2 text-sm disabled:opacity-60 ${
                    mode === "AUDIO"
                      ? "w-full justify-center bg-sky-500/15 border border-sky-500/30 text-sky-600 dark:text-sky-300 py-3 rounded-2xl font-bold hover:bg-sky-500/25"
                      : "text-blue-600 hover:text-blue-700 dark:text-blue-300 dark:hover:text-blue-200"
                  }`}
                >
                  {ttsLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Volume2 className="w-4 h-4" />
                  )}
                  {ttsLoading
                    ? "Loading audio…"
                    : mode === "AUDIO"
                      ? "Replay narration"
                      : "Listen to this lesson"}
                </button>
              </motion.div>
            </AnimatePresence>

            <SelectionListenButton
              containerRef={lessonContentRef}
              onListen={speak}
            />

            {!isPreview && (
              <KnowledgeCheckCard unitId={unitId as string} lesson={lesson} />
            )}
            {isPreview && lesson.knowledgeCheck && (
              <div className="bg-white border border-slate-200/70 dark:bg-white/5 dark:backdrop-blur-xl dark:border-white/[0.08] p-6 rounded-2xl mb-6 opacity-70">
                <p className="text-xs text-slate-500 dark:text-gray-400 uppercase tracking-wide mb-3">
                  Quick check (student view only)
                </p>
                <p className="font-medium text-slate-800 dark:text-white">
                  {lesson.knowledgeCheck.question}
                </p>
              </div>
            )}

            <div className="flex items-center justify-between gap-3">
              <button
                onClick={() => goTo(lessonIndex - 1)}
                disabled={onFirstLesson}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed dark:border-white/20 dark:text-white dark:hover:bg-white/5 dark:hover:border-white/40 transition-colors font-medium"
              >
                <ChevronLeft className="w-4 h-4" /> Previous
              </button>
              {onLastLesson ? (
                <Button onClick={finishCurriculum} className="gap-2">
                  {isPreview ? "End preview" : "Finish curriculum"}
                </Button>
              ) : (
                <Button onClick={() => goTo(lessonIndex + 1)} className="gap-2">
                  Next <ChevronRight className="w-4 h-4" />
                </Button>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default CurriculumPlayerPage;
