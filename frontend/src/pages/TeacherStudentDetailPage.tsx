import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  LayoutDashboard,
  BarChart3,
  ArrowLeft,
  Loader2,
  AlertCircle,
  ChevronRight,
  Zap,
  Flame,
  Award,
  Check,
  Circle,
  Eye,
  Brain,
  BookOpen,
  Clock,
} from "lucide-react";
import DashboardShell, { NavItem } from "../components/DashboardShell";
import api from "../lib/api";
import { disabilityLabel } from "../data/disabilityProfiles";
import type { DisabilityType } from "../contexts/AuthContext";

/**
 * Everything a teacher needs about one student, nested:
 *   subject  ->  unit  ->  individual lessons
 *
 * Renders GET /api/analytics/students/:studentId, which builds the report
 * through the SAME buildStudentReport() the student's own /progress page
 * uses - so a teacher and learner never see different numbers for the same
 * work. Authorization is classroom ownership, enforced server-side.
 */

interface LessonRow {
  id: string;
  title: string;
  order: number;
  done: boolean;
}
interface UnitRow {
  id: string;
  title: string;
  hasCurriculum: boolean;
  mark: number | null;
  grade: string;
  finalPercent: number | null;
  kcAccuracy: number | null;
  focus: number | null;
  completed: boolean;
  totalLessons: number;
  lessonsDone: number;
  currentLessonOrder: number | null;
  lastActivityAt: string | null;
  preferredMode: string | null;
  knowledgeChecks: { correct: number; total: number };
  finalAttempt: { scoreCorrect: number; scoreTotal: number; completedAt: string | null } | null;
  lessons: LessonRow[];
}
interface SubjectRow {
  id: string;
  name: string;
  mark: number | null;
  grade: string;
  units: UnitRow[];
}
interface Attempt {
  id: string;
  scorePercent: number;
  scoreCorrect: number;
  scoreTotal: number;
  preferredMode: string;
  attentionSpanScore: number;
  adaptationCount: number;
  durationSeconds: number | null;
  completedAt: string;
}
interface StudentDetail {
  student: {
    id: string;
    name: string;
    email: string;
    disabilityType: DisabilityType | null;
    createdAt: string;
  };
  report: {
    enrolled: boolean;
    classroom?: { id: string; name: string };
    joinedAt?: string;
    overall: number | null;
    overallGrade?: string;
    subjects: SubjectRow[];
    pattern: {
      bestMode: string | null;
      preferredMode: string | null;
      attentionSpanScore: number | null;
      diagnosticScore: number | null;
    } | null;
    recommendations: Array<{ type: string; title: string; detail: string; unitId?: string }>;
  };
  progress: { xp: number; streakDays: number; badges: Array<{ name: string }> };
  attempts: Attempt[];
}

const gradeTone = (grade: string) => {
  if (grade.startsWith("A")) return "bg-emerald-50 text-emerald-800 border-emerald-200";
  if (grade.startsWith("B")) return "bg-sky-50 text-sky-800 border-sky-200";
  if (grade.startsWith("C")) return "bg-amber-50 text-amber-800 border-amber-200";
  if (grade === "—") return "bg-slate-100 text-slate-500 border-slate-200";
  return "bg-rose-50 text-rose-800 border-rose-200";
};

const GradeChip: React.FC<{ grade: string; mark: number | null }> = ({ grade, mark }) => (
  <span className={`text-xs font-bold px-2.5 py-1 rounded-full border shrink-0 ${gradeTone(grade)}`}>
    {mark === null ? "No data" : `${mark}% · ${grade}`}
  </span>
);

const Metric: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div>
    <dt className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</dt>
    <dd className="text-sm font-bold text-slate-800 mt-0.5">{value}</dd>
  </div>
);

