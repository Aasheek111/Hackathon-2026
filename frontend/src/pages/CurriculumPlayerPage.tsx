import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Volume2, Loader2, AlertCircle, ChevronRight, ChevronLeft, Sparkles } from 'lucide-react';
import Button from '../components/ui/Button';
import api from '../lib/api';

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

/**
 * The full-curriculum player (TODO.md Phases 5/7) - a unit only reaches this
 * page once a TutorialCurriculum exists for it (see TutorialRouter). Unlike
 * the legacy TutorialPage, the whole curriculum is fetched once and
 * navigated client-side: no regeneration, no re-fetch, on Next/Previous.
 */
export const CurriculumPlayerPage: React.FC = () => {
  const { unitId } = useParams<{ unitId: string }>();
  const navigate = useNavigate();
  const synth = window.speechSynthesis;

  const [curriculum, setCurriculum] = useState<Curriculum | null>(null);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [lessonIndex, setLessonIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    api
      .get(`/units/${unitId}/curriculum`)
      .then(({ data }) => {
        if (cancelled) return;
        setCurriculum(data.curriculum);
        setProgress(data.progress);
        // Resume where the student left off, clamped to a valid lesson index.
        const resumeIndex = Math.min(
          Math.max(data.progress?.currentLessonOrder ?? 0, 0),
          Math.max(data.curriculum.lessons.length - 1, 0)
        );
        setLessonIndex(resumeIndex);
      })
      .catch((err) => setError(err.response?.data?.error || 'Could not load this curriculum'))
      .finally(() => setLoading(false));
    return () => {
      cancelled = true;
      synth.cancel();
    };
  }, [unitId]); // eslint-disable-line react-hooks/exhaustive-deps

  const saveProgress = useCallback(
    (nextIndex: number, completed?: boolean) => {
      api
        .patch(`/units/${unitId}/curriculum/progress`, { currentLessonOrder: nextIndex, completed })
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
    synth.cancel();
    setLessonIndex(clamped);
    saveProgress(clamped);
  };

  const speak = (text: string) => {
    synth.cancel();
    synth.speak(new SpeechSynthesisUtterance(text));
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

            <p className="text-gray-200 leading-relaxed text-lg mb-4">{lesson.explanation}</p>

            {lesson.example && (
              <div className="bg-dark/50 rounded-xl p-4 text-sm text-gray-400 mb-4">
                <span className="text-primary-light font-medium">Example: </span>{lesson.example}
              </div>
            )}

            <button
              onClick={() => speak(`${lesson.title}. ${lesson.explanation} ${lesson.example || ''}`)}
              className="flex items-center gap-2 text-sm text-blue-300 hover:text-blue-200"
            >
              <Volume2 className="w-4 h-4" /> Listen to this lesson
            </button>
          </motion.div>
        </AnimatePresence>

        <div className="flex items-center justify-between gap-3">
          <Button variant="ghost" onClick={() => goTo(lessonIndex - 1)} disabled={onFirstLesson} className="gap-2">
            <ChevronLeft className="w-4 h-4" /> Previous
          </Button>
          {onLastLesson ? (
            <Button onClick={() => saveProgress(lessonIndex, true)} className="gap-2">
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
