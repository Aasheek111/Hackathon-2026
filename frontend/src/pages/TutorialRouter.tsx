import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import api from '../lib/api';
import TutorialPage from './TutorialPage';
import CurriculumPlayerPage from './CurriculumPlayerPage';

/**
 * A unit routes to the new full-curriculum player once a TutorialCurriculum
 * exists for it (background-generated on upload - TODO.md Phase 1/3);
 * otherwise it falls back to the legacy lazy TEXT/AUDIO/VISUAL TutorialPage
 * so units generated before this pipeline keep working exactly as before.
 */
export const TutorialRouter: React.FC = () => {
  const { unitId } = useParams<{ unitId: string }>();
  const [hasCurriculum, setHasCurriculum] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .get(`/units/${unitId}/curriculum`)
      .then(() => {
        if (!cancelled) setHasCurriculum(true);
      })
      .catch(() => {
        if (!cancelled) setHasCurriculum(false);
      });
    return () => {
      cancelled = true;
    };
  }, [unitId]);

  if (hasCurriculum === null) {
    return (
      <div className="min-h-screen bg-dark flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return hasCurriculum ? <CurriculumPlayerPage /> : <TutorialPage />;
};

export default TutorialRouter;
