import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Volume2, Loader2, AlertCircle, ChevronRight, ChevronLeft, Sparkles, Trophy, Check, X
} from 'lucide-react';
import Button from '../components/ui/Button';
import api from '../lib/api';

/**
 * Gemini TTS (rag-service `/generate-speech`, cached by content hash) with a
 * fallback to the browser's own speechSynthesis if the call fails (no key,
 * quota, network) - never goes silent, matching this app's established
 * offline-degrades-gracefully contract for its other AI features.
 */
function useSpeech() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [loading, setLoading] = useState(false);
  const synth = window.speechSynthesis;

  const speak = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    synth.cancel();
    audioRef.current?.pause();
    setLoading(true);
    try {
      const { data } = await api.post('/tts', { text: trimmed });
      if (!audioRef.current) audioRef.current = new Audio();
      audioRef.current.src = `${RAG_SERVICE_URL}${data.audioUrl}`;
      await audioRef.current.play();
    } catch {
      synth.speak(new SpeechSynthesisUtterance(trimmed));
    } finally {
      setLoading(false);
    }
  };

  const stop = () => {
    audioRef.current?.pause();
    synth.cancel();
  };

  return { speak, stop, loading };
}

/** A small floating "Listen" button that appears over a text selection. */
const SelectionListenButton: React.FC<{ containerRef: React.RefObject<HTMLElement | null>; onListen: (text: string) => void }> = ({
  containerRef,
  onListen
}) => {
  const [selection, setSelection] = useState<{ text: string; x: number; y: number } | null>(null);

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
      setSelection({ text, x: rect.left + rect.width / 2, y: rect.top + window.scrollY });
    };
    document.addEventListener('selectionchange', handleSelectionChange);
    return () => document.removeEventListener('selectionchange', handleSelectionChange);
  }, [containerRef]);

  if (!selection) return null;

  return (
    <button
      style={{ position: 'absolute', left: selection.x, top: selection.y - 44, transform: 'translateX(-50%)' }}
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

const RAG_SERVICE_URL = import.meta.env.VITE_RAG_SERVICE_URL || 'http://localhost:8100';

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

type View = 'lesson' | 'final-assessment' | 'complete';

/** One lesson's inline check-for-understanding question. Resets whenever the lesson changes. */
const KnowledgeCheckCard: React.FC<{ unitId: string; lesson: Lesson }> = ({ unitId, lesson }) => {
  const [selected, setSelected] = useState<string | null>(null);
  const [result, setResult] = useState<{ correct: boolean; correctAnswer: string } | null>(null);
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
      const { data } = await api.post(`/units/${unitId}/curriculum/lessons/${lesson.id}/knowledge-check`, {
        answer: selected
      });
      setResult(data);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="glass p-6 rounded-2xl mb-6">
      <p className="text-xs text-gray-500 uppercase tracking-wide mb-3">Quick check</p>
      <p className="font-medium mb-4">{check.question}</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
        {check.options.map((opt) => {
          const chosen = selected === opt;
          let cls = 'border-white/10 hover:border-white/30';
          if (result) {
            if (opt === result.correctAnswer) cls = 'border-green-500 bg-green-500/10 text-green-300';
            else if (chosen) cls = 'border-red-500 bg-red-500/10 text-red-300';
          } else if (chosen) {
            cls = 'border-primary bg-primary/10';
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
        <div className={`flex items-center gap-2 text-sm ${result.correct ? 'text-green-400' : 'text-amber-400'}`}>
          {result.correct ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
          {result.correct ? 'Correct!' : `Not quite - the answer was "${result.correctAnswer}"`}
        </div>
      ) : (
        <Button size="sm" onClick={submit} disabled={!selected} loading={submitting}>
          Check answer
        </Button>
      )}
    </div>
  );
};

const FinalAssessmentView: React.FC<{
  unitId: string;
  questions: FinalAssessmentQuestion[];
  onSubmitted: (score: { scoreCorrect: number; scoreTotal: number }, newBadges: Array<{ name: string }>) => void;
}> = ({ unitId, questions, onSubmitted }) => {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    setSubmitting(true);
    try {
      const payload = questions.map((q) => ({ questionId: q.id, answer: answers[q.id] || '' }));
      const { data } = await api.post(`/units/${unitId}/curriculum/final-assessment`, { answers: payload });
      onSubmitted(
        { scoreCorrect: data.attempt.scoreCorrect, scoreTotal: data.attempt.scoreTotal },
        data.newBadges || []
      );
    } finally {
      setSubmitting(false);
    }
  };

  const allAnswered = questions.every((q) => answers[q.id]);

  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-6 pt-8 pb-20">
      <div className="glass-strong p-6 sm:p-8 rounded-3xl">
        <div className="flex items-center gap-2 mb-6">
          <Sparkles className="w-5 h-5 text-accent" />
          <h2 className="text-xl font-bold">Final assessment</h2>
        </div>
        <div className="space-y-6">
          {questions.map((q, qi) => (
            <div key={q.id}>
              <p className="font-medium mb-3">{qi + 1}. {q.question}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {q.options.map((opt) => (
                  <button
                    key={opt}
                    onClick={() => setAnswers({ ...answers, [q.id]: opt })}
                    className={`text-left px-4 py-3 rounded-xl border text-sm transition-all ${
                      answers[q.id] === opt ? 'border-primary bg-primary/10' : 'border-white/10 hover:border-white/30'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
        <Button className="mt-6" onClick={submit} disabled={!allAnswered} loading={submitting}>
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
  const lessonContentRef = useRef<HTMLDivElement>(null);

  const [curriculum, setCurriculum] = useState<Curriculum | null>(null);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [lessonIndex, setLessonIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [view, setView] = useState<View>('lesson');
  const [finalScore, setFinalScore] = useState<{ scoreCorrect: number; scoreTotal: number } | null>(null);
  const [newBadges, setNewBadges] = useState<Array<{ name: string }>>([]);

  useEffect(() => {
    let cancelled = false;
    api
      .get(`/units/${unitId}/curriculum`)
      .then(({ data }) => {
        if (cancelled) return;
        setCurriculum(data.curriculum);
        setProgress(data.progress);
        const resumeIndex = Math.min(
          Math.max(data.progress?.currentLessonOrder ?? 0, 0),
          Math.max(data.curriculum.lessons.length - 1, 0)
        );
        setLessonIndex(resumeIndex);
        if (data.progress?.completed) setView('complete');
      })
      .catch((err) => setError(err.response?.data?.error || 'Could not load this curriculum'))
      .finally(() => setLoading(false));
    return () => {
      cancelled = true;
      stopSpeaking();
    };
  }, [unitId]); // eslint-disable-line react-hooks/exhaustive-deps

  const saveProgress = useCallback(
    (nextIndex: number, completed?: boolean) => {
      api
        .patch(`/units/${unitId}/curriculum/progress`, { currentLessonOrder: nextIndex, completed })
        .then(({ data }) => {
          if (data.newBadges?.length) setNewBadges(data.newBadges);
        })
        .catch(() => {
          /* progress is a convenience pointer - a failed save just means the
             student re-reads this lesson next visit, never blocks navigation */
        });
    },
    [unitId]
  );

  const goTo = (index: number) => {
    if (!curriculum) return;
    const clamped = Math.min(Math.max(index, 0), curriculum.lessons.length - 1);
    stopSpeaking();
    setLessonIndex(clamped);
    saveProgress(clamped);
  };

  const finishCurriculum = () => {
    if (!curriculum) return;
    if (curriculum.finalAssessmentQuestions.length > 0) {
      setView('final-assessment');
    } else {
      saveProgress(lessonIndex, true);
      setView('complete');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-dark flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !curriculum || curriculum.lessons.length === 0) {
    return (
      <div className="min-h-screen bg-dark flex items-center justify-center p-6">
        <div className="glass-strong max-w-md p-10 rounded-3xl text-center">
          <AlertCircle className="w-10 h-10 text-amber-400 mx-auto mb-4" />
          <h1 className="text-xl font-bold mb-2">Can&apos;t open this curriculum</h1>
          <p className="text-gray-400 mb-6">{error || 'This curriculum has no lessons yet'}</p>
          <Button variant="ghost" onClick={() => navigate('/classroom')}>Back to classroom</Button>
        </div>
      </div>
    );
  }

  if (view === 'complete') {
    return (
      <div className="min-h-screen bg-dark flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-strong max-w-md w-full p-10 rounded-3xl text-center"
        >
          <Trophy className="w-12 h-12 text-accent mx-auto mb-4" />
          <h1 className="text-2xl font-display font-bold mb-2">Coursework complete!</h1>
          <p className="text-gray-400 mb-2">{curriculum.title}</p>
          {finalScore && (
            <p className="text-lg font-bold mb-4">
              Score: {finalScore.scoreCorrect} / {finalScore.scoreTotal}
            </p>
          )}
          {newBadges.length > 0 && (
            <p className="text-sm text-accent mb-4">New badge: {newBadges.map((b) => b.name).join(', ')}</p>
          )}
          <div className="w-full h-2 bg-dark-card rounded-full overflow-hidden mb-6">
            <div className="h-full bg-gradient-to-r from-primary to-primary-light" style={{ width: '100%' }} />
          </div>
          <Button onClick={() => navigate('/classroom')} className="w-full">Back to classroom</Button>
        </motion.div>
      </div>
    );
  }

  if (view === 'final-assessment') {
    return (
      <div className="min-h-screen bg-dark">
        <header className="glass px-6 py-4 sticky top-0 z-30 border-b border-white/10">
          <button onClick={() => setView('lesson')} className="flex items-center gap-2 text-gray-400 hover:text-white">
            <ArrowLeft className="w-5 h-5" /> Back to lessons
          </button>
        </header>
        <FinalAssessmentView
          unitId={unitId as string}
          questions={curriculum.finalAssessmentQuestions}
          onSubmitted={(score, badges) => {
            setFinalScore(score);
            setNewBadges(badges);
            setView('complete');
          }}
        />
      </div>
    );
  }

  const lesson = curriculum.lessons[lessonIndex];
  const onFirstLesson = lessonIndex === 0;
  const onLastLesson = lessonIndex >= curriculum.lessons.length - 1;
  const progressPercent = Math.round(((lessonIndex + 1) / curriculum.lessons.length) * 100);

  return (
    <div className="min-h-screen bg-dark pb-20">
      <header className="glass px-6 py-4 sticky top-0 z-30 border-b border-white/10">
        <div className="flex items-center justify-between mb-3">
          <button onClick={() => navigate('/classroom')} className="flex items-center gap-2 text-gray-400 hover:text-white">
            <ArrowLeft className="w-5 h-5" /> Back
          </button>
          <div className="flex items-center gap-2">
            {progress?.completed && (
              <span className="text-xs px-3 py-1 rounded-full bg-green-500/20 text-green-400 border border-green-500/30">
                ✓ Completed
              </span>
            )}
            <span className="text-xs px-3 py-1 rounded-full bg-dark-card border border-white/10">
              Lesson {lessonIndex + 1} of {curriculum.lessons.length}
            </span>
          </div>
        </div>
        <h1 className="text-lg font-display font-bold mb-2">{curriculum.title}</h1>
        <div className="w-full h-2 bg-dark-card rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-primary to-primary-light"
            initial={false}
            animate={{ width: `${progressPercent}%` }}
            transition={{ type: 'spring', damping: 20 }}
          />
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 pt-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={lesson.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="glass-strong p-6 sm:p-10 rounded-3xl mb-6"
          >
            <h2 className="text-2xl font-display font-bold mb-4">{lesson.title}</h2>

            {lesson.imageUrl && (
              <img
                src={`${RAG_SERVICE_URL}${lesson.imageUrl}`}
                alt={lesson.title}
                className="w-full max-h-96 object-contain rounded-2xl mb-6 bg-black/20"
              />
            )}

            <div ref={lessonContentRef}>
              <p className="text-gray-200 leading-relaxed text-lg mb-4">{lesson.explanation}</p>

              {lesson.example && (
                <div className="bg-dark/50 rounded-xl p-4 text-sm text-gray-400 mb-4">
                  <span className="text-primary-light font-medium">Example: </span>{lesson.example}
                </div>
              )}
            </div>

            <button
              onClick={() => speak(`${lesson.title}. ${lesson.explanation} ${lesson.example || ''}`)}
              disabled={ttsLoading}
              className="flex items-center gap-2 text-sm text-blue-300 hover:text-blue-200 disabled:opacity-60"
            >
              {ttsLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Volume2 className="w-4 h-4" />}
              {ttsLoading ? 'Generating audio…' : 'Listen to this lesson'}
            </button>
          </motion.div>
        </AnimatePresence>

        <SelectionListenButton containerRef={lessonContentRef} onListen={speak} />

        <KnowledgeCheckCard unitId={unitId as string} lesson={lesson} />

        <div className="flex items-center justify-between gap-3">
          <Button variant="ghost" onClick={() => goTo(lessonIndex - 1)} disabled={onFirstLesson} className="gap-2">
            <ChevronLeft className="w-4 h-4" /> Previous
          </Button>
          {onLastLesson ? (
            <Button onClick={finishCurriculum} className="gap-2">
              <Sparkles className="w-4 h-4" /> Finish curriculum
            </Button>
          ) : (
            <Button onClick={() => goTo(lessonIndex + 1)} className="gap-2">
              Next <ChevronRight className="w-4 h-4" />
            </Button>
          )}
        </div>
      </main>
    </div>
  );
};

export default CurriculumPlayerPage;
