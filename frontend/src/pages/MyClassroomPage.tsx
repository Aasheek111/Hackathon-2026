import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LayoutDashboard, BookOpen, TrendingUp, Loader2, Lock, PlayCircle } from 'lucide-react';
import DashboardShell, { NavItem } from '../components/DashboardShell';
import api from '../lib/api';

interface Unit {
  id: string;
  title: string;
  order: number;
  indexStatus: string;
}
interface Subject {
  id: string;
  name: string;
  units: Unit[];
}
interface Enrolment {
  classroom: {
    id: string;
    name: string;
    description: string | null;
    teacher: { name: string };
    subjects: Subject[];
  };
}

export const MyClassroomPage: React.FC = () => {
  const navigate = useNavigate();
  const [enrolment, setEnrolment] = useState<Enrolment | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = () => {
      api
        .get('/classrooms/mine/enrolment')
        .then(({ data }) => setEnrolment(data.enrolment))
        .finally(() => setLoading(false));
    };
    load();
    // Enrolment happens from the teacher's session, with no way to push here -
    // pick it up when the student returns to this tab instead of requiring a
    // manual reload.
    window.addEventListener('focus', load);
    return () => window.removeEventListener('focus', load);
  }, []);

  const navItems: NavItem[] = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
    { icon: BookOpen, label: 'My Classroom', path: '/classroom', active: true },
    { icon: TrendingUp, label: 'My Progress', path: '/progress' }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-dark flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!enrolment) {
    return (
      <DashboardShell navItems={navItems}>
        <div className="max-w-2xl mx-auto glass-strong p-10 rounded-3xl text-center mt-12">
          <h1 className="text-2xl font-bold mb-3">You are not in a classroom yet</h1>
          <p className="text-gray-400 mb-6">
            Complete the assessment to get a personalized classroom recommendation.
          </p>
          <button onClick={() => navigate('/recommendation')} className="text-primary-light font-medium hover:text-white">
            View recommendations →
          </button>
        </div>
      </DashboardShell>
    );
  }

  const { classroom } = enrolment;

  return (
    <DashboardShell navItems={navItems}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-5xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-display font-bold">{classroom.name}</h1>
          <p className="text-gray-400">Taught by {classroom.teacher.name}</p>
        </div>

        {classroom.subjects.map((subject) => (
          <div key={subject.id} className="glass p-6 rounded-3xl">
            <h2 className="text-xl font-bold mb-4">{subject.name}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {subject.units.map((unit) => {
                const ready = unit.indexStatus === 'READY';
                return (
                  <button
                    key={unit.id}
                    disabled={!ready}
                    onClick={() => navigate(`/classroom/units/${unit.id}/tutorial`)}
                    className={`text-left p-5 rounded-2xl border transition-all flex items-center justify-between ${
                      ready
                        ? 'border-white/10 hover:border-primary bg-dark/50 cursor-pointer'
                        : 'border-white/5 bg-dark/20 opacity-60 cursor-not-allowed'
                    }`}
                  >
                    <div>
                      <p className="font-medium">{unit.title}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {ready ? 'Ready' : unit.indexStatus === 'PROCESSING' ? 'Being processed…' : 'Not available yet'}
                      </p>
                    </div>
                    {ready ? <PlayCircle className="w-6 h-6 text-primary shrink-0" /> : <Lock className="w-5 h-5 text-gray-600 shrink-0" />}
                  </button>
                );
              })}
              {subject.units.length === 0 && <p className="text-gray-500 text-sm">No units yet.</p>}
            </div>
          </div>
        ))}

        {classroom.subjects.length === 0 && (
          <div className="glass p-10 rounded-3xl text-center text-gray-400">
            Your teacher hasn&apos;t added any subjects yet.
          </div>
        )}
      </motion.div>
    </DashboardShell>
  );
};

export default MyClassroomPage;
