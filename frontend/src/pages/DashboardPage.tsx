import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import {
  LayoutDashboard,
  Play,
  BookOpen,
  Gamepad2,
  Volume2,
  Image as ImageIcon,
  Sparkles,
  TrendingUp,
  Zap,
  Award,
  Loader2,
  ArrowRight,
  Settings as SettingsIcon,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import DashboardShell, { NavItem } from "../components/DashboardShell";
import api from "../lib/api";

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
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [showPaymentSuccess, setShowPaymentSuccess] = useState(
    searchParams.get("payment") === "success",
  );

  const [history, setHistory] = useState<Attempt[]>([]);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [enrolment, setEnrolment] = useState<Enrolment | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    if (showPaymentSuccess) {
      // Remove the query param from URL cleanly
      setSearchParams({}, { replace: true });
      const timer = setTimeout(() => setShowPaymentSuccess(false), 6000);
      return () => clearTimeout(timer);
    }
  }, [showPaymentSuccess, setSearchParams]);

  useEffect(() => {
    const load = () => {
      setLoadError(false);
      Promise.all([
        api.get("/assessments/history"),
        api.get("/progress"),
        api.get("/classrooms/mine/enrolment"),
      ])
        .then(([hist, prog, enr]) => {
          setHistory(hist.data.attempts);
          setProgress(prog.data);
          setEnrolment(enr.data.enrolment);
        })
        .catch(() => setLoadError(true))
        .finally(() => setLoading(false));
    };
    load();
    window.addEventListener("focus", load);
    return () => window.removeEventListener("focus", load);
  }, []);

  const navItems: NavItem[] = [
    {
      icon: LayoutDashboard,
      label: "Dashboard",
      path: "/dashboard",
      active: true,
    },
    { icon: Play, label: "Adaptive Quiz", path: "/consent" },
    { icon: BookOpen, label: "My Classroom", path: "/classroom" },
    { icon: TrendingUp, label: "My Progress", path: "/progress" },
    { icon: Gamepad2, label: "AR Game", path: "/ar-game" },
  ];

  const latest = history[0];
  const chartData = [...history]
    .slice(0, 7)
    .reverse()
    .map((a, i) => ({
      name: `#${i + 1}`,
      engagement: Math.round(
        (a.textEngagement + a.audioEngagement + a.visualEngagement) / 3,
      ),
    }));

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF9F5] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <DashboardShell navItems={navItems}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-6xl mx-auto space-y-8"
      >
        {showPaymentSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-2xl text-sm font-medium flex items-center justify-between"
          >
            <span>
              <strong>eSewa Payment Successful!</strong> Your subscription is
              now active. Enjoy your full learning dashboard!
            </span>
            <button
              onClick={() => setShowPaymentSuccess(false)}
              className="text-emerald-600 hover:text-emerald-800 font-bold text-lg leading-none cursor-pointer ml-4"
            >
              ×
            </button>
          </motion.div>
        )}

        {loadError && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-2xl text-sm font-medium">
            Couldn't load your latest data — check your connection and reload
            the page.
          </div>
        )}

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">
              Welcome back, {user?.name?.split(" ")[0] || "Learner"}!
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              {new Date().toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
          {enrolment ? (
            <Link
              to="/classroom"
              className="inline-flex items-center space-x-2 bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-2 rounded-full text-xs font-bold w-max hover:bg-emerald-100"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>In {enrolment.classroom.name}</span>
            </Link>
          ) : (
            <Link
              to="/recommendation"
              className="inline-flex items-center space-x-2 bg-amber-50 border border-amber-200 text-amber-800 px-4 py-2 rounded-full text-xs font-bold w-max hover:bg-amber-100"
            >
              <span>Find your classroom →</span>
            </Link>
          )}
        </div>

        {latest ? (
          <div className="bg-white p-8 rounded-3xl border border-slate-200/80 shadow-xs">
            <h2 className="text-lg font-bold text-slate-900 mb-6 flex items-center">
              Your Learning Profile
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                {
                  mode: "Visual",
                  icon: ImageIcon,
                  score: Math.round(latest.visualEngagement),
                  barColor: "bg-emerald-500",
                  key: "VISUAL",
                },
                {
                  mode: "Audio",
                  icon: Volume2,
                  score: Math.round(latest.audioEngagement),
                  barColor: "bg-sky-500",
                  key: "AUDIO",
                },
                {
                  mode: "Text",
                  icon: BookOpen,
                  score: Math.round(latest.textEngagement),
                  barColor: "bg-amber-500",
                  key: "TEXT",
                },
              ].map((item, i) => (
                <div
                  key={i}
                  className={`p-5 rounded-2xl border ${latest.preferredMode === item.key ? "bg-emerald-50/50 border-emerald-300" : "bg-[#FAF9F5] border-slate-200/80"}`}
                >
                  <div className="flex justify-between items-center mb-3">
                    <span className="flex items-center text-sm font-bold text-slate-800">
                      <item.icon className="w-4 h-4 mr-2 text-slate-500" />
                      {item.mode}
                    </span>
                    {latest.preferredMode === item.key && (
                      <span className="text-[11px] bg-emerald-100 text-emerald-900 px-2.5 py-0.5 rounded-full font-bold border border-emerald-200">
                        Preferred
                      </span>
                    )}
                  </div>
                  <div className="text-2xl font-bold text-slate-900 mb-2">
                    {item.score}%
                  </div>
                  <div className="h-2 w-full bg-slate-200/70 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${item.barColor} rounded-full`}
                      style={{ width: `${item.score}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-white p-8 rounded-3xl border border-slate-200/80 text-center shadow-xs">
            <p className="text-slate-600 text-sm mb-4 font-medium">
              Take the adaptive assessment to build your learning profile.
            </p>
            <Link
              to="/consent"
              className="inline-flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm px-6 py-3 rounded-2xl shadow-sm border-b-4 border-emerald-700 active:translate-y-0.5 active:border-b-2 transition-all"
            >
              <span>Start Assessment</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            {
              label: "XP",
              value: progress?.xp ?? 0,
              icon: Zap,
              color: "text-amber-500 bg-amber-50",
            },
            {
              label: "Assessments",
              value: history.length,
              icon: BookOpen,
              color: "text-sky-600 bg-sky-50",
            },
            {
              label: "Streak",
              value: `${progress?.streakDays ?? 0} Days`,
              icon: TrendingUp,
              color: "text-emerald-600 bg-emerald-50",
            },
            {
              label: "Badges",
              value: progress?.badges.length ?? 0,
              icon: Award,
              color: "text-purple-600 bg-purple-50",
            },
          ].map((stat, i) => (
            <div
              key={i}
              className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col items-center justify-center text-center"
            >
              <div
                className={`w-10 h-10 ${stat.color} rounded-2xl flex items-center justify-center mb-2 font-bold`}
              >
                <stat.icon className="w-5 h-5" />
              </div>
              <div className="text-2xl font-bold text-slate-900 mb-0.5">
                {stat.value}
              </div>
              <div className="text-xs text-slate-500 font-medium">
                {stat.label}
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-base font-bold text-slate-900">
                Engagement across recent attempts
              </h2>
            </div>
            <div className="h-64 w-full">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={chartData}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient
                        id="colorEngagement"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="#10B981"
                          stopOpacity={0.4}
                        />
                        <stop
                          offset="95%"
                          stopColor="#10B981"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#F1F5F9"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="name"
                      stroke="#94A3B8"
                      tick={{ fill: "#64748B", fontSize: 12 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      stroke="#94A3B8"
                      tick={{ fill: "#64748B", fontSize: 12 }}
                      axisLine={false}
                      tickLine={false}
                      domain={[0, 100]}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#FFFFFF",
                        border: "1px solid #E2E8F0",
                        borderRadius: "16px",
                        color: "#0F172A",
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="engagement"
                      stroke="#10B981"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#colorEngagement)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                  No attempts yet
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4">
              <Link to="/consent" className="block">
                <div className="bg-emerald-500 hover:bg-emerald-600 p-6 rounded-3xl text-white shadow-md border-b-4 border-emerald-700 transition-all">
                  <Play className="w-7 h-7 mb-3 fill-white" />
                  <h3 className="text-xl font-bold mb-0.5">Take Quiz</h3>
                  <p className="text-emerald-100 text-xs">
                    Start an adaptive quiz session
                  </p>
                </div>
              </Link>

              <Link to="/ar-game" className="block">
                <div className="bg-purple-500 hover:bg-purple-600 p-6 rounded-3xl text-white shadow-md border-b-4 border-purple-700 transition-all">
                  <Gamepad2 className="w-7 h-7 mb-3" />
                  <h3 className="text-xl font-bold mb-0.5">AR 3D Game</h3>
                  <p className="text-purple-100 text-xs">
                    Interactive 3D balloon popped game
                  </p>
                </div>
              </Link>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
              <h3 className="font-bold text-slate-900 text-sm mb-4">
                Recent Assessments
              </h3>
              <div className="space-y-3">
                {history.slice(0, 3).map((a) => (
                  <div
                    key={a.id}
                    className="flex items-center justify-between p-3 rounded-2xl bg-[#FAF9F5] border border-slate-100"
                  >
                    <div>
                      <p className="font-bold text-xs text-slate-800">
                        {new Date(a.completedAt).toLocaleDateString()}
                      </p>
                      <p className="text-[11px] text-slate-500 font-medium">
                        {a.preferredMode}
                      </p>
                    </div>
                    <div className="text-sm font-bold text-emerald-700">
                      {Math.round(a.scorePercent)}%
                    </div>
                  </div>
                ))}
                {history.length === 0 && (
                  <p className="text-xs text-slate-400">
                    No sessions completed yet.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </DashboardShell>
  );
};

export default DashboardPage;
