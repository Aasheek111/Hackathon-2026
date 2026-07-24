import React, { useEffect, useState, useCallback } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { TrendingUp, BookOpen, ChevronLeft, ChevronRight, Loader2, Download } from 'lucide-react';
import api from '../lib/api';

/** One calendar day of activity returned by /api/activity */
export interface ActivityDay {
  date: string;          // YYYY-MM-DD
  avgScore: number | null;
  kcAccuracy: number | null;
  kcCorrect: number;
  kcTotal: number;
  lessonsCompleted: number;
}

export interface ActivitySummary {
  activeDays: number;
  totalAssessments: number;
  avgScore: number | null;
  totalLessonsCompleted: number;
  totalKcCorrect: number;
  totalKcTotal: number;
  kcAccuracy: number | null;
  xp: number;
  streakDays: number;
}

export interface ActivityData {
  studentId: string;
  rangeStart: string;
  rangeEnd: string;
  days: ActivityDay[];
  summary: ActivitySummary;
}

interface Props {
  /** If provided, fetches data for this student (teacher view). Own data if omitted. */
  studentId?: string;
  /** Render a smaller version for the dashboard widget */
  compact?: boolean;
  /** Called with the loaded data so the parent can use it (e.g. for download) */
  onDataLoaded?: (data: ActivityData) => void;
}

/** Generate the list of last-12-month YYYY-MM strings, newest first */
function buildMonthOptions() {
  const opts: { value: string; label: string }[] = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
    opts.push({ value, label });
  }
  return opts;
}

const MONTHS = buildMonthOptions();
const CURRENT_MONTH = MONTHS[0].value;

/** Format YYYY-MM-DD as short day label (e.g. "Jul 15") */
const fmtDay = (dateStr: string) => {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

/** Custom tooltip for the line chart */
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-lg px-4 py-3 text-xs">
      <p className="font-bold text-slate-700 mb-1">{fmtDay(label)}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-slate-600">{p.name}:</span>
          <span className="font-bold text-slate-900">
            {p.value !== null && p.value !== undefined ? `${p.value}%` : '—'}
          </span>
        </div>
      ))}
    </div>
  );
};

