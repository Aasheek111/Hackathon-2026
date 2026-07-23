import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Check, X, Loader2, ArrowRight } from 'lucide-react';
import Button from '../components/ui/Button';
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

/**
 * PLAN.md Part 5.4/5.5 - ranked, explainable classroom matches computed from
 * the student's own latest assessment. Nothing here is hardcoded copy; every
 * reason shown is one the backend actually checked.
 */
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
      <div className="min-h-screen bg-dark flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (message) {
    return (
      <div className="min-h-screen bg-dark flex items-center justify-center p-6">
        <div className="glass-strong max-w-md p-10 rounded-3xl text-center">
          <h1 className="text-2xl font-bold mb-3">Take the assessment first</h1>
          <p className="text-gray-400 mb-6">We recommend a classroom based on your actual assessment results.</p>
          <Button onClick={() => navigate('/consent')}>Start the assessment</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark pt-24 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 text-primary-light mb-3">
            <Sparkles className="w-5 h-5" />
            <span className="font-medium">Based on your learning profile</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-display font-bold">Recommended classrooms</h1>
        </div>

        <div className="space-y-6">
          {recommendations.map((rec, i) => (
            <motion.div
              key={rec.classroom.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="glass-strong p-8 rounded-3xl"
            >
              <div className="flex items-start justify-between flex-wrap gap-4 mb-4">
                <div>
                  <h2 className="text-2xl font-bold mb-1">{rec.classroom.name}</h2>
                  <p className="text-gray-400 text-sm">Taught by {rec.classroom.teacherName}</p>
                  {rec.classroom.description && <p className="text-gray-400 mt-2">{rec.classroom.description}</p>}
                </div>
                <div className="text-center">
                  <div className="text-4xl font-bold text-primary-light">{rec.score}%</div>
                  <div className="text-xs text-gray-500">match</div>
                </div>
              </div>

              <div className="space-y-2 mb-6">
                {rec.reasons.filter((r) => r.applicable).map((r, ri) => (
                  <div key={ri} className={`text-sm flex items-center gap-2 ${r.passed ? 'text-green-400' : 'text-amber-400'}`}>
                    {r.passed ? <Check className="w-4 h-4 shrink-0" /> : <X className="w-4 h-4 shrink-0" />}
                    {r.detail}
                  </div>
                ))}
                {rec.reasons.filter((r) => r.applicable).length === 0 && (
                  <p className="text-sm text-gray-500">This classroom has no specific admission criteria - open to everyone.</p>
                )}
              </div>

              <Button
                onClick={() => requestJoin(rec.classroom.id)}
                disabled={requestedIds.has(rec.classroom.id)}
                loading={requesting === rec.classroom.id}
                className="gap-2"
              >
                {requestedIds.has(rec.classroom.id) ? 'Request sent' : 'Request to join'}
                {!requestedIds.has(rec.classroom.id) && <ArrowRight className="w-4 h-4" />}
              </Button>
            </motion.div>
          ))}

          {recommendations.length === 0 && (
            <div className="glass p-10 rounded-3xl text-center text-gray-400">
              No classrooms exist yet. Check back once a teacher has created one.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RecommendationPage;
