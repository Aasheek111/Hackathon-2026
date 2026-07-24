import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LayoutDashboard, BarChart3, Users, Loader2, ArrowLeft, Activity, Award, Eye } from 'lucide-react';
import DashboardShell, { NavItem } from '../components/DashboardShell';
import api from '../lib/api';

interface UnitSummary {
  id: string;
  title: string;
  hasCurriculum: boolean;
  lessonCount: number;
  avgFocus: number | null;
  avgScorePercent: number | null;
  completed: number;
  enrolled: number;
}
interface SubjectSummary {
  id: string;
  name: string;
  units: UnitSummary[];
}
interface StudentSummary {
  id: string;
  name: string;
  attentionSpanScore: number | null;
  diagnosticScore: number | null;
  preferredMode: string | null;
  avgFocus: number | null;
  completedUnits: number;
}
interface ClassAnalytics {
  classroom: { id: string; name: string } | null;
  enrolledCount: number;
  subjects: SubjectSummary[];
  students: StudentSummary[];
}

interface LessonCell {
  order: number;
  avgScore: number | null;
  focusedRatio: number | null;
  samples: number;
}
interface UnitStudentRow {
  id: string;
  name: string;
  completed: boolean;
  currentLessonOrder: number;
  preferredMode: string | null;
  knowledgeChecks: { correct: number; total: number };
  finalScore: { correct: number; total: number } | null;
  mark: number | null;
  grade: string;
  lessons: LessonCell[];
  overallAvgFocus: number | null;
}

const gradeChip = (grade: string): string => {
  switch (grade) {
    case 'A': return 'text-emerald-700 bg-emerald-50 border-emerald-200';
    case 'B': return 'text-sky-700 bg-sky-50 border-sky-200';
    case 'C': return 'text-amber-700 bg-amber-50 border-amber-200';
    case 'D': return 'text-orange-700 bg-orange-50 border-orange-200';
    case 'F': return 'text-rose-700 bg-rose-50 border-rose-200';
    default: return 'text-slate-400 bg-slate-50 border-slate-200';
  }
};
interface UnitAnalytics {
  unit: { id: string; title: string };
  hasCurriculum: boolean;
  lessons: { order: number; title: string }[];
  students: UnitStudentRow[];
}

// Focus 0..100 -> red-to-green. null (no data) -> neutral gray.
function focusColor(focus: number | null): string {
  if (focus === null) return 'rgba(148,163,184,0.15)';
  const hue = Math.round(focus * 1.2); // 0=red, 120=green
  return `hsl(${hue}, 65%, ${focus > 55 ? 42 : 48}%)`;
}

const navItems: NavItem[] = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/teacher' },
  { icon: BarChart3, label: 'Insights', path: '/teacher/insights', active: true }
];

const StatPill: React.FC<{ label: string; value: string; tone?: string }> = ({ label, value, tone }) => (
  <div className="bg-white border border-slate-200/80 rounded-2xl px-4 py-3 shadow-xs">
    <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{label}</p>
    <p className={`text-lg font-bold ${tone || 'text-slate-900'}`}>{value}</p>
  </div>
);

