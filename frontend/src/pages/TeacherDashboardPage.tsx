import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  Users,
  BookOpen,
  ClipboardCheck,
  Settings,
  Clock,
  Check,
  X,
  Plus,
  Upload,
  FileText,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import DashboardShell, { NavItem } from "../components/DashboardShell";
import api from "../lib/api";

interface Unit {
  id: string;
  title: string;
  order: number;
  indexStatus: "NOT_INDEXED" | "PROCESSING" | "READY" | "FAILED";
  _count?: { documents: number };
}
interface Subject {
  id: string;
  name: string;
  units: Unit[];
}
interface JoinRequest {
  id: string;
  matchScore: number;
  matchReasons: Array<{
    label: string;
    applicable: boolean;
    passed: boolean;
    detail: string;
  }>;
  requestedAt: string;
  student: { id: string; name: string; email: string };
}
interface StudentAttempt {
  scorePercent: number;
  attentionSpanScore: number;
  preferredMode: string;
  completedAt: string;
}
interface StudentProgress {
  xp: number;
  streakDays: number;
  badges: Array<{ name: string }>;
}
interface Enrolment {
  id: string;
  joinedAt: string;
  student: {
    id: string;
    name: string;
    email: string;
    attempts: StudentAttempt[];
    progress: StudentProgress | null;
  };
}
interface Classroom {
  id: string;
  name: string;
  description: string | null;
  admissionCriteria: any;
  subjects: Subject[];
  enrolments: Enrolment[];
  joinRequests: JoinRequest[];
}

const PendingApproval: React.FC<{ status: string }> = ({ status }) => (
  <div className="min-h-screen bg-[#FAF9F5] flex items-center justify-center p-6 text-slate-800 font-sans">
    <div className="bg-white max-w-md w-full p-10 rounded-3xl border border-slate-200/80 shadow-md text-center">
      <div className="w-16 h-16 mx-auto mb-6 rounded-3xl bg-amber-100 border border-amber-200 flex items-center justify-center">
        <Clock className="w-8 h-8 text-amber-700" />
      </div>
      <h1 className="text-2xl font-bold text-slate-900 mb-2">
        {status === "REJECTED"
          ? "Application Not Approved"
          : status === "SUSPENDED"
            ? "Account Suspended"
            : "Pending Approval"}
      </h1>
      <p className="text-slate-600 text-sm leading-relaxed">
        {status === "PENDING" &&
          "Your educator account is awaiting admin review. You will be notified once verified."}
        {status === "REJECTED" &&
          "An administrator reviewed your teacher application and did not approve it."}
        {status === "SUSPENDED" &&
          "Your teacher account has been suspended. Contact an administrator for details."}
      </p>
    </div>
  </div>
);

