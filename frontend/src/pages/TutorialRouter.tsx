import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AlertCircle, ArrowLeft, Loader2 } from 'lucide-react';
import Button from '../components/ui/Button';
import api from '../lib/api';
import TutorialPage from './TutorialPage';
import CurriculumPlayerPage from './CurriculumPlayerPage';

type Status = 'loading' | 'ready' | 'legacy' | 'generating' | 'failed';

interface GenerationJob {
  stage: string;
  progressPercent: number;
  errorMessage: string | null;
}

export const STAGE_LABELS: Record<string, string> = {
  QUEUED: 'Queued for generation…',
  EXTRACTING: 'Reading the document…',
  PLANNING: 'Organizing topics into lessons…',
  GENERATING_TEXT: 'Writing lessons…',
  GENERATING_VISUALS: 'Creating pictures…',
  GENERATING_AUDIO: 'Recording narration…',
  GENERATING_QUESTIONS: 'Preparing questions…',
  FINALIZING: 'Finishing up…'
};

/**
 * A unit routes to the new full-curriculum player once a TutorialCurriculum
 * exists for it; to the legacy lazy TutorialPage only if it never had a
 * generation job at all (a unit uploaded before this pipeline existed).
 *
 * Units WITH an in-flight job (the common case right after a teacher
 * uploads) get a real "still preparing" screen instead - previously this
 * fell through to the legacy path, which tries to generate synchronously
 * and times out after 60s once Gemini is under load. The whole point of the
 * background pipeline is that a student should never hit that wait.
 */
export const TutorialRouter: React.FC = () => {
  const { unitId } = useParams<{ unitId: string }>();
  const navigate = useNavigate();
  const [status, setStatus] = useState<Status>('loading');
  const [job, setJob] = useState<GenerationJob | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const check = async () => {
    try {
      await api.get(`/units/${unitId}/curriculum`);
      setStatus('ready');
      return;
    } catch {
      // no curriculum yet - fall through to check whether one is being built
    }
    try {
      const { data } = await api.get(`/units/${unitId}/generation-job`);
      if (!data.job) {
        setStatus('legacy');
      } else if (data.job.stage === 'FAILED') {
        setJob(data.job);
        setStatus('failed');
      } else {
        setJob(data.job);
        setStatus('generating');
      }
    } catch {
      setStatus('legacy');
    }
  };

  useEffect(() => {
    check();
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [unitId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (status !== 'generating') {
      if (pollRef.current) clearInterval(pollRef.current);
      return;
    }
    pollRef.current = setInterval(check, 4000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [status]); // eslint-disable-line react-hooks/exhaustive-deps

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-dark flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (status === 'ready') return <CurriculumPlayerPage />;
  if (status === 'legacy') return <TutorialPage />;

  if (status === 'generating') {
    const percent = job?.progressPercent ?? 0;
    const label = (job && STAGE_LABELS[job.stage]) || 'Preparing your lesson…';
    return (
      <div className="min-h-screen bg-dark flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-strong max-w-md w-full p-10 rounded-3xl text-center"
        >
          <Loader2 className="w-10 h-10 text-primary mx-auto mb-4 animate-spin" />
          <h1 className="text-xl font-bold mb-2">Your teacher's material isn't ready yet</h1>
          <p className="text-gray-400 mb-6">
            It's on the queue and being prepared in the background - this page will update on its own
            the moment it's ready. No need to wait here; feel free to come back later.
          </p>
          <div className="w-full h-2 bg-dark-card rounded-full overflow-hidden mb-3">
            <motion.div
              className="h-full bg-gradient-to-r from-primary to-primary-light"
              initial={false}
              animate={{ width: `${Math.max(percent, 4)}%` }}
              transition={{ type: 'spring', damping: 20 }}
            />
          </div>
          <p className="text-sm text-gray-500 mb-6">{label}</p>
          <Button variant="ghost" onClick={() => navigate('/classroom')} className="gap-2">
            <ArrowLeft className="w-4 h-4" /> Back to classroom
          </Button>
        </motion.div>
      </div>
    );
  }

  // status === 'failed'
  return (
    <div className="min-h-screen bg-dark flex items-center justify-center p-6">
      <div className="glass-strong max-w-md w-full p-10 rounded-3xl text-center">
        <AlertCircle className="w-10 h-10 text-amber-400 mx-auto mb-4" />
        <h1 className="text-xl font-bold mb-2">This unit's material couldn't be prepared</h1>
        <p className="text-gray-400 mb-6">{job?.errorMessage || 'Generation failed for an unknown reason.'}</p>
        <p className="text-sm text-gray-500 mb-6">Ask your teacher to try re-uploading the document.</p>
        <Button variant="ghost" onClick={() => navigate('/classroom')} className="gap-2">
          <ArrowLeft className="w-4 h-4" /> Back to classroom
        </Button>
      </div>
    </div>
  );
};

export default TutorialRouter;
