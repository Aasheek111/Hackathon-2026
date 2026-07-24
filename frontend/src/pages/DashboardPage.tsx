import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  LayoutDashboard, Play, BookOpen, Gamepad2,
  Volume2, Image as ImageIcon, Sparkles, TrendingUp, Zap, Award, Loader2, ArrowRight, Shield
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import DashboardShell, { NavItem } from '../components/DashboardShell';
import api from '../lib/api';

interface Attempt {
  id: string;
  currentMode: string;
  score: number;
  completedAt: string;
}

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [profileData, setProfileData] = useState<any>(null);
  const [recentSessions, setRecentSessions] = useState<Attempt[]>([]);
  const [demoResult, setDemoResult] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        const [profileRes, analyticsRes] = await Promise.allSettled([
          api.get('/dashboard/profile'),
          api.get('/dashboard/analytics')
        ]);

        if (profileRes.status === 'fulfilled') {
          setProfileData(profileRes.value.data);
          if (profileRes.value.data.demoResult) {
            setDemoResult(profileRes.value.data.demoResult);
          }
        }

        if (analyticsRes.status === 'fulfilled') {
          if (analyticsRes.value.data.recentSessions) {
            setRecentSessions(analyticsRes.value.data.recentSessions);
          }
          if (analyticsRes.value.data.demoResult) {
            setDemoResult(analyticsRes.value.data.demoResult);
          }
        }
      } catch (err) {
        console.warn('Could not load dashboard remote data, using local state fallback', err);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  const navItems: NavItem[] = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard', active: true },
    { icon: Play, label: 'Adaptive Quiz', path: '/consent' },
    { icon: Gamepad2, label: 'AR Games Hub', path: '/ar-game' },
    ...(user?.role === 'ADMIN' ? [{ icon: Shield, label: 'Admin Panel', path: '/admin' }] : [])
  ];

  // Default engagement scores or demo result
  const visualEng = demoResult?.visualEngagement ?? 92;
  const audioEng = demoResult?.audioEngagement ?? 78;
  const textEng = demoResult?.textEngagement ?? 65;
  const preferredMode = demoResult?.preferredMode ?? 'VISUAL';

  const chartData = recentSessions.length > 0
    ? recentSessions.slice(0, 7).reverse().map((s, i) => ({
        name: `#${i + 1}`,
        score: s.score * 5
      }))
    : [
        { name: 'Mon', score: 65 },
        { name: 'Tue', score: 78 },
        { name: 'Wed', score: 72 },
        { name: 'Thu', score: 88 },
        { name: 'Fri', score: 95 }
      ];

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center text-white">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark flex">
      {/* Sidebar */}
      <aside className="w-64 glass border-r border-white/5 flex flex-col hidden md:flex sticky top-0 h-screen">
        <div className="p-6 border-b border-white/10">
          <Link to="/" className="flex items-center space-x-2">
            <span className="text-2xl">🧠</span>
            <span className="font-display font-bold text-xl tracking-tight gradient-text">NeuroLearn</span>
          </Link>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2">
          {navItems.map((item, i) => (
            <button
              key={i}
              onClick={() => navigate(item.path)}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${
                item.active
                  ? 'bg-primary/20 text-white border border-primary/30 font-bold'
                  : 'text-gray-400 hover:text-white hover:bg-white/5 font-medium'
              }`}
            >
              <item.icon className={`w-5 h-5 ${item.active ? 'text-primary' : ''}`} />
              <span className="text-sm">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-white/10">
          <div className="flex items-center space-x-3 mb-2 px-2">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-bold">
              {user?.name?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="overflow-hidden">
              <p className="font-bold text-sm text-white truncate max-w-[120px]">{user?.name || 'Learner'}</p>
              <p className="text-xs text-gray-400 truncate max-w-[120px]">{user?.email || ''}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 md:p-10 overflow-y-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-6xl mx-auto space-y-8">
          
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-display font-bold">Welcome back, {user?.name?.split(' ')[0] || 'Learner'}!</h1>
              <p className="text-gray-400 text-sm mt-1">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
            </div>
            <div className="inline-flex items-center space-x-2 bg-green-500/10 border border-green-500/20 text-green-400 px-4 py-2 rounded-full text-xs font-bold w-max">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span>Active Learning Session</span>
            </div>
          </div>

          {/* Learning Profile Overview */}
          <div className="glass p-6 rounded-3xl border border-white/10">
            <h2 className="text-lg font-bold mb-6 flex items-center">
              <Sparkles className="w-5 h-5 mr-2 text-accent" /> Your Learning Profile
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { mode: 'Visual', icon: ImageIcon, score: visualEng, color: 'bg-green-500', isPref: preferredMode === 'VISUAL' },
                { mode: 'Audio', icon: Volume2, score: audioEng, color: 'bg-blue-500', isPref: preferredMode === 'AUDIO' },
                { mode: 'Text', icon: BookOpen, score: textEng, color: 'bg-amber-500', isPref: preferredMode === 'TEXT' }
              ].map((item, i) => (
                <div key={i} className={`p-4 rounded-2xl border ${item.isPref ? 'bg-white/5 border-primary/40 shadow-lg' : 'bg-dark/50 border-white/5'}`}>
                  <div className="flex justify-between items-center mb-3">
                    <span className="flex items-center text-sm font-medium">
                      <item.icon className="w-4 h-4 mr-2" />
                      {item.mode} Mode
                    </span>
                    {item.isPref && <span className="text-xs bg-primary/30 text-primary-light px-2.5 py-0.5 rounded-full border border-primary/40 font-bold">Top Mode</span>}
                  </div>
                  <div className="text-2xl font-bold mb-2">{item.score}%</div>
                  <div className="h-2 w-full bg-dark rounded-full overflow-hidden">
                    <div className={`h-full ${item.color} rounded-full transition-all duration-500`} style={{ width: `${item.score}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Action Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Link to="/consent" className="block">
              <div className="bg-gradient-to-br from-primary to-primary-dark p-6 rounded-3xl border border-primary/30 relative overflow-hidden group hover:scale-[1.02] transition-all shadow-xl">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -z-10 group-hover:scale-150 transition-transform duration-500" />
                <Play className="w-8 h-8 mb-3 text-white fill-white" />
                <h3 className="text-xl font-bold mb-1">Take Adaptive Quiz</h3>
                <p className="text-white/80 text-xs">20 Questions with Real-Time Camera Eye Tracking</p>
              </div>
            </Link>

            <Link to="/ar-game" className="block">
              <div className="bg-gradient-to-br from-accent/90 to-amber-600 p-6 rounded-3xl border border-amber-500/30 relative overflow-hidden group hover:scale-[1.02] transition-all shadow-xl">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -z-10 group-hover:scale-150 transition-transform duration-500" />
                <Gamepad2 className="w-8 h-8 mb-3 text-white" />
                <h3 className="text-xl font-bold mb-1">AR Games Hub</h3>
                <p className="text-white/90 text-xs">🎈 Balloon Popper · 🚀 Rocket Shooter · 🧩 Memory Match</p>
              </div>
            </Link>
          </div>

          {/* Analytics Chart & Recent Sessions */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 glass p-6 rounded-3xl border border-white/10">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold">Recent Score Trends</h2>
              </div>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6C3DE7" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#6C3DE7" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" vertical={false} />
                    <XAxis dataKey="name" stroke="rgba(255,255,255,0.4)" tick={{fill: 'rgba(255,255,255,0.5)', fontSize: 12}} axisLine={false} tickLine={false} />
                    <YAxis stroke="rgba(255,255,255,0.4)" tick={{fill: 'rgba(255,255,255,0.5)', fontSize: 12}} axisLine={false} tickLine={false} domain={[0, 100]} />
                    <Tooltip contentStyle={{ backgroundColor: '#111120', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff' }} />
                    <Area type="monotone" dataKey="score" stroke="#6C3DE7" strokeWidth={3} fillOpacity={1} fill="url(#colorScore)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="glass p-6 rounded-3xl border border-white/10">
              <h3 className="font-bold mb-4">Quick Activities</h3>
              <div className="space-y-3">
                <button onClick={() => navigate('/ar-game')} className="w-full text-left p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 transition-all flex items-center justify-between">
                  <div>
                    <p className="font-bold text-sm text-white">🎈 3D Balloon Popper</p>
                    <p className="text-xs text-gray-400">Pop math &amp; science balloons</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-accent" />
                </button>

                <button onClick={() => navigate('/ar-game')} className="w-full text-left p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 transition-all flex items-center justify-between">
                  <div>
                    <p className="font-bold text-sm text-white">🚀 Space Rocket Shooter</p>
                    <p className="text-xs text-gray-400">Aim with mouse or finger cam</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-sky-400" />
                </button>

                <button onClick={() => navigate('/ar-game')} className="w-full text-left p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 transition-all flex items-center justify-between">
                  <div>
                    <p className="font-bold text-sm text-white">🧩 Memory Match Puzzle</p>
                    <p className="text-xs text-gray-400">Flip cards — match question to answer</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-indigo-400" />
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
};

export default DashboardPage;