export const TeacherDashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [classroom, setClassroom] = useState<Classroom | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<
    "overview" | "content" | "requests" | "roster" | "criteria"
  >("overview");

  const [newClassroom, setNewClassroom] = useState({
    name: "",
    description: "",
  });
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    const { data } = await api.get("/classrooms/mine");
    setClassroom(data.classroom);
  }, []);

  useEffect(() => {
    if (user?.teacherStatus === "APPROVED") {
      load().finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [user, load]);

  if (user?.role === "TEACHER" && user.teacherStatus !== "APPROVED") {
    return <PendingApproval status={user.teacherStatus || "PENDING"} />;
  }

  const navItems: NavItem[] = [
    {
      icon: LayoutDashboard,
      label: "Overview",
      path: "",
      active: activeTab === "overview",
      onClick: () => setActiveTab("overview"),
    },
    {
      icon: BookOpen,
      label: "Subjects & Content",
      path: "",
      active: activeTab === "content",
      onClick: () => setActiveTab("content"),
    },
    {
      icon: ClipboardCheck,
      label: "Join Requests",
      path: "",
      active: activeTab === "requests",
      badge: classroom?.joinRequests.length,
      onClick: () => setActiveTab("requests"),
    },
    {
      icon: Users,
      label: "Roster",
      path: "",
      active: activeTab === "roster",
      onClick: () => setActiveTab("roster"),
    },
    {
      icon: Settings,
      label: "Admission Criteria",
      path: "",
      active: activeTab === "criteria",
      onClick: () => setActiveTab("criteria"),
    },
  ];

  const createClassroom = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      await api.post("/classrooms", newClassroom);
      await load();
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF9F5] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (!classroom) {
    return (
      <div className="min-h-screen bg-[#FAF9F5] flex items-center justify-center p-6 text-slate-800 font-sans">
        <div className="bg-white max-w-lg w-full p-8 sm:p-10 rounded-3xl border border-slate-200/80 shadow-md">
          <h1 className="text-2xl font-bold text-slate-900 mb-2">
            Create Your Classroom
          </h1>
          <p className="text-slate-600 text-sm mb-6">
            Every educator starts with one main classroom. You can set admission
            criteria later.
          </p>
          <form onSubmit={createClassroom} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Classroom Name
              </label>
              <input
                type="text"
                value={newClassroom.name}
                onChange={(e) =>
                  setNewClassroom({ ...newClassroom, name: e.target.value })
                }
                placeholder="e.g. Adaptive Learners - Grade 3"
                className="w-full bg-[#FAF9F5] border border-slate-200 rounded-2xl px-4 py-3 text-slate-800 focus:outline-none focus:border-emerald-500 focus:bg-white text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Description (optional)
              </label>
              <input
                type="text"
                value={newClassroom.description}
                onChange={(e) =>
                  setNewClassroom({
                    ...newClassroom,
                    description: e.target.value,
                  })
                }
                placeholder="What is this classroom tuned for?"
                className="w-full bg-[#FAF9F5] border border-slate-200 rounded-2xl px-4 py-3 text-slate-800 focus:outline-none focus:border-emerald-500 focus:bg-white text-sm"
              />
            </div>
            <button
              type="submit"
              disabled={creating}
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3.5 px-6 rounded-2xl shadow-md border-b-4 border-emerald-700 active:translate-y-0.5 active:border-b-2 transition-all text-sm mt-2"
            >
              {creating ? "Creating..." : "Create Classroom"}
            </button>
          </form>
        </div>
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
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">
              {classroom.name}
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              {classroom.description || "No description provided."}
            </p>
          </div>
        </div>

        <TeacherTabButtons
          active={activeTab}
          setActive={setActiveTab}
          pendingCount={classroom.joinRequests.length}
        />

        {activeTab === "overview" && <OverviewTab classroom={classroom} />}
        {activeTab === "content" && (
          <ContentTab classroom={classroom} onChanged={load} />
        )}
        {activeTab === "requests" && (
          <RequestsTab classroom={classroom} onChanged={load} />
        )}
        {activeTab === "roster" && <RosterTab classroom={classroom} />}
        {activeTab === "criteria" && (
          <CriteriaTab classroom={classroom} onChanged={load} />
        )}
      </motion.div>
    </DashboardShell>
  );
};

const TeacherTabButtons: React.FC<{
  active: string;
  setActive: (t: any) => void;
  pendingCount: number;
}> = ({ active, setActive, pendingCount }) => (
  <div className="flex overflow-x-auto space-x-2 bg-white p-1.5 rounded-2xl border border-slate-200 shadow-xs md:hidden">
    {[
      ["overview", "Overview"],
      ["content", "Content"],
      ["requests", `Requests${pendingCount ? ` (${pendingCount})` : ""}`],
      ["roster", "Roster"],
      ["criteria", "Criteria"],
    ].map(([id, label]) => (
      <button
        key={id}
        onClick={() => setActive(id)}
        className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${active === id ? "bg-emerald-500 text-white" : "text-slate-600 hover:bg-slate-100"}`}
      >
        {label}
      </button>
    ))}
  </div>
);

const OverviewTab: React.FC<{ classroom: Classroom }> = ({ classroom }) => (
  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
    {[
      {
        label: "Students Enrolled",
        value: classroom.enrolments.length,
        color: "bg-emerald-50 text-emerald-800",
      },
      {
        label: "Pending Requests",
        value: classroom.joinRequests.length,
        color: "bg-amber-50 text-amber-800",
      },
      {
        label: "Total Subjects",
        value: classroom.subjects.length,
        color: "bg-sky-50 text-sky-800",
      },
    ].map((s, i) => (
      <div
        key={i}
        className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs"
      >
        <div className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">
          {s.label}
        </div>
        <div className="text-3xl font-bold text-slate-900">{s.value}</div>
      </div>
    ))}
  </div>
);

const RAG_SERVICE_URL =
  import.meta.env.VITE_RAG_SERVICE_URL || "http://localhost:8100";

/**
 * The auto-generated preview (text + picture) that starts building in the
 * background the moment a unit's PDF finishes indexing - shown here so a
 * teacher can see it "come alive" without opening the student tutorial view.
 */
const UnitPreviewBadge: React.FC<{ unitId: string; ready: boolean }> = ({
  unitId,
  ready,
}) => {
  const [preview, setPreview] = useState<{
    status: string;
    imageUrl: string | null;
  } | null>(null);

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    api
      .get(`/units/${unitId}/preview`)
      .then(({ data }) => {
        if (!cancelled) setPreview(data.preview);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [unitId, ready]);

  if (!ready || !preview) return null;
  if (preview.status === "PROCESSING") {
    return (
      <span className="flex items-center gap-1 text-xs text-gray-500">
        <Loader2 className="w-3 h-3 animate-spin" /> preparing visuals&hellip;
      </span>
    );
  }
  if (preview.status === "READY" && preview.imageUrl) {
    return (
      <img
        src={`${RAG_SERVICE_URL}${preview.imageUrl}`}
        alt="Auto-generated preview"
        className="w-8 h-8 rounded-lg object-cover border border-white/10"
      />
    );
  }
  return null;
};

const ContentTab: React.FC<{
  classroom: Classroom;
  onChanged: () => Promise<void>;
}> = ({ classroom, onChanged }) => {
  const [subjectName, setSubjectName] = useState("");
  const [unitTitleFor, setUnitTitleFor] = useState<Record<string, string>>({});
  const [uploadingUnit, setUploadingUnit] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState("");

  const addSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subjectName.trim()) return;
    await api.post(`/classrooms/${classroom.id}/subjects`, {
      name: subjectName,
    });
    setSubjectName("");
    onChanged();
  };

  const addUnit = async (subjectId: string) => {
    const title = unitTitleFor[subjectId]?.trim();
    if (!title) return;
    await api.post(`/subjects/${subjectId}/units`, { title });
    setUnitTitleFor({ ...unitTitleFor, [subjectId]: "" });
    onChanged();
  };

  const abortControllersRef = useRef<Record<string, AbortController>>({});

  const uploadDocument = async (unitId: string, file: File) => {
    setUploadError("");
    setUploadingUnit(unitId);
    const controller = new AbortController();
    abortControllersRef.current[unitId] = controller;
    try {
      const form = new FormData();
      form.append("file", file);
      await api.post(`/units/${unitId}/documents`, form, {
        headers: { "Content-Type": "multipart/form-data" },
        signal: controller.signal,
      });
      await onChanged();
    } catch (err: any) {
      if (err.code !== "ERR_CANCELED" && err.name !== "CanceledError") {
        setUploadError(err.response?.data?.error || "Upload failed");
      }
    } finally {
      delete abortControllersRef.current[unitId];
      setUploadingUnit(null);
    }
  };

  const cancelUpload = (unitId: string) => {
    abortControllersRef.current[unitId]?.abort();
  };

  const statusBadge = (status: Unit["indexStatus"]) => {
    const map: Record<Unit["indexStatus"], string> = {
      NOT_INDEXED: "bg-slate-100 text-slate-600 border-slate-200",
      PROCESSING: "bg-amber-50 text-amber-800 border-amber-200",
      READY: "bg-emerald-50 text-emerald-800 border-emerald-200",
      FAILED: "bg-rose-50 text-rose-800 border-rose-200",
    };
    return (
      <span
        className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${map[status]}`}
      >
        {status.replace("_", " ")}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {uploadError && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-2xl text-sm font-medium flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" /> {uploadError}
        </div>
      )}

      <form
        onSubmit={addSubject}
        className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex gap-3 items-end"
      >
        <div className="flex-1">
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            New Subject
          </label>
          <input
            type="text"
            value={subjectName}
            onChange={(e) => setSubjectName(e.target.value)}
            placeholder="e.g. Science & Discovery"
            className="w-full bg-[#FAF9F5] border border-slate-200 rounded-2xl px-4 py-2.5 text-slate-800 focus:outline-none focus:border-emerald-500 text-sm"
          />
        </div>
        <button
          type="submit"
          className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-5 py-2.5 rounded-2xl shadow-sm border-b-2 border-emerald-700 active:translate-y-0.5 transition-all text-xs flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" /> Add Subject
        </button>
      </form>

      {classroom.subjects.map((subject) => (
        <div
          key={subject.id}
          className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs"
        >
          <h3 className="text-lg font-bold text-slate-900 mb-4">
            {subject.name}
          </h3>

          <div className="space-y-3">
            {subject.units.map((unit) => (
              <div
                key={unit.id}
                className="bg-[#FAF9F5] border border-slate-200/70 rounded-2xl p-4 flex items-center justify-between gap-4 flex-wrap"
              >
                <div className="flex items-center gap-3">
                  <FileText className="w-4 h-4 text-slate-400" />
                  <span className="font-bold text-slate-800 text-sm">
                    {unit.title}
                  </span>
                  {statusBadge(unit.indexStatus)}
                  <span className="text-xs text-gray-500">
                    {unit._count?.documents || 0} document(s)
                  </span>
                  <UnitPreviewBadge
                    unitId={unit.id}
                    ready={unit.indexStatus === "READY"}
                  />
                </div>
                {uploadingUnit === unit.id ? (
                  <div className="flex items-center gap-2 text-xs font-bold px-3 py-2 rounded-xl border border-slate-200 bg-white">
                    <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />{" "}
                    Processing…
                    <button
                      type="button"
                      onClick={() => cancelUpload(unit.id)}
                      className="text-rose-600 hover:underline font-bold ml-1"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <label className="cursor-pointer text-xs font-bold px-4 py-2 rounded-xl border border-slate-200 bg-white hover:border-emerald-500 text-slate-700 flex items-center gap-2 transition-all">
                    <Upload className="w-4 h-4 text-emerald-600" />
                    Upload PDF
                    <input
                      type="file"
                      accept="application/pdf"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) uploadDocument(unit.id, file);
                        e.target.value = "";
                      }}
                    />
                  </label>
                )}
              </div>
            ))}
          </div>

          <div className="flex gap-3 mt-4">
            <input
              value={unitTitleFor[subject.id] || ""}
              onChange={(e) =>
                setUnitTitleFor({
                  ...unitTitleFor,
                  [subject.id]: e.target.value,
                })
              }
              placeholder="New unit title, e.g. Unit 3 - Fractions"
              className="flex-1 bg-[#FAF9F5] border border-slate-200 rounded-2xl px-4 py-2 text-xs text-slate-800 focus:outline-none focus:border-emerald-500"
            />
            <button
              onClick={() => addUnit(subject.id)}
              className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold px-4 py-2 rounded-2xl text-xs transition-colors"
            >
              Add Unit
            </button>
          </div>
        </div>
      ))}

      {classroom.subjects.length === 0 && (
        <p className="text-center text-slate-400 text-xs py-8">
          No subjects created yet. Add one above to start uploading syllabus
          PDFs!
        </p>
      )}
    </div>
  );
};

