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
      <div className="min-h-screen bg-[#FAF9F5] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
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
        <div>
          <h1 className="text-3xl font-bold text-slate-900">My Progress</h1>
          <p className="text-slate-500 text-sm mt-1">Track your learning journey over time.</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'XP Points', value: progress?.xp ?? 0, icon: Zap, color: 'bg-amber-50 text-amber-600' },
            { label: 'Streak', value: `${progress?.streakDays ?? 0} Days`, icon: Zap, color: 'bg-emerald-50 text-emerald-600' },
            { label: 'Badges Earned', value: progress?.badges.length ?? 0, icon: Award, color: 'bg-purple-50 text-purple-600' },
            { label: 'Assessments Taken', value: attempts.length, icon: TrendingUp, color: 'bg-sky-50 text-sky-600' }
          ].map((s, i) => (
            <div key={i} className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col items-center text-center">
              <div className={`w-10 h-10 ${s.color} rounded-2xl flex items-center justify-center mb-2 font-bold`}>
                <s.icon className="w-5 h-5" />
              </div>
              <div className="text-2xl font-bold text-slate-900 mb-0.5">{s.value}</div>
              <div className="text-xs text-slate-500 font-medium">{s.label}</div>
            </div>
          ))}
        </div>

        {attempts.length >= 2 && (
          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-base font-bold text-slate-900">Score Trend</h2>
              <span className={`text-xs font-bold px-3 py-1 rounded-full ${improvement >= 0 ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'}`}>
                {improvement >= 0 ? '+' : ''}{improvement}% since first attempt
              </span>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                  <XAxis dataKey="name" stroke="#94A3B8" tick={{ fill: '#64748B', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis stroke="#94A3B8" tick={{ fill: '#64748B', fontSize: 12 }} axisLine={false} tickLine={false} domain={[0, 100]} />
                  <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '16px', color: '#0F172A' }} />
                  <Line type="monotone" dataKey="score" stroke="#10B981" strokeWidth={3} dot={{ fill: '#F59E0B', r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
          <h2 className="text-base font-bold text-slate-900 mb-4">Assessment History</h2>
          <div className="space-y-3">
            {attempts.map((a) => (
              <div key={a.id} className="flex items-center justify-between p-3.5 rounded-2xl bg-[#FAF9F5] border border-slate-100">
                <div>
                  <p className="text-xs font-bold text-slate-900">{new Date(a.completedAt).toLocaleString()}</p>
                  <p className="text-[11px] text-slate-500 font-medium">Preferred mode: {a.preferredMode}</p>
                </div>
                <div className="text-base font-bold text-emerald-700">{Math.round(a.scorePercent)}%</div>
              </div>
            ))}
            {attempts.length === 0 && <p className="text-center text-slate-400 text-xs py-8">No assessments completed yet.</p>}
          </div>
        </div>

        {progress && progress.badges.length > 0 && (
          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
            <h2 className="text-base font-bold text-slate-900 mb-4">Earned Badges</h2>
            <div className="flex flex-wrap gap-2.5">
              {progress.badges.map((b) => (
                <div key={b.id} className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-900 px-4 py-2 rounded-2xl text-xs font-bold">
                  <Award className="w-4 h-4 text-amber-600" /> {b.name}
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

