import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  BookOpen,
  TrendingUp,
  Zap,
  Award,
  Loader2,
  GraduationCap,
  Sparkles,
  Eye,
  RefreshCw,
  ArrowRight,
  Settings as SettingsIcon,
  Hand,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import DashboardShell, { NavItem } from "../components/DashboardShell";
import api from "../lib/api";
import { usePageAudio } from "../contexts/AudioNavigationContext";

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
interface UnitReport {
  id: string;
  title: string;
  hasCurriculum: boolean;
  mark: number | null;
  grade: string;
  finalPercent: number | null;
  kcAccuracy: number | null;
  focus: number | null;
  completed: boolean;
}
interface SubjectReport {
  id: string;
  name: string;
  mark: number | null;
  grade: string;
  units: UnitReport[];
}
interface Recommendation {
  type: string;
  title: string;
  detail: string;
  unitId?: string;
}
interface Report {
  enrolled: boolean;
  overall: number | null;
  overallGrade: string;
  subjects: SubjectReport[];
  pattern: {
    bestMode: string | null;
    preferredMode: string | null;
    attentionSpanScore: number | null;
    diagnosticScore: number | null;
  } | null;
  recommendations: Recommendation[];
}

const gradeColor = (grade: string): string => {
  switch (grade) {
    case "A":
      return "text-emerald-700 bg-emerald-50 border-emerald-200";
    case "B":
      return "text-sky-700 bg-sky-50 border-sky-200";
    case "C":
      return "text-amber-700 bg-amber-50 border-amber-200";
    case "D":
      return "text-orange-700 bg-orange-50 border-orange-200";
    case "F":
      return "text-rose-700 bg-rose-50 border-rose-200";
    default:
      return "text-slate-500 bg-slate-50 border-slate-200";
  }
};

