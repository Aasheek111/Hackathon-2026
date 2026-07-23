import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  LayoutDashboard, Play, BookOpen, Gamepad2, LogOut,
  Volume2, Image as ImageIcon, Sparkles, TrendingUp, Zap, Award, Loader2
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import DashboardShell, { NavItem } from '../components/DashboardShell';
import api from '../lib/api';

interface Attempt {
  id: string;
  textEngagement: number;
  audioEngagement: number;
  visualEngagement: number;
  preferredMode: string;
  scorePercent: number;
  completedAt: string;
}
interface Progress {
  xp: number;
  streakDays: number;
  badges: Array<{ name: string }>;
}
interface Enrolment {
  classroom: { id: string; name: string };
}

export const DashboardPage: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [history, setHistory] = useState<Attempt[]>([]);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [enrolment, setEnrolment] = useState<Enrolment | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/assessments/history'),
      api.get('/progress'),
      api.get('/classrooms/mine/enrolment')
    ])
      .then(([hist, prog, enr]) => {
        setHistory(hist.data.attempts);
        setProgress(prog.data);
        setEnrolment(enr.data.enrolment);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const navItems: NavItem[] = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard', active: true },
    { icon: Play, label: 'Adaptive Quiz', path: '/consent' },
    { icon: BookOpen, label: 'My Classroom', path: '/classroom' },
    { icon: TrendingUp, label: 'My Progress', path: '/progress' },
    { icon: Gamepad2, label: 'AR Game', path: '/ar-game' }
  ];

  const latest = history[0];
  const chartData = [...history].slice(0, 7).reverse().map((a, i) => ({
    name: `#${i + 1}`,
    engagement: Math.round((a.textEngagement + a.audioEngagement + a.visualEngagement) / 3)
  }));

  if (loading) {
    return (
      <div className="min-h-screen bg-dark flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <DashboardShell navItems={navItems}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-6xl mx-auto space-y-8">

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold">Welcome back, {user?.name?.split(' ')[0] || 'Learner'}!</h1>
            <p className="text-gray-400">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
          </div>
          {enrolment ? (
            <Link to="/classroom" className="inline-flex items-center space-x-2 bg-green-500/10 border border-green-500/20 text-green-400 px-4 py-2 rounded-full text-sm font-medium w-max hover:bg-green-500/20">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span>In {enrolment.classroom.name}</span>
            </Link>
          ) : (
            <Link to="/recommendation" className="inline-flex items-center space-x-2 bg-amber-500/10 border border-amber-500/20 text-amber-400 px-4 py-2 rounded-full text-sm font-medium w-max hover:bg-amber-500/20">
              <span>Find your classroom →</span>
            </Link>
          )}
        </div>

        {latest ? (
          <div className="glass p-6 rounded-3xl">
            <h2 className="text-lg font-bold mb-6 flex items-center"><Sparkles className="w-5 h-5 mr-2 text-accent" /> Your Learning Profile</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { mode: 'Visual', icon: ImageIcon, score: Math.round(latest.visualEngagement), color: 'bg-green-500', key: 'VISUAL' },
                { mode: 'Audio', icon: Volume2, score: Math.round(latest.audioEngagement), color: 'bg-blue-500', key: 'AUDIO' },
                { mode: 'Text', icon: BookOpen, score: Math.round(latest.textEngagement), color: 'bg-amber-500', key: 'TEXT' }
              ].map((item, i) => (
                <div key={i} className={`p-4 rounded-2xl border ${latest.preferredMode === item.key ? 'bg-white/5 border-primary/30' : 'bg-dark/50 border-white/5'}`}>
                  <div className="flex justify-between items-center mb-3">
                    <span className="flex items-center text-sm font-medium">
                      <item.icon className="w-4 h-4 mr-2" />
                      {item.mode}
                    </span>
                    {latest.preferredMode === item.key && <span className="text-xs bg-primary/20 text-primary-light px-2 py-1 rounded">Preferred</span>}
                  </div>
                  <div className="text-2xl font-bold mb-2">{item.score}%</div>
                  <div className="h-2 w-full bg-dark rounded-full overflow-hidden">
                    <div className={`h-full ${item.color} rounded-full`} style={{ width: `${item.score}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="glass p-8 rounded-3xl text-center">
            <p className="text-gray-400 mb-4">Take the adaptive assessment to build your learning profile.</p>
            <Link to="/consent" className="text-primary-light font-medium hover:text-white">Start now →</Link>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'XP', value: progress?.xp ?? 0, icon: Zap, color: 'text-amber-400' },
            { label: 'Assessments', value: history.length, icon: BookOpen, color: 'text-blue-400' },
            { label: 'Streak', value: `${progress?.streakDays ?? 0} Days`, icon: TrendingUp, color: 'text-primary' },
            { label: 'Badges', value: progress?.badges.length ?? 0, icon: Award, color: 'text-green-400' },
          ].map((stat, i) => (
            <div key={i} className="glass p-5 rounded-2xl flex flex-col items-center justify-center text-center">
              <stat.icon className={`w-6 h-6 mb-2 ${stat.color}`} />
              <div className="text-2xl font-bold mb-1">{stat.value}</div>
              <div className="text-xs text-gray-400">{stat.label}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 glass p-6 rounded-3xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold">Engagement across recent attempts</h2>
            </div>
            <div className="h-64 w-full">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorEngagement" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6C3DE7" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#6C3DE7" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                    <XAxis dataKey="name" stroke="rgba(255,255,255,0.5)" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis stroke="rgba(255,255,255,0.5)" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }} axisLine={false} tickLine={false} domain={[0, 100]} />
                    <Tooltip contentStyle={{ backgroundColor: '#111120', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }} itemStyle={{ color: '#fff' }} />
                    <Area type="monotone" dataKey="engagement" stroke="#6C3DE7" strokeWidth={3} fillOpacity={1} fill="url(#colorEngagement)" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-gray-500 text-sm">No attempts yet</div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4">
              <Link to="/consent" className="block">
                <div className="bg-gradient-to-br from-primary to-primary-dark p-6 rounded-3xl relative overflow-hidden group hover:scale-[1.02] transition-transform">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -z-10 group-hover:scale-150 transition-transform duration-500" />
                  <Play className="w-8 h-8 mb-3 text-white" />
                  <h3 className="text-xl font-bold mb-1">Take Quiz</h3>
                  <p className="text-white/70 text-sm">Start an adaptive session</p>
                </div>
              </Link>

              <Link to="/ar-game" className="block">
                <div className="bg-gradient-to-br from-accent/80 to-amber-600 p-6 rounded-3xl relative overflow-hidden group hover:scale-[1.02] transition-transform">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -z-10 group-hover:scale-150 transition-transform duration-500" />
                  <Gamepad2 className="w-8 h-8 mb-3 text-white" />
                  <h3 className="text-xl font-bold mb-1">AR 3D Game</h3>
                  <p className="text-white/90 text-sm">Interactive balloon popped game</p>
                </div>
              </Link>
            </div>

            <div className="glass p-6 rounded-3xl">
              <h3 className="font-bold mb-4">Recent Assessments</h3>
              <div className="space-y-4">
                {history.slice(0, 3).map((a) => (
                  <div key={a.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-colors">
                    <div>
                      <p className="font-medium text-sm">{new Date(a.completedAt).toLocaleDateString()}</p>
                      <p className="text-xs text-gray-400">{a.preferredMode}</p>
                    </div>
                    <div className="text-sm font-bold text-primary">{Math.round(a.scorePercent)}%</div>
                  </div>
                ))}
                {history.length === 0 && <p className="text-sm text-gray-500">No sessions yet.</p>}
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </DashboardShell>
  );
};

export default DashboardPage;
