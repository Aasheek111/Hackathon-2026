import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Loader2, AlertCircle, Video, Trophy, Check, X } from 'lucide-react';
import Button from '../components/ui/Button';
import api from '../lib/api';

interface Question {
  id: string;
  order: number;
  question: string;
  options: string[];
}
interface Quiz {
  id: string;
  title: string | null;
  sourceUrl: string;
  questions: Question[];
}
interface Attempt {
  scoreCorrect: number;
  scoreTotal: number;
}

/**
 * A quiz a teacher generated from a YouTube video and forwarded to this
 * unit (see the teacher dashboard's "Send to classroom" picker). Scored
 * server-side - the frontend never receives `correct` until after submit,
 * so there's nothing to read off the network tab beforehand.
 */
export const YoutubeQuizPage: React.FC = () => {
  const { unitId } = useParams<{ unitId: string }>();
  const navigate = useNavigate();

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ attempt: Attempt; correctAnswers: Record<string, string> } | null>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .get(`/units/${unitId}/youtube-quiz`)
      .then(({ data }) => {
        if (cancelled) return;
        setQuiz(data.quiz);
        if (data.latestAttempt) {
          setResult({ attempt: data.latestAttempt, correctAnswers: {} });
        }
      })
      .catch((err) => setError(err.response?.data?.error || 'Could not load this quiz'))
      .finally(() => setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [unitId]);

  const submit = async () => {
    if (!quiz) return;
    setSubmitting(true);
    try {
      const payload = quiz.questions.map((q) => ({ questionId: q.id, answer: answers[q.id] || '' }));
      const { data } = await api.post(`/units/${unitId}/youtube-quiz/submit`, { answers: payload });
      setResult({ attempt: data.attempt, correctAnswers: data.correctAnswers });
    } catch (err: any) {
      setError(err.response?.data?.error || 'Could not submit this quiz');
    } finally {
      setSubmitting(false);
    }
  };

  const retake = () => {
    setResult(null);
    setAnswers({});
  };

  const allAnswered = quiz ? quiz.questions.every((q) => answers[q.id]) : false;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF9F5] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (error || !quiz) {
    return (
      <div className="min-h-screen bg-[#FAF9F5] flex items-center justify-center p-6 text-slate-800 font-sans">
        <div className="bg-white max-w-md p-8 sm:p-10 rounded-3xl border border-slate-200/80 shadow-md text-center">
          <AlertCircle className="w-10 h-10 text-amber-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-slate-900 mb-2">Can&apos;t open this quiz</h1>
          <p className="text-slate-600 text-sm mb-6">{error || 'This quiz is unavailable'}</p>
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

  return (
    <div className="min-h-screen bg-[#FAF9F5] text-slate-800 font-sans pb-20">
      <header className="bg-white px-6 py-4 flex items-center justify-between sticky top-0 z-30 border-b border-slate-200 shadow-xs">
        <button
          onClick={() => navigate('/classroom')}
          className="flex items-center gap-1.5 text-slate-600 hover:text-slate-900 font-bold text-xs"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Classroom
        </button>
        <div className="flex items-center gap-2">
          <Video className="w-4 h-4 text-rose-500" />
          <span className="text-xs font-bold text-slate-700">{quiz.title || 'Video Quiz'}</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 pt-8">
        {result?.attempt && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs mb-6 flex items-center gap-4"
          >
            <Trophy className="w-8 h-8 text-amber-500 shrink-0" />
            <div>
              <p className="font-bold text-slate-900">
                Score: {result.attempt.scoreCorrect} / {result.attempt.scoreTotal}
              </p>
              <p className="text-xs text-slate-500">
                {Object.keys(result.correctAnswers).length > 0
                  ? 'Correct answers are highlighted below.'
                  : 'This is your most recent attempt.'}
              </p>
            </div>
            <Button variant="ghost" className="ml-auto" onClick={retake}>
              Retake
            </Button>
          </motion.div>
        )}

        <div className="space-y-4">
          {quiz.questions.map((q, qi) => {
            const correct = result?.correctAnswers[q.id];
            return (
              <div key={q.id} className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
                <p className="font-bold text-slate-900 text-sm mb-4">
                  {qi + 1}. {q.question}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {q.options.map((opt) => {
                    const chosen = answers[q.id] === opt;
                    let cls = 'border-slate-200 bg-[#FAF9F5] text-slate-700 hover:border-slate-300';
                    if (correct) {
                      if (opt === correct) cls = 'border-emerald-500 bg-emerald-50 text-emerald-900 font-bold';
                      else if (chosen) cls = 'border-rose-300 bg-rose-50 text-rose-900 font-bold';
                    } else if (chosen) {
                      cls = 'border-emerald-500 bg-emerald-50/50 text-emerald-900 font-bold';
                    }
                    return (
                      <button
                        key={opt}
                        disabled={!!correct}
                        onClick={() => setAnswers({ ...answers, [q.id]: opt })}
                        className={`text-left px-4 py-3 rounded-2xl border text-xs transition-all font-medium flex items-center gap-2 ${cls}`}
                      >
                        {correct && opt === correct && <Check className="w-3.5 h-3.5 shrink-0" />}
                        {correct && chosen && opt !== correct && <X className="w-3.5 h-3.5 shrink-0" />}
                        {opt}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {!result?.correctAnswers || Object.keys(result.correctAnswers).length === 0 ? (
          <Button className="mt-6 w-full" onClick={submit} disabled={!allAnswered} loading={submitting}>
            Submit Quiz
          </Button>
        ) : null}
      </main>
    </div>
  );
};

export default YoutubeQuizPage;
