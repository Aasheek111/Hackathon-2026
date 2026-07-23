import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { LayoutDashboard, BookOpen, TrendingUp, Zap, Award, Loader2 } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import DashboardShell, { NavItem } from '../components/DashboardShell';
import api from '../lib/api';

interface Attempt {
  id: string;
  scorePercent: number;
  preferredMode: string;
  completedAt: string;
}
interface Progress {
  xp: number;
  streakDays: number;
  badges: Array<{ id: string; name: string; earnedAt: string }>;
}

/** PLAN.md Part 6.2/6.4 - real retake history, not a single overwritten row. */
export const ProgressPage: React.FC = () => {
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.get('/assessments/history'), api.get('/progress')])
      .then(([hist, prog]) => {
        setAttempts(hist.data.attempts);
        setProgress(prog.data);
      })
      .finally(() => setLoading(false));
  }, []);

  const navItems: NavItem[] = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
    { icon: BookOpen, label: 'My Classroom', path: '/classroom' },
    { icon: TrendingUp, label: 'My Progress', path: '/progress', active: true }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-dark flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const chartData = [...attempts].reverse().map((a, i) => ({
    name: `Attempt ${i + 1}`,
    score: Math.round(a.scorePercent)
  }));

  const first = attempts[attempts.length - 1];
  const latest = attempts[0];
  const improvement = first && latest ? Math.round(latest.scorePercent - first.scorePercent) : 0;

  return (
    <DashboardShell navItems={navItems}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-5xl mx-auto space-y-8">
        <h1 className="text-3xl font-display font-bold">My Progress</h1>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'XP', value: progress?.xp ?? 0, icon: Zap, color: 'text-amber-400' },
            { label: 'Streak', value: `${progress?.streakDays ?? 0}d`, icon: Zap, color: 'text-primary' },
            { label: 'Badges', value: progress?.badges.length ?? 0, icon: Award, color: 'text-green-400' },
            { label: 'Assessments taken', value: attempts.length, icon: TrendingUp, color: 'text-blue-400' }
          ].map((s, i) => (
            <div key={i} className="glass p-5 rounded-2xl flex flex-col items-center text-center">
              <s.icon className={`w-6 h-6 mb-2 ${s.color}`} />
              <div className="text-2xl font-bold">{s.value}</div>
              <div className="text-xs text-gray-400">{s.label}</div>
            </div>
          ))}
        </div>

        {attempts.length >= 2 && (
          <div className="glass p-6 rounded-3xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold">Score trend</h2>
              <span className={`text-sm font-medium ${improvement >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {improvement >= 0 ? '+' : ''}{improvement}% since your first attempt
              </span>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                  <XAxis dataKey="name" stroke="rgba(255,255,255,0.5)" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis stroke="rgba(255,255,255,0.5)" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }} axisLine={false} tickLine={false} domain={[0, 100]} />
                  <Tooltip contentStyle={{ backgroundColor: '#111120', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }} itemStyle={{ color: '#fff' }} />
                  <Line type="monotone" dataKey="score" stroke="#6C3DE7" strokeWidth={3} dot={{ fill: '#F59E0B', r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        <div className="glass p-6 rounded-3xl">
          <h2 className="text-lg font-bold mb-4">Assessment history</h2>
          <div className="space-y-3">
            {attempts.map((a) => (
              <div key={a.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-white/5">
                <div>
                  <p className="text-sm font-medium">{new Date(a.completedAt).toLocaleString()}</p>
                  <p className="text-xs text-gray-400">Preferred mode: {a.preferredMode}</p>
                </div>
                <div className="text-lg font-bold text-primary-light">{Math.round(a.scorePercent)}%</div>
              </div>
            ))}
            {attempts.length === 0 && <p className="text-center text-gray-500 py-8">No assessments completed yet.</p>}
          </div>
        </div>

        {progress && progress.badges.length > 0 && (
          <div className="glass p-6 rounded-3xl">
            <h2 className="text-lg font-bold mb-4">Badges</h2>
            <div className="flex flex-wrap gap-3">
              {progress.badges.map((b) => (
                <div key={b.id} className="flex items-center gap-2 bg-accent/10 border border-accent/30 text-accent px-4 py-2 rounded-full text-sm">
                  <Award className="w-4 h-4" /> {b.name}
                </div>
              ))}
            </div>
          </div>
        )}
      </motion.div>
    </DashboardShell>
  );
};

export default ProgressPage;
