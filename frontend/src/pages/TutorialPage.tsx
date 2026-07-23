import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Volume2, Image as ImageIcon, BookOpen, Sparkles, Loader2,
  AlertCircle, ChevronRight, Trophy, WifiOff
} from 'lucide-react';
import Button from '../components/ui/Button';
import TutorialAssistant from '../components/TutorialAssistant';
import api from '../lib/api';

const RAG_SERVICE_URL = import.meta.env.VITE_RAG_SERVICE_URL || 'http://localhost:8100';

type LearningMode = 'TEXT' | 'AUDIO' | 'VISUAL' | 'AR';

interface Step {
  concept: string;
  explanation: string;
  example: string;
  checkpoint_question?: string;
}
interface QuizItem {
  question: string;
  options: string[];
  correct: string;
}
interface Tutorial {
  id: string;
  learningMode: LearningMode;
  level: number;
  tutorialText: string;
  audioScript: string;
  visualSuggestion: string;
  imageUrl: string | null;
  steps: Step[];
  quiz: QuizItem[];
  teacherNote: string;
  offline: boolean;
}

/**
 * PLAN.md Part 9.1 - the same tutorial data presented differently depending on
 * learningMode and level. No new metrics are invented here: mode and level
 * both come straight from the backend, which derived them from the student's
 * own assessment history.
 */
