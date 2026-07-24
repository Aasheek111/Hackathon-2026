import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Check, X, Loader2, ArrowRight, BookOpen } from 'lucide-react';
import api from '../lib/api';

interface Reason {
  label: string;
  applicable: boolean;
  passed: boolean;
  detail: string;
}
interface Recommendation {
  classroom: { id: string; name: string; description: string | null; teacherName: string };
  score: number;
  reasons: Reason[];
}

export const RecommendationPage: React.FC = () => {
  const navigate = useNavigate();
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [requesting, setRequesting] = useState<string | null>(null);
  const [requestedIds, setRequestedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    api
      .get('/recommendations')
      .then(({ data }) => {
        setRecommendations(data.recommendations);
        setMessage(data.message || '');
      })
      .finally(() => setLoading(false));
  }, []);

  const requestJoin = async (classroomId: string) => {
    setRequesting(classroomId);
    try {
      await api.post(`/classrooms/${classroomId}/requests`);
      setRequestedIds((prev) => new Set(prev).add(classroomId));
    } finally {
      setRequesting(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF9F5] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (message) {
    return (
      <div className="min-h-screen bg-[#FAF9F5] text-slate-800 font-sans flex items-center justify-center p-6">
        <div className="bg-white max-w-md p-8 sm:p-10 rounded-3xl border border-slate-200/80 shadow-md text-center">
          <div className="w-16 h-16 bg-amber-100 text-amber-700 rounded-3xl flex items-center justify-center mx-auto mb-4 border border-amber-200">
            <BookOpen className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Take assessment first</h1>
          <p className="text-slate-600 text-sm mb-6 leading-relaxed">
            We recommend classrooms based on your actual assessment results.
          </p>
          <button
            onClick={() => navigate('/consent')}
            className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3.5 px-6 rounded-2xl shadow-md border-b-4 border-emerald-700 active:translate-y-0.5 active:border-b-2 transition-all text-sm"
          >
            Start Assessment Quiz
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF9F5] text-slate-800 font-sans selection:bg-emerald-100 selection:text-emerald-900 py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full text-xs font-bold mb-3">
            <Sparkles className="w-4 h-4 text-emerald-600" />
            <span>Based on your learning profile</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900">Recommended Classrooms</h1>
        </div>

        <div className="space-y-6">
          {recommendations.map((rec, i) => (
            <motion.div
              key={rec.classroom.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-white p-8 rounded-3xl border border-slate-200/80 shadow-xs"
            >
              <div className="flex items-start justify-between flex-wrap gap-4 mb-4">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 mb-1">{rec.classroom.name}</h2>
                  <p className="text-slate-500 text-xs font-medium">Taught by {rec.classroom.teacherName}</p>
                  {rec.classroom.description && <p className="text-slate-600 text-sm mt-2 leading-relaxed">{rec.classroom.description}</p>}
                </div>
                <div className="text-center bg-emerald-50 border border-emerald-200 px-4 py-2 rounded-2xl">
                  <div className="text-3xl font-bold text-emerald-700">{rec.score}%</div>
                  <div className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">match</div>
                </div>
              </div>

              <div className="space-y-2 mb-6">
                {rec.reasons.filter((r) => r.applicable).map((r, ri) => (
                  <div key={ri} className={`text-xs font-medium flex items-center gap-2 ${r.passed ? 'text-emerald-700' : 'text-amber-700'}`}>
                    {r.passed ? <Check className="w-4 h-4 shrink-0 text-emerald-600" /> : <X className="w-4 h-4 shrink-0 text-amber-600" />}
                    <span>{r.detail}</span>
                  </div>
                ))}
                {rec.reasons.filter((r) => r.applicable).length === 0 && (
                  <p className="text-xs text-slate-500">This classroom has no specific admission criteria — open to everyone.</p>
                )}
              </div>

              <button
                onClick={() => requestJoin(rec.classroom.id)}
                disabled={requestedIds.has(rec.classroom.id) || requesting === rec.classroom.id}
                className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 px-6 rounded-2xl shadow-md border-b-4 border-emerald-700 active:translate-y-0.5 active:border-b-2 transition-all flex items-center gap-2 text-sm disabled:opacity-50"
              >
                <span>{requestedIds.has(rec.classroom.id) ? 'Request Sent ✓' : requesting === rec.classroom.id ? 'Sending...' : 'Request to Join'}</span>
                {!requestedIds.has(rec.classroom.id) && <ArrowRight className="w-4 h-4" />}
              </button>
            </motion.div>
          ))}

          {recommendations.length === 0 && (
            <div className="bg-white p-10 rounded-3xl border border-slate-200/80 text-center text-slate-500 text-sm">
              No classrooms exist yet. Check back once an educator creates one!
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RecommendationPage;