const UnitPanel: React.FC<{ unit: UnitRow }> = ({ unit }) => {
  const [open, setOpen] = useState(false);
  const pct = unit.totalLessons > 0 ? Math.round((unit.lessonsDone / unit.totalLessons) * 100) : 0;

  return (
    <div className="border-t border-slate-100 first:border-t-0">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-[#FAF9F5] text-left transition-colors"
      >
        <ChevronRight
          className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${open ? "rotate-90" : ""}`}
          aria-hidden="true"
        />
        <span className="flex-1 min-w-0">
          <span className="block font-bold text-slate-800 text-sm truncate">{unit.title}</span>
          <span className="block text-xs text-slate-500 mt-0.5">
            {unit.hasCurriculum
              ? `${unit.lessonsDone}/${unit.totalLessons} lessons${unit.completed ? " · Completed" : ""}`
              : "No curriculum generated yet"}
          </span>
        </span>
        {unit.hasCurriculum && (
          <span className="hidden sm:block w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden shrink-0">
            <span className="block h-full bg-emerald-500" style={{ width: `${pct}%` }} />
          </span>
        )}
        <GradeChip grade={unit.grade} mark={unit.mark} />
      </button>

      {open && (
        <div className="px-5 pb-5 pt-1 bg-[#FAF9F5]/60">
          <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
            <Metric
              label="Final exam"
              value={
                unit.finalAttempt
                  ? `${unit.finalAttempt.scoreCorrect}/${unit.finalAttempt.scoreTotal} (${unit.finalPercent}%)`
                  : "Not taken"
              }
            />
            <Metric
              label="Lesson checks"
              value={
                unit.knowledgeChecks.total > 0
                  ? `${unit.knowledgeChecks.correct}/${unit.knowledgeChecks.total} (${unit.kcAccuracy}%)`
                  : "None answered"
              }
            />
            <Metric label="Focus" value={unit.focus === null ? "No camera data" : `${unit.focus}%`} />
            <Metric label="Mode used" value={unit.preferredMode || "—"} />
          </dl>

          {unit.lessons.length > 0 ? (
            <>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                Lessons
              </p>
              <ol className="space-y-1 list-none p-0">
                {unit.lessons.map((lesson) => {
                  const isCurrent =
                    !unit.completed && lesson.order === unit.currentLessonOrder;
                  return (
                    <li
                      key={lesson.id}
                      className={`flex items-center gap-2 text-xs rounded-lg px-2 py-1.5 ${
                        isCurrent ? "bg-amber-50 border border-amber-200" : ""
                      }`}
                    >
                      {lesson.done ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" aria-hidden="true" />
                      ) : (
                        <Circle className="w-3.5 h-3.5 text-slate-300 shrink-0" aria-hidden="true" />
                      )}
                      <span className={lesson.done ? "text-slate-700" : "text-slate-400"}>
                        {lesson.order + 1}. {lesson.title}
                      </span>
                      {isCurrent && (
                        <span className="text-[10px] font-bold text-amber-700 ml-auto shrink-0">
                          Currently here
                        </span>
                      )}
                    </li>
                  );
                })}
              </ol>
            </>
          ) : (
            <p className="text-xs text-slate-400">No lessons in this unit yet.</p>
          )}

          {unit.lastActivityAt && (
            <p className="text-[11px] text-slate-400 mt-3 flex items-center gap-1">
              <Clock className="w-3 h-3" aria-hidden="true" />
              Last worked on {new Date(unit.lastActivityAt).toLocaleString()}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export const TeacherStudentDetailPage: React.FC = () => {
  const { studentId } = useParams<{ studentId: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<StudentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    api
      .get(`/analytics/students/${studentId}`)
      .then(({ data: d }) => {
        if (!cancelled) setData(d);
      })
      .catch((err) => {
        if (!cancelled)
          setError(err.response?.data?.error || "Could not load this student");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [studentId]);

  const navItems: NavItem[] = [
    { icon: LayoutDashboard, label: "Dashboard", path: "/teacher" },
    { icon: BarChart3, label: "Insights", path: "/teacher/insights" },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF9F5] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <DashboardShell navItems={navItems}>
        <div className="max-w-md mx-auto bg-white p-10 rounded-3xl border border-slate-200/80 shadow-xs text-center mt-10">
          <AlertCircle className="w-10 h-10 text-amber-500 mx-auto mb-4" aria-hidden="true" />
          <h1 className="text-xl font-bold text-slate-900 mb-2">Can't open this student</h1>
          <p className="text-slate-500 text-sm mb-6">{error || "Something went wrong."}</p>
          <button
            onClick={() => navigate("/teacher")}
            className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-bold"
          >
            Back to students
          </button>
        </div>
      </DashboardShell>
    );
  }

  const { student, report, progress, attempts } = data;
  const stats = [
    { label: "XP", value: progress.xp, icon: Zap, tone: "text-amber-600 bg-amber-50 border-amber-200" },
    { label: "Day streak", value: progress.streakDays, icon: Flame, tone: "text-rose-600 bg-rose-50 border-rose-200" },
    { label: "Badges", value: progress.badges?.length ?? 0, icon: Award, tone: "text-emerald-600 bg-emerald-50 border-emerald-200" },
    { label: "Assessments", value: attempts.length, icon: BookOpen, tone: "text-sky-600 bg-sky-50 border-sky-200" },
  ];

  return (
    <DashboardShell navItems={navItems}>
      <div className="max-w-4xl mx-auto space-y-6">
        <Link
          to="/teacher"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800"
        >
          <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" /> Back to students
        </Link>

        {/* Header */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-800 font-bold text-xl flex items-center justify-center border border-emerald-200 shrink-0">
            {student.name?.charAt(0).toUpperCase() || "?"}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold text-slate-900 truncate">{student.name}</h1>
            <p className="text-sm text-slate-500 truncate">{student.email}</p>
            <p className="text-xs text-slate-400 mt-1">
              {report.classroom ? `${report.classroom.name} · ` : ""}
              Profile: {disabilityLabel(student.disabilityType)}
              {report.joinedAt ? ` · Joined ${new Date(report.joinedAt).toLocaleDateString()}` : ""}
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Overall</p>
            <p className="text-3xl font-bold text-slate-900">
              {report.overall === null ? "—" : `${report.overall}%`}
            </p>
            <p className="text-xs font-bold text-slate-500">Grade {report.overallGrade ?? "—"}</p>
          </div>
        </div>

        {!report.enrolled && (
          <p className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 text-xs text-amber-900">
            This student isn't enrolled in a classroom yet, so there's no coursework to report on.
          </p>
        )}

        {/* Gamification */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.label} className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center border mb-2 ${s.tone}`}>
                  <Icon className="w-4.5 h-4.5" aria-hidden="true" />
                </div>
                <div className="text-2xl font-bold text-slate-900">{s.value}</div>
                <div className="text-xs text-slate-500 font-medium">{s.label}</div>
              </div>
            );
          })}
        </div>

        {/* Learning pattern */}
        {report.pattern && (
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6">
            <div className="flex items-center gap-2 mb-4">
              <Brain className="w-4.5 h-4.5 text-emerald-600" aria-hidden="true" />
              <h2 className="font-bold text-slate-900 text-sm">How this student learns</h2>
            </div>
            <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <Metric label="Learns best in" value={report.pattern.bestMode || "Not enough data"} />
              <Metric label="Diagnostic preferred" value={report.pattern.preferredMode || "—"} />
              <Metric
                label="Attention span"
                value={report.pattern.attentionSpanScore === null ? "—" : `${report.pattern.attentionSpanScore}%`}
              />
              <Metric
                label="Diagnostic score"
                value={report.pattern.diagnosticScore === null ? "—" : `${report.pattern.diagnosticScore}%`}
              />
            </dl>
          </div>
        )}

        {/* Subjects -> units -> lessons */}
        {report.subjects.length > 0 && (
          <section>
            <h2 className="font-bold text-slate-900 text-sm mb-3">Coursework</h2>
            <div className="space-y-3">
              {report.subjects.map((subject) => (
                <div
                  key={subject.id}
                  className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden"
                >
                  <div className="flex items-center justify-between gap-3 px-5 py-4 bg-[#FAF9F5] border-b border-slate-200/70">
                    <h3 className="font-bold text-slate-900 text-sm">{subject.name}</h3>
                    <GradeChip grade={subject.grade} mark={subject.mark} />
                  </div>
                  {subject.units.length === 0 ? (
                    <p className="px-5 py-4 text-xs text-slate-400">No units in this subject yet.</p>
                  ) : (
                    subject.units.map((unit) => <UnitPanel key={unit.id} unit={unit} />)
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Assessment history */}
        {attempts.length > 0 && (
          <section className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-200/70">
              <Eye className="w-4.5 h-4.5 text-emerald-600" aria-hidden="true" />
              <h2 className="font-bold text-slate-900 text-sm">Adaptive assessment history</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-[#FAF9F5] text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="px-5 py-2.5">Date</th>
                    <th className="px-5 py-2.5">Score</th>
                    <th className="px-5 py-2.5">Attention</th>
                    <th className="px-5 py-2.5">Mode</th>
                    <th className="px-5 py-2.5">Switches</th>
                  </tr>
                </thead>
                <tbody>
                  {attempts.map((a) => (
                    <tr key={a.id} className="border-t border-slate-100 text-xs">
                      <td className="px-5 py-2.5 text-slate-600">
                        {new Date(a.completedAt).toLocaleDateString()}
                      </td>
                      <td className="px-5 py-2.5 font-bold text-slate-800">
                        {a.scoreCorrect}/{a.scoreTotal} ({Math.round(a.scorePercent)}%)
                      </td>
                      <td className="px-5 py-2.5 text-slate-600">{Math.round(a.attentionSpanScore)}%</td>
                      <td className="px-5 py-2.5 text-slate-600">{a.preferredMode}</td>
                      <td className="px-5 py-2.5 text-slate-600">{a.adaptationCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </DashboardShell>
  );
};

export default TeacherStudentDetailPage;