const RequestsTab: React.FC<{
  classroom: Classroom;
  onChanged: () => Promise<void>;
}> = ({ classroom, onChanged }) => {
  const approve = async (id: string) => {
    await api.patch(`/classrooms/requests/${id}/approve`);
    onChanged();
  };
  const reject = async (id: string) => {
    await api.patch(`/classrooms/requests/${id}/reject`, {});
    onChanged();
  };

  return (
    <div className="space-y-4">
      {classroom.joinRequests.map((req) => (
        <div
          key={req.id}
          className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs"
        >
          <div className="flex items-center justify-between flex-wrap gap-4 mb-4">
            <div>
              <p className="font-bold text-slate-900">{req.student.name}</p>
              <p className="text-xs text-slate-500">{req.student.email}</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-2xl">
                <div className="text-xl font-bold text-emerald-700">
                  {Math.round(req.matchScore)}%
                </div>
                <div className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">
                  match score
                </div>
              </div>
              <button
                onClick={() => approve(req.id)}
                className="p-2.5 bg-emerald-100 text-emerald-800 rounded-2xl hover:bg-emerald-200 transition-colors font-bold"
              >
                <Check className="w-5 h-5" />
              </button>
              <button
                onClick={() => reject(req.id)}
                className="p-2.5 bg-rose-100 text-rose-800 rounded-2xl hover:bg-rose-200 transition-colors font-bold"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
          <div className="space-y-1.5">
            {req.matchReasons
              .filter((r) => r.applicable)
              .map((r, i) => (
                <div
                  key={i}
                  className={`text-xs font-medium flex items-center gap-2 ${r.passed ? "text-emerald-700" : "text-amber-700"}`}
                >
                  {r.passed ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <X className="w-3.5 h-3.5 text-amber-600" />
                  )}{" "}
                  {r.detail}
                </div>
              ))}
            {req.matchReasons.filter((r) => r.applicable).length === 0 && (
              <p className="text-xs text-slate-500">
                This classroom has no admission criteria set — every student
                matches by default.
              </p>
            )}
          </div>
        </div>
      ))}
      {classroom.joinRequests.length === 0 && (
        <p className="text-center text-slate-400 text-xs py-8">
          No pending join requests.
        </p>
      )}
    </div>
  );
};

