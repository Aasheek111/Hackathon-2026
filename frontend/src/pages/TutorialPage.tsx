import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Volume2, Image as ImageIcon, BookOpen, Sparkles, Loader2,
  AlertCircle, ChevronRight, Trophy, WifiOff
} from 'lucide-react';
import TutorialAssistant from '../components/TutorialAssistant';
import api from '../lib/api';

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
  steps: Step[];
  quiz: QuizItem[];
  teacherNote: string;
  offline: boolean;
}

export const TutorialPage: React.FC = () => {
  const { unitId } = useParams<{ unitId: string }>();
  const navigate = useNavigate();
  const synth = window.speechSynthesis;

  const [tutorial, setTutorial] = useState<Tutorial | null>(null);
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
        setStepIndex(0);
        setQuizAnswers({});
        setQuizSubmitted(false);
      } catch (err: any) {
        setError(err.response?.data?.error || 'Could not load this tutorial');
      } finally {
        setLoading(false);
      }
    },
    [unitId]
  );

  useEffect(() => {
    load();
    return () => synth.cancel();
  }, [load]);

  useEffect(() => {
    if (tutorial?.learningMode === 'AUDIO' && tutorial.audioScript) {
      synth.cancel();
      const utterance = new SpeechSynthesisUtterance(tutorial.audioScript);
      utterance.rate = 0.92;
      synth.speak(utterance);
    }
  }, [tutorial]);

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
      /* ignore non-critical awards error */
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF9F5] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (error || !tutorial) {
    return (
      <div className="min-h-screen bg-[#FAF9F5] flex items-center justify-center p-6 text-slate-800 font-sans">
        <div className="bg-white max-w-md p-8 sm:p-10 rounded-3xl border border-slate-200/80 shadow-md text-center">
          <AlertCircle className="w-10 h-10 text-amber-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-slate-900 mb-2">Can't open tutorial</h1>
          <p className="text-slate-600 text-sm mb-6 leading-relaxed">{error}</p>
          <button
            onClick={() => navigate('/classroom')}
            className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold px-5 py-2.5 rounded-2xl text-xs"
          >
            Back to Classroom
          </button>
        </div>
      </div>
    );
  }

  const isSimplified = tutorial.level <= 2;
  const step = tutorial.steps[stepIndex];
  const onLastStep = stepIndex >= tutorial.steps.length - 1;
  const quizScore = tutorial.quiz.filter((q, i) => quizAnswers[i] === q.correct).length;

  return (
    <div className="min-h-screen bg-[#FAF9F5] text-slate-800 font-sans selection:bg-emerald-100 selection:text-emerald-900 pb-20">
      <header className="bg-white px-6 py-4 flex items-center justify-between sticky top-0 z-30 border-b border-slate-200 shadow-xs">
        <button onClick={() => navigate('/classroom')} className="flex items-center gap-1.5 text-slate-600 hover:text-slate-900 font-bold text-xs">
          <ArrowLeft className="w-4 h-4" /> Back to Classroom
        </button>
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold px-3 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">Level {tutorial.level}</span>
          <div className="hidden sm:flex gap-1.5">
            {(['TEXT', 'AUDIO', 'VISUAL'] as const).map((m) => (
              <button
                key={m}
                onClick={() => load(m)}
                className={`text-xs font-bold px-3 py-1 rounded-2xl border transition-all ${
                  tutorial.learningMode === m
                    ? 'bg-emerald-50 text-emerald-900 border-emerald-500 shadow-xs'
                    : 'border-slate-200 bg-[#FAF9F5] text-slate-600 hover:border-slate-300'
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
          <div className="mb-6 bg-amber-50 border border-amber-200 text-amber-900 p-3.5 rounded-2xl text-xs font-medium flex items-center gap-2">
            <WifiOff className="w-4 h-4 shrink-0 text-amber-700" /> Built from syllabus text — offline adaptation mode active.
          </div>
        )}

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white p-6 sm:p-10 rounded-3xl border border-slate-200/80 shadow-xs mb-6">
          <div className="flex items-center gap-3 mb-4">
            {tutorial.learningMode === 'VISUAL' && <ImageIcon className="w-6 h-6 text-emerald-600" />}
            {tutorial.learningMode === 'AUDIO' && <Volume2 className="w-6 h-6 text-sky-600" />}
            {tutorial.learningMode === 'TEXT' && <BookOpen className="w-6 h-6 text-amber-600" />}
            <h1 className="text-2xl font-bold text-slate-900">Tutorial Lesson</h1>
          </div>

          {tutorial.learningMode === 'VISUAL' && (
            <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-2xl p-5 mb-6">
              <p className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider mb-1">Visual Concept Representation</p>
              <p className="text-base font-bold text-slate-900">{tutorial.visualSuggestion}</p>
            </div>
          )}

          {tutorial.learningMode === 'AUDIO' && (
            <button
              onClick={() => speak(tutorial.audioScript)}
              className="w-full flex items-center gap-3 bg-sky-50 border border-sky-200 text-sky-900 p-4 rounded-2xl mb-6 font-bold text-sm hover:bg-sky-100 transition-colors"
            >
              <Volume2 className="w-5 h-5 text-sky-600 animate-pulse shrink-0" /> Replay Voice Narration
            </button>
          )}

          <p className={`text-slate-700 leading-relaxed font-medium ${isSimplified ? 'text-lg' : 'text-base'}`}>{tutorial.tutorialText}</p>
        </motion.div>

        {tutorial.steps.length > 0 && (
          <div className="mb-6">
            {isSimplified ? (
              <AnimatePresence mode="wait">
                <motion.div
                  key={stepIndex}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="bg-white p-8 rounded-3xl border border-slate-200/80 shadow-xs"
                >
                  <p className="text-xs font-bold text-slate-400 mb-2">Step {stepIndex + 1} of {tutorial.steps.length}</p>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">{step.concept}</h3>
                  <p className="text-slate-600 text-sm leading-relaxed mb-4">{step.explanation}</p>
                  {step.example && (
                    <div className="bg-[#FAF9F5] border border-slate-200/70 rounded-2xl p-4 text-xs font-medium text-slate-700 mb-6">
                      <strong className="text-emerald-700">Example: </strong>{step.example}
                    </div>
                  )}
                  <button
                    onClick={() => setStepIndex((i) => Math.min(i + 1, tutorial.steps.length - 1))}
                    disabled={onLastStep}
                    className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 px-6 rounded-2xl shadow-md border-b-4 border-emerald-700 active:translate-y-0.5 active:border-b-2 transition-all flex items-center gap-1.5 text-xs disabled:opacity-50"
                  >
                    <span>Next Step</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </motion.div>
              </AnimatePresence>
            ) : (
              <div className="space-y-4">
                {tutorial.steps.map((s, i) => (
                  <div key={i} className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
                    <h3 className="font-bold text-slate-900 text-base mb-1">{i + 1}. {s.concept}</h3>
                    <p className="text-slate-600 text-xs leading-relaxed mb-2">{s.explanation}</p>
                    {s.example && <p className="text-[11px] text-slate-500 font-medium">Example: {s.example}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tutorial.quiz.length > 0 && (
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center gap-2 mb-6 text-emerald-800">
              <Sparkles className="w-5 h-5 text-emerald-600" />
              <h2 className="text-lg font-bold text-slate-900">Knowledge Check</h2>
            </div>
            <div className="space-y-6">
              {tutorial.quiz.map((q, qi) => (
                <div key={qi}>
                  <p className="font-bold text-slate-900 text-sm mb-3">{q.question}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {q.options.map((opt) => {
                      const chosen = quizAnswers[qi] === opt;
                      const showCorrectness = quizSubmitted;
                      const isCorrectOpt = opt === q.correct;
                      let cls = 'border-slate-200 bg-[#FAF9F5] text-slate-700 hover:border-slate-300';
                      if (showCorrectness && isCorrectOpt) cls = 'border-emerald-500 bg-emerald-50 text-emerald-900 font-bold';
                      else if (showCorrectness && chosen) cls = 'border-rose-300 bg-rose-50 text-rose-900 font-bold';
                      else if (chosen) cls = 'border-emerald-500 bg-emerald-50/50 text-emerald-900 font-bold';
                      return (
                        <button
                          key={opt}
                          disabled={quizSubmitted}
                          onClick={() => setQuizAnswers({ ...quizAnswers, [qi]: opt })}
                          className={`text-left px-4 py-3 rounded-2xl border text-xs transition-all font-medium ${cls}`}
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
              <button
                onClick={submitQuiz}
                disabled={Object.keys(quizAnswers).length < tutorial.quiz.length}
                className="mt-6 bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3.5 px-6 rounded-2xl shadow-md border-b-4 border-emerald-700 active:translate-y-0.5 active:border-b-2 transition-all text-xs disabled:opacity-50"
              >
                Submit Answers
              </button>
            ) : (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-6 flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
                <Trophy className="w-6 h-6 text-amber-500 shrink-0" />
                <div>
                  <p className="font-bold text-emerald-900 text-sm">
                    {quizScore} / {tutorial.quiz.length} Correct — +15 XP Earned!
                  </p>
                  {newBadges.length > 0 && (
                    <p className="text-xs text-amber-700 font-bold">New badge: {newBadges.map((b) => b.name).join(', ')}</p>
                  )}
                </div>
              </motion.div>
            )}
          </div>
        )}
      </main>

      {tutorial.learningMode !== 'AR' && (
        <TutorialAssistant currentMode={tutorial.learningMode} onModeChange={load} />
      )}
    </div>
  );
};

export default TutorialPage;

