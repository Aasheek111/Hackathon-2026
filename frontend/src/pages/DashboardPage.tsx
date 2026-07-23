import React from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  LayoutDashboard, Play, BarChart2, Gamepad2, Settings, LogOut, 
  BookOpen, Volume2, Image as ImageIcon, Sparkles, TrendingUp, Calendar, Zap
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

type LearningMode = 'TEXT' | 'AUDIO' | 'VISUAL';

type QuizSummary = {
  score: number;
  total: number;
  profile: Record<LearningMode, number>;
  recommended: LearningMode;
  completedAt: string;
  sessionMode: LearningMode;
};

const SUMMARY_STORAGE_KEY = 'neurolearn:lastQuizSummary';

const defaultProfile: Record<LearningMode, number> = {
  TEXT: 0,
  AUDIO: 0,
  VISUAL: 0
};

const modeMeta = {
  VISUAL: { mode: 'Visual', icon: ImageIcon, color: 'bg-green-500' },
  AUDIO: { mode: 'Audio', icon: Volume2, color: 'bg-blue-500' },
  TEXT: { mode: 'Text', icon: BookOpen, color: 'bg-amber-500' }
};

export const DashboardPage: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const lastQuiz = React.useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem(SUMMARY_STORAGE_KEY) || 'null') as QuizSummary | null;
    } catch {
      return null;
    }
  }, []);

  const rawProfile = lastQuiz?.profile as Record<string, number> | undefined;
  const profile: Record<LearningMode, number> = {
    TEXT: rawProfile?.TEXT ?? rawProfile?.text ?? defaultProfile.TEXT,
    AUDIO: rawProfile?.AUDIO ?? rawProfile?.audio ?? defaultProfile.AUDIO,
    VISUAL: rawProfile?.VISUAL ?? rawProfile?.visual ?? defaultProfile.VISUAL
  };
  const recommendedMode = lastQuiz?.recommended ?? 'VISUAL';
  const averageEngagement = Math.round(
    (profile.TEXT + profile.AUDIO + profile.VISUAL) /
    Math.max(1, [profile.TEXT, profile.AUDIO, profile.VISUAL].filter(Boolean).length)
  );
  const quizPercent = lastQuiz ? Math.round((lastQuiz.score / Math.max(1, lastQuiz.total)) * 100) : 0;
  const chartData = [
    { name: 'Text', engagement: profile.TEXT },
    { name: 'Audio', engagement: profile.AUDIO },
    { name: 'Visual', engagement: profile.VISUAL }
  ];
  const recentSessions = lastQuiz ? [{
    subject: 'Adaptive Quiz',
    score: `${quizPercent}%`,
    mode: modeMeta[lastQuiz.sessionMode].mode,
    time: new Date(lastQuiz.completedAt).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
  }] : [];

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard', active: true },
    { icon: Play, label: 'Adaptive Quiz', path: '/consent', active: false },
    { icon: Gamepad2, label: 'AR Game', path: '/ar-game', active: false },
    { icon: BarChart2, label: 'Admin Panel', path: '/admin', active: false },
  ];

  return (
    <div className="min-h-screen bg-dark flex">
      {/* Sidebar */}
      <aside className="w-64 glass border-r border-white/5 flex flex-col hidden md:flex sticky top-0 h-screen">
        <div className="p-6">
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
                  ? 'bg-primary/20 text-white border border-primary/30' 
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <item.icon className={`w-5 h-5 ${item.active ? 'text-primary' : ''}`} />
              <span className="font-medium">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-white/10">
          <div className="flex items-center space-x-3 mb-4 px-2">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-bold">
              {user?.name?.charAt(0) || 'U'}
            </div>
            <div>
              <p className="font-medium text-sm text-white truncate max-w-[120px]">{user?.name || 'User'}</p>
              <p className="text-xs text-gray-500 truncate max-w-[120px]">{user?.email || 'user@example.com'}</p>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="w-full flex items-center space-x-3 px-4 py-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 md:p-10 overflow-y-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-6xl mx-auto space-y-8">
          
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-display font-bold">Welcome back, {user?.name?.split(' ')[0] || 'Learner'}!</h1>
              <p className="text-gray-400">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
            </div>
            <div className="inline-flex items-center space-x-2 bg-green-500/10 border border-green-500/20 text-green-400 px-4 py-2 rounded-full text-sm font-medium w-max">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span>Active Subscription</span>
            </div>
          </div>

          {/* Learning Profile Overview */}
          <div className="glass p-6 rounded-3xl">
            <h2 className="text-lg font-bold mb-6 flex items-center"><Sparkles className="w-5 h-5 mr-2 text-accent" /> Your Learning Profile</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { ...modeMeta.VISUAL, score: profile.VISUAL, isPref: recommendedMode === 'VISUAL' },
                { ...modeMeta.AUDIO, score: profile.AUDIO, isPref: recommendedMode === 'AUDIO' },
                { ...modeMeta.TEXT, score: profile.TEXT, isPref: recommendedMode === 'TEXT' }
              ].map((item, i) => (
                <div key={i} className={`p-4 rounded-2xl border ${item.isPref ? 'bg-white/5 border-primary/30' : 'bg-dark/50 border-white/5'}`}>
                  <div className="flex justify-between items-center mb-3">
                    <span className="flex items-center text-sm font-medium">
                      <item.icon className="w-4 h-4 mr-2" />
                      {item.mode}
                    </span>
                    {item.isPref && <span className="text-xs bg-primary/20 text-primary-light px-2 py-1 rounded">Preferred</span>}
                  </div>
                  <div className="text-2xl font-bold mb-2">{item.score}%</div>
                  <div className="h-2 w-full bg-dark rounded-full overflow-hidden">
                    <div className={`h-full ${item.color} rounded-full`} style={{ width: `${item.score}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Quiz Score', value: lastQuiz ? `${lastQuiz.score}/${lastQuiz.total}` : '0/0', icon: TrendingUp, color: 'text-green-400' },
              { label: 'Sessions', value: lastQuiz ? '1' : '0', icon: BookOpen, color: 'text-blue-400' },
              { label: 'Avg Focus', value: `${averageEngagement}%`, icon: Zap, color: 'text-amber-400' },
              { label: 'Days Left', value: '84', icon: Calendar, color: 'text-primary' },
            ].map((stat, i) => (
              <div key={i} className="glass p-5 rounded-2xl flex flex-col items-center justify-center text-center">
                <stat.icon className={`w-6 h-6 mb-2 ${stat.color}`} />
                <div className="text-2xl font-bold mb-1">{stat.value}</div>
                <div className="text-xs text-gray-400">{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Main Layout Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Chart Area */}
            <div className="lg:col-span-2 glass p-6 rounded-3xl">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold">Weekly Engagement</h2>
                <select className="bg-dark border border-white/10 rounded-lg px-3 py-1 text-sm outline-none">
                  <option>Last 7 Days</option>
                  <option>Last 30 Days</option>
                </select>
              </div>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorEngagement" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6C3DE7" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#6C3DE7" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                    <XAxis dataKey="name" stroke="rgba(255,255,255,0.5)" tick={{fill: 'rgba(255,255,255,0.5)', fontSize: 12}} axisLine={false} tickLine={false} />
                    <YAxis stroke="rgba(255,255,255,0.5)" tick={{fill: 'rgba(255,255,255,0.5)', fontSize: 12}} axisLine={false} tickLine={false} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#111120', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                      itemStyle={{ color: '#fff' }}
                    />
                    <Area type="monotone" dataKey="engagement" stroke="#6C3DE7" strokeWidth={3} fillOpacity={1} fill="url(#colorEngagement)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Quick Actions & Recent */}
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
                <h3 className="font-bold mb-4">Recent Sessions</h3>
                <div className="space-y-4">
                  {(recentSessions.length ? recentSessions : [
                    { subject: 'No quiz completed yet', score: '0%', mode: 'Start a quiz', time: 'Today' }
                  ]).map((session, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-colors">
                      <div>
                        <p className="font-medium text-sm">{session.subject}</p>
                        <p className="text-xs text-gray-400">{session.time} • {session.mode}</p>
                      </div>
                      <div className="text-sm font-bold text-primary">{session.score}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
};

export default DashboardPage;