const RosterTab: React.FC<{ classroom: Classroom }> = ({ classroom }) => (
  <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
    <table className="w-full text-left border-collapse">
      <thead>
        <tr className="bg-[#FAF9F5] border-b border-slate-200 text-xs font-bold text-slate-600 uppercase tracking-wider">
          <th className="p-4">Name</th>
          <th className="p-4">Latest score</th>
          <th className="p-4">Attention span</th>
          <th className="p-4">Preferred mode</th>
          <th className="p-4">XP</th>
          <th className="p-4">Streak</th>
          <th className="p-4">Badges</th>
          <th className="p-4">Joined</th>
        </tr>
      </thead>
      <tbody className="text-sm">
        {classroom.enrolments.map((e) => {
          const attempt = e.student.attempts[0];
          const progress = e.student.progress;
          return (
            <tr
              key={e.id}
              className="border-b border-slate-100 hover:bg-[#FAF9F5]"
            >
              <td className="p-4">
                <div className="font-bold text-slate-900">{e.student.name}</div>
                <div className="text-xs text-slate-500">{e.student.email}</div>
              </td>
              <td className="p-4">
                {attempt ? (
                  <span
                    className={`font-bold ${attempt.scorePercent >= 70 ? "text-emerald-700" : attempt.scorePercent >= 40 ? "text-amber-700" : "text-rose-700"}`}
                  >
                    {Math.round(attempt.scorePercent)}%
                  </span>
                ) : (
                  <span className="text-slate-400 text-xs">No attempt</span>
                )}
              </td>
              <td className="p-4 text-slate-700 font-medium">
                {attempt ? `${Math.round(attempt.attentionSpanScore)}%` : "—"}
              </td>
              <td className="p-4 text-slate-700 font-medium">
                {attempt?.preferredMode || "—"}
              </td>
              <td className="p-4 text-slate-700 font-medium">
                {progress?.xp ?? 0}
              </td>
              <td className="p-4 text-slate-700 font-medium">
                {progress?.streakDays ?? 0}d
              </td>
              <td className="p-4 text-slate-700 font-medium">
                {progress?.badges.length ?? 0}
              </td>
              <td className="p-4 text-slate-500 text-xs font-medium">
                {new Date(e.joinedAt).toLocaleDateString()}
              </td>
            </tr>
          );
        })}
        {classroom.enrolments.length === 0 && (
          <tr>
            <td colSpan={8} className="p-8 text-center text-slate-400 text-xs">
              No students enrolled in this classroom yet.
            </td>
          </tr>
        )}
      </tbody>
    </table>
  </div>
);