export const LearningActivityGraph: React.FC<Props> = ({
  studentId,
  compact = false,
  onDataLoaded,
}) => {
  const [selectedMonth, setSelectedMonth] = useState(CURRENT_MONTH);
  const [data, setData] = useState<ActivityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const monthIndex = MONTHS.findIndex((m) => m.value === selectedMonth);

  const load = useCallback(async (month: string) => {
    setLoading(true);
    setError('');
    try {
      const params: Record<string, string> = { month };
      if (studentId) params.studentId = studentId;
      const { data: d } = await api.get('/activity', { params });
      setData(d);
      onDataLoaded?.(d);
    } catch {
      setError('Could not load activity data.');
    } finally {
      setLoading(false);
    }
  }, [studentId, onDataLoaded]);

  useEffect(() => {
    load(selectedMonth);
  }, [load, selectedMonth]);

  const chartData = (data?.days ?? []).map((day) => ({
    date: day.date,
    'Quiz Score': day.avgScore,
    'Lesson Checks': day.kcAccuracy,
    lessonsCompleted: day.lessonsCompleted,
  }));

  const summary = data?.summary;

  // Summary stat cards
  const statCards = [
    {
      icon: TrendingUp,
      label: 'Avg quiz score',
      value: summary?.avgScore !== null && summary?.avgScore !== undefined
        ? `${summary.avgScore}%`
        : '—',
      color: 'text-emerald-700 bg-emerald-50 border-emerald-200',
    },
    {
      icon: BookOpen,
      label: 'Lessons done',
      value: summary?.totalLessonsCompleted ?? 0,
      color: 'text-sky-700 bg-sky-50 border-sky-200',
    },
    {
      icon: TrendingUp,
      label: 'Check accuracy',
      value: summary?.kcAccuracy !== null && summary?.kcAccuracy !== undefined
        ? `${summary.kcAccuracy}%`
        : '—',
      color: 'text-violet-700 bg-violet-50 border-violet-200',
    },
    {
      icon: BookOpen,
      label: 'Active days',
      value: summary?.activeDays ?? 0,
      color: 'text-amber-700 bg-amber-50 border-amber-200',
    },
  ];

  const chartHeight = compact ? 160 : 230;

  return (
    <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4.5 h-4.5 text-emerald-600" aria-hidden="true" />
          <h2 className="font-bold text-slate-900 text-sm">Learning Activity</h2>
        </div>

        {/* Month picker */}
        <div className="flex items-center gap-1">
          <button
            aria-label="Previous month"
            disabled={monthIndex >= MONTHS.length - 1}
            onClick={() => setSelectedMonth(MONTHS[Math.min(monthIndex + 1, MONTHS.length - 1)].value)}
            className="p-1 rounded-lg hover:bg-slate-100 disabled:opacity-30 transition-colors"
          >
            <ChevronLeft className="w-4 h-4 text-slate-500" />
          </button>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-400"
            aria-label="Select month"
          >
            {MONTHS.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
          <button
            aria-label="Next month"
            disabled={monthIndex <= 0}
            onClick={() => setSelectedMonth(MONTHS[Math.max(monthIndex - 1, 0)].value)}
            className="p-1 rounded-lg hover:bg-slate-100 disabled:opacity-30 transition-colors"
          >
            <ChevronRight className="w-4 h-4 text-slate-500" />
          </button>
        </div>
      </div>

      <div className="px-5 py-4">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
          </div>
        ) : error ? (
          <p className="text-xs text-rose-600 text-center py-8">{error}</p>
        ) : chartData.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-2">
            <TrendingUp className="w-8 h-8 text-slate-200" />
            <p className="text-sm text-slate-400 font-medium">No activity in this month</p>
            <p className="text-xs text-slate-400">Complete quizzes or lessons to see your graph here.</p>
          </div>
        ) : (
          <>
            {/* Summary stats */}
            {!compact && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                {statCards.map((s) => {
                  const Icon = s.icon;
                  return (
                    <div
                      key={s.label}
                      className={`flex items-center gap-2.5 px-3 py-2.5 rounded-2xl border ${s.color}`}
                    >
                      <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                      <div className="min-w-0">
                        <div className="text-[10px] font-bold uppercase tracking-wide opacity-70 truncate">{s.label}</div>
                        <div className="text-base font-bold leading-tight">{s.value}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Line chart */}
            <ResponsiveContainer width="100%" height={chartHeight}>
              <LineChart data={chartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis
                  dataKey="date"
                  tickFormatter={fmtDay}
                  tick={{ fontSize: 10, fill: '#94a3b8' }}
                  axisLine={false}
                  tickLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fontSize: 10, fill: '#94a3b8' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `${v}%`}
                />
                <Tooltip content={<CustomTooltip />} />
                {!compact && <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />}
                <Line
                  type="monotone"
                  dataKey="Quiz Score"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={{ r: 3, fill: '#10b981', strokeWidth: 0 }}
                  activeDot={{ r: 5, strokeWidth: 0 }}
                  connectNulls={false}
                />
                <Line
                  type="monotone"
                  dataKey="Lesson Checks"
                  stroke="#38bdf8"
                  strokeWidth={2}
                  dot={{ r: 3, fill: '#38bdf8', strokeWidth: 0 }}
                  activeDot={{ r: 5, strokeWidth: 0 }}
                  connectNulls={false}
                  strokeDasharray="4 2"
                />
              </LineChart>
            </ResponsiveContainer>

            {/* Lesson completion bar chart overlay */}
            {!compact && (
              <div className="mt-3 flex gap-1 h-6 items-end" title="Lessons completed per day">
                {chartData.map((d) => {
                  const max = Math.max(...chartData.map((x) => x.lessonsCompleted || 0), 1);
                  const pct = Math.max(4, ((d.lessonsCompleted || 0) / max) * 100);
                  return (
                    <div
                      key={d.date}
                      title={`${fmtDay(d.date)}: ${d.lessonsCompleted} lesson${d.lessonsCompleted !== 1 ? 's' : ''}`}
                      className="flex-1 rounded-sm bg-violet-200 hover:bg-violet-400 transition-colors cursor-default min-w-[4px]"
                      style={{ height: `${pct}%` }}
                    />
                  );
                })}
              </div>
            )}
            {!compact && (
              <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                <span className="inline-block w-3 h-2 rounded-sm bg-violet-200" />
                Lessons completed per day
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
};

/** ─── Download / Report generation ────────────────────────────────────────── */

/**
 * Generate a clean printable HTML report from activity data.
 * Opens in a new tab — student/teacher can then Ctrl+P → Save as PDF.
 * No letter grades. Scores are raw percentages or "X/Y correct (Z%)".
 */
export function generateAndDownloadReport(
  activityData: ActivityData,
  studentName: string,
  monthLabel: string,
) {
  const { days, summary } = activityData;

  const rowsHtml = days.length === 0
    ? '<tr><td colspan="4" style="text-align:center;color:#94a3b8;padding:20px">No activity this month</td></tr>'
    : days.map((d) => {
        const scoreCell = d.avgScore !== null
          ? `<span style="color:#059669;font-weight:700">${d.avgScore}%</span>`
          : '<span style="color:#94a3b8">—</span>';
        const kcCell = d.kcTotal > 0
          ? `${d.kcCorrect}/${d.kcTotal} correct (${d.kcAccuracy}%)`
          : '<span style="color:#94a3b8">—</span>';
        const lessonCell = d.lessonsCompleted > 0
          ? `<strong>${d.lessonsCompleted}</strong> lesson${d.lessonsCompleted !== 1 ? 's' : ''}`
          : '<span style="color:#94a3b8">—</span>';
        return `
          <tr>
            <td>${new Date(d.date + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</td>
            <td>${scoreCell}</td>
            <td>${kcCell}</td>
            <td>${lessonCell}</td>
          </tr>`;
      }).join('');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Learning Report — ${studentName}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', system-ui, sans-serif; color: #1e293b; background: #fff; padding: 40px; max-width: 860px; margin: auto; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; padding-bottom: 20px; border-bottom: 2px solid #e2e8f0; }
    .brand { font-size: 22px; font-weight: 900; color: #059669; letter-spacing: -0.5px; }
    .meta { text-align: right; font-size: 12px; color: #64748b; }
    h1 { font-size: 26px; font-weight: 800; margin-bottom: 4px; }
    .subtitle { font-size: 14px; color: #64748b; margin-bottom: 28px; }
    .stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 32px; }
    .stat-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px 16px; }
    .stat-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #94a3b8; margin-bottom: 4px; }
    .stat-value { font-size: 22px; font-weight: 800; color: #0f172a; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    thead tr { background: #f1f5f9; }
    th { padding: 10px 14px; text-align: left; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; border-bottom: 1px solid #e2e8f0; }
    td { padding: 10px 14px; border-bottom: 1px solid #f1f5f9; vertical-align: middle; }
    tr:last-child td { border-bottom: none; }
    tr:hover td { background: #f8fafc; }
    .note { margin-top: 24px; font-size: 11px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 16px; }
    @media print { body { padding: 20px; } }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="brand">Pragya</div>
      <div style="font-size:12px;color:#64748b;margin-top:2px">Adaptive Learning Platform</div>
    </div>
    <div class="meta">
      <div>Generated ${new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
      <div>Period: ${monthLabel}</div>
    </div>
  </div>

  <h1>${studentName}</h1>
  <p class="subtitle">Learning Activity Report · ${monthLabel}</p>

  <div class="stats">
    <div class="stat-card">
      <div class="stat-label">Active Days</div>
      <div class="stat-value">${summary.activeDays}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Avg Quiz Score</div>
      <div class="stat-value">${summary.avgScore !== null ? summary.avgScore + '%' : '—'}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Lessons Completed</div>
      <div class="stat-value">${summary.totalLessonsCompleted}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Check Accuracy</div>
      <div class="stat-value">${summary.kcAccuracy !== null ? summary.kcAccuracy + '%' : '—'}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Total Assessments</div>
      <div class="stat-value">${summary.totalAssessments}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Lesson Checks</div>
      <div class="stat-value">${summary.totalKcCorrect}/${summary.totalKcTotal}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">XP Earned</div>
      <div class="stat-value">${summary.xp}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Day Streak</div>
      <div class="stat-value">${summary.streakDays}</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Date</th>
        <th>Avg Quiz Score</th>
        <th>Lesson Checks</th>
        <th>Lessons Completed</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml}
    </tbody>
  </table>

  <p class="note">
    Scores are shown as raw percentages (e.g. 82%) or correct/total counts — no letter grades are used in this report.
    "Avg Quiz Score" includes adaptive assessments and curriculum final exams.
    "Lesson Checks" are per-lesson knowledge check questions answered within the curriculum player.
    <br /><br />
    Pragya · Adaptive Learning Platform · Report generated automatically
  </p>
</body>
</html>`;

  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `pragya-report-${studentName.replace(/\s+/g, '-').toLowerCase()}-${monthLabel.replace(/\s+/g, '-').toLowerCase()}.html`;
  a.click();
  URL.revokeObjectURL(url);
}

/** Button that triggers the report download */
export const ReportDownloadButton: React.FC<{
  activityData: ActivityData | null;
  studentName: string;
  monthLabel: string;
  disabled?: boolean;
}> = ({ activityData, studentName, monthLabel, disabled }) => (
  <button
    disabled={disabled || !activityData}
    onClick={() => activityData && generateAndDownloadReport(activityData, studentName, monthLabel)}
    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 text-white text-xs font-bold transition-colors shadow-sm"
    title="Download report as HTML (then print to PDF)"
  >
    <Download className="w-3.5 h-3.5" />
    Download Report
  </button>
);

export default LearningActivityGraph;