/** The per-unit concentration heatmap: students (rows) x lessons (cols). */
const UnitHeatmap: React.FC<{ unitId: string; onBack: () => void }> = ({ unitId, onBack }) => {
  const [data, setData] = useState<UnitAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api
      .get(`/units/${unitId}/analytics`)
      .then(({ data }) => setData(data))
      .finally(() => setLoading(false));
  }, [unitId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-7 h-7 animate-spin text-emerald-600" />
      </div>
    );
  }
  if (!data) return <p className="text-slate-500 text-sm">Could not load analytics for this unit.</p>;

  return (
    <div className="space-y-6">
      <button onClick={onBack} className="flex items-center gap-1.5 text-slate-600 hover:text-slate-900 font-bold text-xs">
        <ArrowLeft className="w-4 h-4" /> All units
      </button>

      <div>
        <h2 className="text-2xl font-bold text-slate-900">{data.unit.title}</h2>
        <p className="text-slate-500 text-sm mt-1 flex items-center gap-1.5">
          <Activity className="w-4 h-4" /> Concentration heatmap — greener means students stayed more focused on that
          lesson; red/grey flags where attention dropped (or no data yet).
        </p>
      </div>

      {!data.hasCurriculum ? (
        <div className="bg-white p-8 rounded-3xl border border-slate-200/80 text-center text-slate-500 text-sm">
          This unit has no generated lesson plan yet, so there&apos;s nothing to chart.
        </div>
      ) : data.students.length === 0 ? (
        <div className="bg-white p-8 rounded-3xl border border-slate-200/80 text-center text-slate-500 text-sm">
          No students enrolled in this classroom yet.
        </div>
      ) : (
        <div className="bg-white p-4 sm:p-6 rounded-3xl border border-slate-200/80 shadow-xs overflow-x-auto">
          <table className="border-separate border-spacing-1">
            <thead>
              <tr>
                <th className="text-left text-xs font-bold text-slate-500 px-2 sticky left-0 bg-white z-10">Student</th>
                {data.lessons.map((l) => (
                  <th key={l.order} className="text-[10px] font-bold text-slate-400 px-1 min-w-[2.2rem]" title={l.title}>
                    L{l.order + 1}
                  </th>
                ))}
                <th className="text-[10px] font-bold text-slate-400 px-2">Focus</th>
                <th className="text-[10px] font-bold text-slate-400 px-2">Checks</th>
                <th className="text-[10px] font-bold text-slate-400 px-2">Exam</th>
                <th className="text-[10px] font-bold text-slate-400 px-2">Mark</th>
              </tr>
            </thead>
            <tbody>
              {data.students.map((s) => (
                <tr key={s.id}>
                  <td className="text-xs font-semibold text-slate-800 px-2 whitespace-nowrap sticky left-0 bg-white z-10 max-w-[10rem] truncate">
                    {s.name}
                    {s.completed && <span className="ml-1 text-emerald-600">✓</span>}
                  </td>
                  {data.lessons.map((l) => {
                    const cell = s.lessons.find((c) => c.order === l.order);
                    const focus = cell?.avgScore ?? null;
                    return (
                      <td key={l.order} className="p-0">
                        <div
                          className="w-8 h-8 rounded-md flex items-center justify-center text-[9px] font-bold text-white/90"
                          style={{ backgroundColor: focusColor(focus) }}
                          title={
                            focus === null
                              ? `Lesson ${l.order + 1}: no data`
                              : `Lesson ${l.order + 1}: ${focus}% focus (${cell?.samples ?? 0} samples)`
                          }
                        >
                          {focus === null ? '' : focus}
                        </div>
                      </td>
                    );
                  })}
                  <td className="text-xs font-bold text-slate-700 px-2 text-center">
                    {s.overallAvgFocus === null ? '—' : `${s.overallAvgFocus}%`}
                  </td>
                  <td className="text-xs text-slate-600 px-2 text-center">
                    {s.knowledgeChecks.total > 0 ? `${s.knowledgeChecks.correct}/${s.knowledgeChecks.total}` : '—'}
                  </td>
                  <td className="text-xs text-slate-600 px-2 text-center">
                    {s.finalScore ? `${s.finalScore.correct}/${s.finalScore.total}` : '—'}
                  </td>
                  <td className="px-2 text-center">
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${gradeChip(s.grade)}`}>
                      {s.mark === null ? '—' : `${s.grade} ${s.mark}%`}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex items-center gap-3 mt-4 text-[11px] text-slate-500">
            <span>Low focus</span>
            <div className="flex gap-0.5">
              {[10, 30, 50, 70, 90].map((f) => (
                <div key={f} className="w-6 h-3 rounded" style={{ backgroundColor: focusColor(f) }} />
              ))}
            </div>
            <span>High focus</span>
            <span className="ml-2">·</span>
            <div className="w-3 h-3 rounded" style={{ backgroundColor: focusColor(null) }} />
            <span>no data</span>
          </div>
        </div>
      )}
    </div>
  );
};

export const TeacherInsightsPage: React.FC = () => {
  const [data, setData] = useState<ClassAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedUnit, setSelectedUnit] = useState<string | null>(null);

  useEffect(() => {
    api
      .get('/analytics/class')
      .then(({ data }) => setData(data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF9F5] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <DashboardShell navItems={navItems}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-6xl mx-auto space-y-8">
        {selectedUnit ? (
          <UnitHeatmap unitId={selectedUnit} onBack={() => setSelectedUnit(null)} />
        ) : !data?.classroom ? (
          <div className="bg-white p-10 rounded-3xl border border-slate-200/80 text-center text-slate-500 text-sm mt-8">
            Create your classroom and add subjects to start seeing student insights.
          </div>
        ) : (
          <>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">{data.classroom.name} — Insights</h1>
              <p className="text-slate-500 text-sm mt-1">
                Concentration and performance across every unit. Click a unit for its lesson-by-lesson heatmap.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatPill label="Students" value={String(data.enrolledCount)} />
              <StatPill
                label="Avg attention"
                value={
                  data.students.filter((s) => s.attentionSpanScore !== null).length
                    ? `${Math.round(
                        data.students
                          .filter((s) => s.attentionSpanScore !== null)
                          .reduce((a, s) => a + (s.attentionSpanScore || 0), 0) /
                          data.students.filter((s) => s.attentionSpanScore !== null).length
                      )}%`
                    : '—'
                }
                tone="text-emerald-700"
              />
              <StatPill label="Subjects" value={String(data.subjects.length)} />
              <StatPill
                label="Units"
                value={String(data.subjects.reduce((a, s) => a + s.units.length, 0))}
              />
            </div>

            {/* Per-subject unit cards */}
            {data.subjects.map((subject) => (
              <div key={subject.id} className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
                <h2 className="text-lg font-bold text-slate-900 mb-4">{subject.name}</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {subject.units.map((unit) => (
                    <button
                      key={unit.id}
                      onClick={() => unit.hasCurriculum && setSelectedUnit(unit.id)}
                      disabled={!unit.hasCurriculum}
                      className={`text-left p-4 rounded-2xl border transition-all ${
                        unit.hasCurriculum
                          ? 'border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/40 cursor-pointer'
                          : 'border-slate-200 bg-[#FAF9F5] opacity-60 cursor-not-allowed'
                      }`}
                    >
                      <p className="font-bold text-slate-900 text-sm mb-2">{unit.title}</p>
                      {unit.hasCurriculum ? (
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
                          <span className="flex items-center gap-1">
                            <Eye className="w-3.5 h-3.5 text-emerald-600" />
                            {unit.avgFocus === null ? 'No focus data' : `${unit.avgFocus}% focus`}
                          </span>
                          <span className="flex items-center gap-1">
                            <Award className="w-3.5 h-3.5 text-amber-500" />
                            {unit.avgScorePercent === null ? 'No exams' : `${unit.avgScorePercent}% avg`}
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="w-3.5 h-3.5 text-slate-400" />
                            {unit.completed}/{unit.enrolled} done
                          </span>
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400">No lesson plan generated yet</p>
                      )}
                    </button>
                  ))}
                  {subject.units.length === 0 && <p className="text-slate-400 text-xs">No units yet.</p>}
                </div>
              </div>
            ))}

            {/* Per-student class summary */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs overflow-x-auto">
              <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-slate-500" /> Students
              </h2>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] font-bold uppercase tracking-wide text-slate-400 border-b border-slate-100">
                    <th className="py-2 pr-4">Name</th>
                    <th className="py-2 px-2">Attention</th>
                    <th className="py-2 px-2">Avg focus</th>
                    <th className="py-2 px-2">Preferred</th>
                    <th className="py-2 px-2">Units done</th>
                  </tr>
                </thead>
                <tbody>
                  {data.students.map((s) => (
                    <tr key={s.id} className="border-b border-slate-50">
                      <td className="py-2.5 pr-4 font-semibold text-slate-800">{s.name}</td>
                      <td className="py-2.5 px-2 text-slate-600">
                        {s.attentionSpanScore === null ? '—' : `${s.attentionSpanScore}%`}
                      </td>
                      <td className="py-2.5 px-2 text-slate-600">{s.avgFocus === null ? '—' : `${s.avgFocus}%`}</td>
                      <td className="py-2.5 px-2 text-slate-600">{s.preferredMode || '—'}</td>
                      <td className="py-2.5 px-2 text-slate-600">{s.completedUnits}</td>
                    </tr>
                  ))}
                  {data.students.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-4 text-center text-slate-400 text-xs">
                        No students enrolled yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </motion.div>
    </DashboardShell>
  );
};

export default TeacherInsightsPage;