export const ProgressPage: React.FC = () => {
  const navigate = useNavigate();
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get("/assessments/history"),
      api.get("/progress"),
      api.get("/progress/report"),
    ])
      .then(([hist, prog, rep]) => {
        setAttempts(hist.data.attempts);
        setProgress(prog.data);
        setReport(rep.data);
      })
      .finally(() => setLoading(false));
  }, []);

  usePageAudio("My Progress", () => {
    const parts: string[] = [];
    if (progress) parts.push(`${progress.xp} experience points, a ${progress.streakDays} day streak, and ${progress.badges?.length ?? 0} badges.`);
    if (report?.overall !== null && report?.overall !== undefined) parts.push(`Your overall mark is ${report.overall} percent, grade ${report.overallGrade}.`);
    if (report?.pattern?.bestMode) parts.push(`You learn best in ${report.pattern.bestMode} mode.`);
    return parts.length ? parts.join(" ") : "Your progress will appear here once you complete some work.";
  });

  const navItems: NavItem[] = [
    { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
    { icon: BookOpen, label: "My Classroom", path: "/classroom" },
    { icon: TrendingUp, label: "My Progress", path: "/progress", active: true },
    { icon: Hand, label: "Sign Practice", path: "/practice/signs" },
    { icon: SettingsIcon, label: "Settings", path: "/settings" },
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
    score: Math.round(a.scorePercent),
  }));

  const first = attempts[attempts.length - 1];
  const latest = attempts[0];
  const improvement =
    first && latest ? Math.round(latest.scorePercent - first.scorePercent) : 0;

  return (
    <DashboardShell navItems={navItems}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-5xl mx-auto space-y-8"
      >
        <div>
          <h1 className="text-3xl font-bold text-slate-900">My Progress</h1>
          <p className="text-slate-500 text-sm mt-1">
            Track your learning journey over time.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            {
              label: "XP Points",
              value: progress?.xp ?? 0,
              icon: Zap,
              color: "bg-amber-50 text-amber-600",
            },
            {
              label: "Streak",
              value: `${progress?.streakDays ?? 0} Days`,
              icon: Zap,
              color: "bg-emerald-50 text-emerald-600",
            },
            {
              label: "Badges Earned",
              value: progress?.badges.length ?? 0,
              icon: Award,
              color: "bg-purple-50 text-purple-600",
            },
            {
              label: "Assessments Taken",
              value: attempts.length,
              icon: TrendingUp,
              color: "bg-sky-50 text-sky-600",
            },
          ].map((s, i) => (
            <div
              key={i}
              className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col items-center text-center"
            >
              <div
                className={`w-10 h-10 ${s.color} rounded-2xl flex items-center justify-center mb-2 font-bold`}
              >
                <s.icon className="w-5 h-5" />
              </div>
              <div className="text-2xl font-bold text-slate-900 mb-0.5">
                {s.value}
              </div>
              <div className="text-xs text-slate-500 font-medium">
                {s.label}
              </div>
            </div>
          ))}
        </div>

        {/* Report card - consolidated marks from exams, lesson checks, focus */}
        {report?.enrolled && report.subjects.length > 0 && (
          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-emerald-600" /> Report
                Card
              </h2>
              {report.overall !== null && (
                <div
                  className={`flex items-center gap-2 px-4 py-1.5 rounded-2xl border font-bold ${gradeColor(report.overallGrade)}`}
                >
                  <span className="text-2xl">{report.overallGrade}</span>
                  <span className="text-sm">{report.overall}%</span>
                </div>
              )}
            </div>
            <div className="space-y-3">
              {report.subjects.map((s) => (
                <div
                  key={s.id}
                  className="rounded-2xl border border-slate-100 overflow-hidden"
                >
                  <div className="flex items-center justify-between px-4 py-3 bg-[#FAF9F5]">
                    <span className="font-bold text-slate-900 text-sm">
                      {s.name}
                    </span>
                    <span
                      className={`text-xs font-bold px-3 py-1 rounded-full border ${gradeColor(s.grade)}`}
                    >
                      {s.mark === null
                        ? "No marks yet"
                        : `${s.grade} · ${s.mark}%`}
                    </span>
                  </div>
                  <div className="divide-y divide-slate-50">
                    {s.units.map((u) => (
                      <div
                        key={u.id}
                        className="flex items-center justify-between px-4 py-2.5 text-xs"
                      >
                        <span className="text-slate-700 font-medium">
                          {u.title}
                        </span>
                        <div className="flex items-center gap-3 text-slate-500">
                          {u.finalPercent !== null && (
                            <span title="Final exam">
                              Exam {u.finalPercent}%
                            </span>
                          )}
                          {u.focus !== null && (
                            <span
                              className="flex items-center gap-1"
                              title="Focus"
                            >
                              <Eye className="w-3 h-3" />
                              {u.focus}%
                            </span>
                          )}
                          <span
                            className={`font-bold px-2 py-0.5 rounded-full border ${gradeColor(u.grade)}`}
                          >
                            {u.mark === null ? "—" : `${u.grade} ${u.mark}%`}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Learning pattern + recommendations */}
        {report?.enrolled &&
          (report.recommendations.length > 0 || report.pattern?.bestMode) && (
            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2 mb-4">
                Recommended for you
              </h2>
              {report.pattern && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {report.pattern.bestMode && (
                    <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                      Learns best in {report.pattern.bestMode}
                    </span>
                  )}
                  {report.pattern.attentionSpanScore !== null && (
                    <span className="text-xs font-bold px-3 py-1 rounded-full bg-sky-50 text-sky-800 border border-sky-200">
                      Attention {report.pattern.attentionSpanScore}%
                    </span>
                  )}
                </div>
              )}
              <div className="space-y-2.5">
                {report.recommendations.map((r, i) => (
                  <button
                    key={i}
                    onClick={() =>
                      r.unitId &&
                      navigate(`/classroom/units/${r.unitId}/tutorial`)
                    }
                    disabled={!r.unitId}
                    className={`w-full text-left flex items-center gap-3 p-3.5 rounded-2xl border transition-all ${
                      r.unitId
                        ? "border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/40 cursor-pointer"
                        : "border-slate-100 bg-[#FAF9F5]"
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                        r.type === "revisit"
                          ? "bg-amber-100 text-amber-700"
                          : r.type === "continue"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-sky-100 text-sky-700"
                      }`}
                    >
                      {r.type === "revisit" ? (
                        <RefreshCw className="w-4 h-4" />
                      ) : r.type === "continue" ? (
                        <BookOpen className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-900">
                        {r.title}
                      </p>
                      <p className="text-xs text-slate-500">{r.detail}</p>
                    </div>
                    {r.unitId && (
                      <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

        {attempts.length >= 2 && (
          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-base font-bold text-slate-900">
                Score Trend
              </h2>
              <span
                className={`text-xs font-bold px-3 py-1 rounded-full ${improvement >= 0 ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-rose-50 text-rose-800 border border-rose-200"}`}
              >
                {improvement >= 0 ? "+" : ""}
                {improvement}% since first attempt
              </span>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={chartData}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
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
                  <Line
                    type="monotone"
                    dataKey="score"
                    stroke="#10B981"
                    strokeWidth={3}
                    dot={{ fill: "#F59E0B", r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
          <h2 className="text-base font-bold text-slate-900 mb-4">
            Assessment History
          </h2>
          <div className="space-y-3">
            {attempts.map((a) => (
              <div
                key={a.id}
                className="flex items-center justify-between p-3.5 rounded-2xl bg-[#FAF9F5] border border-slate-100"
              >
                <div>
                  <p className="text-xs font-bold text-slate-900">
                    {new Date(a.completedAt).toLocaleString()}
                  </p>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Preferred mode: {a.preferredMode}
                  </p>
                </div>
                <div className="text-base font-bold text-emerald-700">
                  {Math.round(a.scorePercent)}%
                </div>
              </div>
            ))}
            {attempts.length === 0 && (
              <p className="text-center text-slate-400 text-xs py-8">
                No assessments completed yet.
              </p>
            )}
          </div>
        </div>

        {progress && progress.badges.length > 0 && (
          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
            <h2 className="text-base font-bold text-slate-900 mb-4">
              Earned Badges
            </h2>
            <div className="flex flex-wrap gap-2.5">
              {progress.badges.map((b) => (
                <div
                  key={b.id}
                  className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-900 px-4 py-2 rounded-2xl text-xs font-bold"
                >
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