const CriteriaTab: React.FC<{
  classroom: Classroom;
  onChanged: () => Promise<void>;
}> = ({ classroom, onChanged }) => {
  const c = classroom.admissionCriteria || {};
  const [form, setForm] = useState({
    minAttentionSpanScore: c.minAttentionSpanScore ?? "",
    maxAttentionSpanScore: c.maxAttentionSpanScore ?? "",
    minScorePercent: c.minScorePercent ?? "",
    maxScorePercent: c.maxScorePercent ?? "",
    preferredModes: (c.preferredModes
      ? JSON.parse(
          typeof c.preferredModes === "string"
            ? c.preferredModes
            : JSON.stringify(c.preferredModes),
        )
      : []) as string[],
    arRecommendedOnly: c.arRecommendedOnly ?? null,
  });
  const [saving, setSaving] = useState(false);

  const toggleMode = (mode: string) => {
    setForm((f) => ({
      ...f,
      preferredModes: f.preferredModes.includes(mode)
        ? f.preferredModes.filter((m) => m !== mode)
        : [...f.preferredModes, mode],
    }));
  };

  const save = async () => {
    setSaving(true);
    try {
      const num = (v: any) => (v === "" ? null : Number(v));
      await api.put(`/classrooms/${classroom.id}/criteria`, {
        minAttentionSpanScore: num(form.minAttentionSpanScore),
        maxAttentionSpanScore: num(form.maxAttentionSpanScore),
        minScorePercent: num(form.minScorePercent),
        maxScorePercent: num(form.maxScorePercent),
        preferredModes: form.preferredModes,
        arRecommendedOnly: form.arRecommendedOnly,
      });
      await onChanged();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white p-8 rounded-3xl border border-slate-200/80 shadow-xs max-w-2xl space-y-6">
      <p className="text-xs text-slate-600 leading-relaxed font-medium">
        Define criteria for matching students to this classroom. Every field is
        optional — leave blank for no constraint.
      </p>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            Min Attention Span %
          </label>
          <input
            type="number"
            value={form.minAttentionSpanScore}
            onChange={(e) =>
              setForm({ ...form, minAttentionSpanScore: e.target.value })
            }
            className="w-full bg-[#FAF9F5] border border-slate-200 rounded-2xl px-4 py-2.5 text-slate-800 text-sm focus:outline-none focus:border-emerald-500"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            Max Attention Span %
          </label>
          <input
            type="number"
            value={form.maxAttentionSpanScore}
            onChange={(e) =>
              setForm({ ...form, maxAttentionSpanScore: e.target.value })
            }
            className="w-full bg-[#FAF9F5] border border-slate-200 rounded-2xl px-4 py-2.5 text-slate-800 text-sm focus:outline-none focus:border-emerald-500"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            Min Assessment Score %
          </label>
          <input
            type="number"
            value={form.minScorePercent}
            onChange={(e) =>
              setForm({ ...form, minScorePercent: e.target.value })
            }
            className="w-full bg-[#FAF9F5] border border-slate-200 rounded-2xl px-4 py-2.5 text-slate-800 text-sm focus:outline-none focus:border-emerald-500"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            Max Assessment Score %
          </label>
          <input
            type="number"
            value={form.maxScorePercent}
            onChange={(e) =>
              setForm({ ...form, maxScorePercent: e.target.value })
            }
            className="w-full bg-[#FAF9F5] border border-slate-200 rounded-2xl px-4 py-2.5 text-slate-800 text-sm focus:outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
          Preferred Learning Modes
        </label>
        <div className="flex gap-2">
          {["TEXT", "AUDIO", "VISUAL"].map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => toggleMode(mode)}
              className={`px-4 py-2 rounded-2xl text-xs font-bold border transition-all ${form.preferredModes.includes(mode) ? "bg-emerald-50 border-emerald-500 text-emerald-900 shadow-xs" : "border-slate-200 bg-[#FAF9F5] text-slate-600"}`}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      <label className="flex items-center gap-3 text-xs font-bold text-slate-700">
        <input
          type="checkbox"
          checked={!!form.arRecommendedOnly}
          onChange={(e) =>
            setForm({ ...form, arRecommendedOnly: e.target.checked })
          }
          className="w-4 h-4 accent-emerald-500"
        />
        <span>Only recommend to students flagged for the AR track</span>
      </label>

      <button
        onClick={save}
        disabled={saving}
        className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 px-6 rounded-2xl shadow-md border-b-4 border-emerald-700 active:translate-y-0.5 active:border-b-2 transition-all text-sm"
      >
        {saving ? "Saving..." : "Save Criteria"}
      </button>
    </div>
  );
};

export default TeacherDashboardPage;