export const TutorialPage: React.FC = () => {
  const { unitId } = useParams<{ unitId: string }>();
  const navigate = useNavigate();
  const synth = window.speechSynthesis;

  const [tutorial, setTutorial] = useState<Tutorial | null>(null);
  const [unitPreviewImageUrl, setUnitPreviewImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stepIndex, setStepIndex] = useState(0);
  const [quizAnswers, setQuizAnswers] = useState<Record<number, string>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [newBadges, setNewBadges] = useState<Array<{ name: string }>>([]);

  const load = useCallback(
    async (mode?: LearningMode) => {
      setLoading(true);
      setError('');
      try {
        const { data } = await api.get(`/units/${unitId}/tutorial`, { params: mode ? { mode } : {} });
        setTutorial(data.tutorial);
        setUnitPreviewImageUrl(data.unitPreviewImageUrl ?? null);
        setStepIndex(0);
        setQuizAnswers({});
        setQuizSubmitted(false);
        return data.tutorial as Tutorial;
      } catch (err: any) {
        setError(err.response?.data?.error || 'Could not load this tutorial');
        return null;
      } finally {
        setLoading(false);
      }
    },
    [unitId]
  );

  useEffect(() => {
    load();
    return () => synth.cancel();
  }, [load]); // eslint-disable-line react-hooks/exhaustive-deps

  // The picture generates in the background after tutorial creation - poll a
  // few times for it rather than making the student wait on the first request.
  useEffect(() => {
    if (!tutorial || tutorial.learningMode !== 'VISUAL' || tutorial.imageUrl || tutorial.offline) return;
    let attempts = 0;
    const interval = setInterval(async () => {
      attempts += 1;
      try {
        const { data } = await api.get(`/units/${unitId}/tutorial`, { params: { mode: 'VISUAL' } });
        if (data.unitPreviewImageUrl) setUnitPreviewImageUrl(data.unitPreviewImageUrl);
        if (data.tutorial?.imageUrl) {
          setTutorial((prev) => (prev ? { ...prev, imageUrl: data.tutorial.imageUrl } : prev));
        }
      } catch {
        // transient - try again next tick, and stop quietly once attempts run out
      }
      if (attempts >= 8) clearInterval(interval);
    }, 3000);
    return () => clearInterval(interval);
  }, [tutorial?.id, tutorial?.learningMode, tutorial?.imageUrl, tutorial?.offline, unitId]);

  const customizeVisual = useCallback(
    async (instruction: string): Promise<{ ok: boolean; message: string }> => {
      let current = tutorial;
      if (!current || current.learningMode !== 'VISUAL') {
        current = await load('VISUAL');
      }
      if (!current) return { ok: false, message: "I couldn't switch to visual mode right now." };

      try {
        const { data } = await api.post(`/units/${unitId}/tutorial/${current.id}/visual`, { instruction });
        setTutorial((prev) => (prev ? { ...prev, imageUrl: data.tutorial.imageUrl } : prev));
        return { ok: true, message: "Here's your new picture!" };
      } catch (err: any) {
        return { ok: false, message: err.response?.data?.error || "I couldn't generate that picture right now." };
      }
    },
    [tutorial, load, unitId]
  );

  useEffect(() => {
    if (tutorial?.learningMode === 'AUDIO' && tutorial.audioScript) {
      synth.cancel();
      const utterance = new SpeechSynthesisUtterance(tutorial.audioScript);
      utterance.rate = 0.92;
      synth.speak(utterance);
    }
  }, [tutorial]); // eslint-disable-line react-hooks/exhaustive-deps

  const speak = (text: string) => {
    synth.cancel();
    synth.speak(new SpeechSynthesisUtterance(text));
  };

  const submitQuiz = async () => {
    if (!tutorial) return;
    setQuizSubmitted(true);
    try {
      const { data } = await api.post(`/units/${unitId}/tutorial/${tutorial.id}/quiz-complete`, {});
      setNewBadges(data.newBadges || []);
    } catch {
      /* xp/badge award is a nice-to-have, never block the completion UI on it */
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-dark flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !tutorial) {
    return (
      <div className="min-h-screen bg-dark flex items-center justify-center p-6">
        <div className="glass-strong max-w-md p-10 rounded-3xl text-center">
          <AlertCircle className="w-10 h-10 text-amber-400 mx-auto mb-4" />
          <h1 className="text-xl font-bold mb-2">Can&apos;t open this tutorial</h1>
          <p className="text-gray-400 mb-6">{error}</p>
          <Button variant="ghost" onClick={() => navigate('/classroom')}>Back to classroom</Button>
        </div>
      </div>
    );
  }

  const isSimplified = tutorial.level <= 2; // PLAN.md 9.1: one step at a time, larger, hints visible
  const step = tutorial.steps[stepIndex];
  const onLastStep = stepIndex >= tutorial.steps.length - 1;
  const quizScore = tutorial.quiz.filter((q, i) => quizAnswers[i] === q.correct).length;

  return (
    <div className="min-h-screen bg-dark pb-20">
      <header className="glass px-6 py-4 flex items-center justify-between sticky top-0 z-30 border-b border-white/10">
        <button onClick={() => navigate('/classroom')} className="flex items-center gap-2 text-gray-400 hover:text-white">
          <ArrowLeft className="w-5 h-5" /> Back
        </button>
        <div className="flex items-center gap-3">
          <span className="text-xs px-3 py-1 rounded-full bg-dark-card border border-white/10">Level {tutorial.level}</span>
          <div className="hidden sm:flex gap-1">
            {(['TEXT', 'AUDIO', 'VISUAL'] as const).map((m) => (
              <button
                key={m}
                onClick={() => load(m)}
                className={`text-xs px-3 py-1.5 rounded-full border ${
                  tutorial.learningMode === m ? 'bg-primary/20 border-primary text-white' : 'border-white/10 text-gray-400'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 pt-8">
        {tutorial.offline && (
          <div className="mb-6 bg-amber-500/10 border border-amber-500/30 text-amber-400 p-3 rounded-xl text-sm flex items-center gap-2">
            <WifiOff className="w-4 h-4 shrink-0" /> Built from the document text directly (no AI key configured) - still real content from your teacher&apos;s upload.
          </div>
        )}

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-strong p-6 sm:p-10 rounded-3xl mb-6">
          <div className="flex items-center gap-3 mb-4">
            {tutorial.learningMode === 'VISUAL' && <ImageIcon className="w-6 h-6 text-green-400" />}
            {tutorial.learningMode === 'AUDIO' && <Volume2 className="w-6 h-6 text-blue-400" />}
            {tutorial.learningMode === 'TEXT' && <BookOpen className="w-6 h-6 text-primary" />}
            <h1 className="text-2xl font-display font-bold">Tutorial</h1>
          </div>

          {tutorial.learningMode === 'VISUAL' && (
            <div className="bg-dark/50 border border-white/10 rounded-2xl p-6 mb-6">
              <p className="text-xs text-gray-500 mb-2 uppercase tracking-wide">Picture this</p>
              {tutorial.imageUrl || unitPreviewImageUrl ? (
                <img
                  src={`${RAG_SERVICE_URL}${tutorial.imageUrl || unitPreviewImageUrl}`}
                  alt={tutorial.visualSuggestion}
                  className="w-full max-h-96 object-contain rounded-xl mb-3 bg-black/20"
                />
              ) : (
                !tutorial.offline && (
                  <div className="flex items-center gap-2 text-gray-400 text-sm mb-3">
                    <Loader2 className="w-4 h-4 animate-spin" /> Generating your picture&hellip;
                  </div>
                )
              )}
              <p className="text-lg">{tutorial.visualSuggestion}</p>
            </div>
          )}

          {tutorial.learningMode === 'AUDIO' && (
            <button
              onClick={() => speak(tutorial.audioScript)}
              className="w-full flex items-center gap-3 bg-blue-500/10 border border-blue-500/30 text-blue-300 p-4 rounded-2xl mb-6 hover:bg-blue-500/20"
            >
              <Volume2 className="w-6 h-6 animate-pulse shrink-0" /> Replay narration
            </button>
          )}

          <p className={`text-gray-200 leading-relaxed ${isSimplified ? 'text-lg' : 'text-base'}`}>{tutorial.tutorialText}</p>
        </motion.div>

        {/* Structured steps (PLAN.md 8.2) */}
        {tutorial.steps.length > 0 && (
          <div className="mb-6">
            {isSimplified ? (
              <AnimatePresence mode="wait">
                <motion.div
                  key={stepIndex}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="glass p-8 rounded-3xl"
                >
                  <p className="text-xs text-gray-500 mb-2">Step {stepIndex + 1} of {tutorial.steps.length}</p>
                  <h3 className="text-xl font-bold mb-3">{step.concept}</h3>
                  <p className="text-gray-300 mb-4">{step.explanation}</p>
                  {step.example && (
                    <div className="bg-dark/50 rounded-xl p-4 text-sm text-gray-400 mb-4">
                      <span className="text-primary-light font-medium">Example: </span>{step.example}
                    </div>
                  )}
                  <Button onClick={() => setStepIndex((i) => Math.min(i + 1, tutorial.steps.length - 1))} disabled={onLastStep} className="gap-2">
                    Next <ChevronRight className="w-4 h-4" />
                  </Button>
                </motion.div>
              </AnimatePresence>
            ) : (
              <div className="space-y-4">
                {tutorial.steps.map((s, i) => (
                  <div key={i} className="glass p-6 rounded-2xl">
                    <h3 className="font-bold mb-2">{i + 1}. {s.concept}</h3>
                    <p className="text-gray-300 text-sm mb-2">{s.explanation}</p>
                    {s.example && <p className="text-xs text-gray-500">Example: {s.example}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Mini quiz (PLAN.md demo steps 18-19) */}
        {tutorial.quiz.length > 0 && (
          <div className="glass-strong p-6 sm:p-8 rounded-3xl">
            <div className="flex items-center gap-2 mb-6">
              <Sparkles className="w-5 h-5 text-accent" />
              <h2 className="text-xl font-bold">Quick check</h2>
            </div>
            <div className="space-y-6">
              {tutorial.quiz.map((q, qi) => (
                <div key={qi}>
                  <p className="font-medium mb-3">{q.question}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {q.options.map((opt) => {
                      const chosen = quizAnswers[qi] === opt;
                      const showCorrectness = quizSubmitted;
                      const isCorrectOpt = opt === q.correct;
                      let cls = 'border-white/10 hover:border-white/30';
                      if (showCorrectness && isCorrectOpt) cls = 'border-green-500 bg-green-500/10 text-green-300';
                      else if (showCorrectness && chosen) cls = 'border-red-500 bg-red-500/10 text-red-300';
                      else if (chosen) cls = 'border-primary bg-primary/10';
                      return (
                        <button
                          key={opt}
                          disabled={quizSubmitted}
                          onClick={() => setQuizAnswers({ ...quizAnswers, [qi]: opt })}
                          className={`text-left px-4 py-3 rounded-xl border text-sm transition-all ${cls}`}
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {!quizSubmitted ? (
              <Button onClick={submitQuiz} className="mt-6" disabled={Object.keys(quizAnswers).length < tutorial.quiz.length}>
                Submit answers
              </Button>
            ) : (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-6 flex items-center gap-3 bg-primary/10 border border-primary/30 rounded-2xl p-4">
                <Trophy className="w-6 h-6 text-accent shrink-0" />
                <div>
                  <p className="font-bold">
                    {quizScore} / {tutorial.quiz.length} correct - +15 XP earned
                  </p>
                  {newBadges.length > 0 && (
                    <p className="text-sm text-accent">New badge: {newBadges.map((b) => b.name).join(', ')}</p>
                  )}
                </div>
              </motion.div>
            )}
          </div>
        )}
      </main>

      {tutorial.learningMode !== 'AR' && (
        <TutorialAssistant
          currentMode={tutorial.learningMode}
          onModeChange={load}
          onCustomizeVisual={customizeVisual}
        />
      )}
    </div>
  );
};

export default TutorialPage;
