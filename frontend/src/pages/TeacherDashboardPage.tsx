import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Users, BookOpen, ClipboardCheck, Settings, Clock, Check, X,
  Plus, Upload, FileText, Loader2, AlertCircle, Bell, Video, Sparkles
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import DashboardShell, { NavItem } from '../components/DashboardShell';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Modal from '../components/ui/Modal';
import api from '../lib/api';

interface Unit {
  id: string;
  title: string;
  order: number;
  indexStatus: 'NOT_INDEXED' | 'PROCESSING' | 'READY' | 'FAILED';
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
  matchReasons: Array<{ label: string; applicable: boolean; passed: boolean; detail: string }>;
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

/** Shown when a self-registered teacher hasn't been approved by an admin yet (PLAN.md 4.3). */
const PendingApproval: React.FC<{ status: string }> = ({ status }) => (
  <div className="min-h-screen bg-dark flex items-center justify-center p-6">
    <div className="glass-strong max-w-md w-full p-10 rounded-3xl text-center">
      <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-amber-500/20 flex items-center justify-center">
        <Clock className="w-8 h-8 text-amber-400" />
      </div>
      <h1 className="text-2xl font-display font-bold mb-3">
        {status === 'REJECTED' ? 'Application not approved' : status === 'SUSPENDED' ? 'Account suspended' : 'Pending approval'}
      </h1>
      <p className="text-gray-400">
        {status === 'PENDING' &&
          'Your teacher account is waiting for an admin to review it. You will be able to create a classroom as soon as it is approved.'}
        {status === 'REJECTED' && 'An administrator reviewed your teacher application and did not approve it.'}
        {status === 'SUSPENDED' && 'Your teacher account has been suspended. Contact an administrator for details.'}
      </p>
    </div>
  </div>
);

export const TeacherDashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [classroom, setClassroom] = useState<Classroom | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'content' | 'requests' | 'roster' | 'criteria' | 'youtube'>('overview');

  const [newClassroom, setNewClassroom] = useState({ name: '', description: '' });
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    const { data } = await api.get('/classrooms/mine');
    setClassroom(data.classroom);
  }, []);

  useEffect(() => {
    if (user?.teacherStatus === 'APPROVED') {
      load().finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [user, load]);

  if (user?.role === 'TEACHER' && user.teacherStatus !== 'APPROVED') {
    return <PendingApproval status={user.teacherStatus || 'PENDING'} />;
  }

  const navItems: NavItem[] = [
    { icon: LayoutDashboard, label: 'Overview', path: '', active: activeTab === 'overview', onClick: () => setActiveTab('overview') },
    { icon: BookOpen, label: 'Subjects & Content', path: '', active: activeTab === 'content', onClick: () => setActiveTab('content') },
    { icon: ClipboardCheck, label: 'Join Requests', path: '', active: activeTab === 'requests', badge: classroom?.joinRequests.length, onClick: () => setActiveTab('requests') },
    { icon: Users, label: 'Roster', path: '', active: activeTab === 'roster', onClick: () => setActiveTab('roster') },
    { icon: Settings, label: 'Admission Criteria', path: '', active: activeTab === 'criteria', onClick: () => setActiveTab('criteria') },
    { icon: Video, label: 'YouTube Quiz', path: '', active: activeTab === 'youtube', onClick: () => setActiveTab('youtube') }
  ];

  const createClassroom = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      await api.post('/classrooms', newClassroom);
      await load();
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-dark flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!classroom) {
    return (
      <div className="min-h-screen bg-dark flex items-center justify-center p-6">
        <div className="glass-strong max-w-lg w-full p-10 rounded-3xl">
          <h1 className="text-2xl font-display font-bold mb-2">Create your classroom</h1>
          <p className="text-gray-400 mb-6">Every teacher starts with one classroom. You can tune who fits it after you create it.</p>
          <form onSubmit={createClassroom} className="space-y-4">
            <Input
              label="Classroom name"
              value={newClassroom.name}
              onChange={(e) => setNewClassroom({ ...newClassroom, name: e.target.value })}
              placeholder="Adaptive Learners - Grade 3"
              required
            />
            <Input
              label="Description (optional)"
              value={newClassroom.description}
              onChange={(e) => setNewClassroom({ ...newClassroom, description: e.target.value })}
              placeholder="What is this classroom tuned for?"
            />
            <Button type="submit" className="w-full" loading={creating}>Create classroom</Button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <DashboardShell navItems={navItems}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-6xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold">{classroom.name}</h1>
            <p className="text-gray-400">{classroom.description || 'No description yet.'}</p>
          </div>
          <NotificationBell />
        </div>

        {/* Simple hash-nav via local tab state, matching the sidebar buttons above */}
        <TeacherTabButtons active={activeTab} setActive={setActiveTab} pendingCount={classroom.joinRequests.length} />

        {activeTab === 'overview' && <OverviewTab classroom={classroom} />}
        {activeTab === 'content' && <ContentTab classroom={classroom} onChanged={load} />}
        {activeTab === 'requests' && <RequestsTab classroom={classroom} onChanged={load} />}
        {activeTab === 'roster' && <RosterTab classroom={classroom} />}
        {activeTab === 'criteria' && <CriteriaTab classroom={classroom} onChanged={load} />}
        {activeTab === 'youtube' && <YoutubeQuizTab />}
      </motion.div>
    </DashboardShell>
  );
};

const TeacherTabButtons: React.FC<{
  active: string;
  setActive: (t: any) => void;
  pendingCount: number;
}> = ({ active, setActive, pendingCount }) => (
  <div className="flex overflow-x-auto space-x-2 bg-dark-card p-1.5 rounded-xl border border-white/5 md:hidden">
    {[
      ['overview', 'Overview'],
      ['content', 'Content'],
      ['requests', `Requests${pendingCount ? ` (${pendingCount})` : ''}`],
      ['roster', 'Roster'],
      ['criteria', 'Criteria'],
      ['youtube', 'YouTube Quiz']
    ].map(([id, label]) => (
      <button
        key={id}
        onClick={() => setActive(id)}
        className={`px-4 py-2 rounded-lg text-sm whitespace-nowrap ${active === id ? 'bg-primary text-white' : 'text-gray-400'}`}
      >
        {label}
      </button>
    ))}
  </div>
);

const OverviewTab: React.FC<{ classroom: Classroom }> = ({ classroom }) => (
  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
    {[
      { label: 'Students enrolled', value: classroom.enrolments.length },
      { label: 'Pending requests', value: classroom.joinRequests.length },
      { label: 'Subjects', value: classroom.subjects.length }
    ].map((s, i) => (
      <div key={i} className="glass p-6 rounded-2xl">
        <div className="text-gray-400 text-sm mb-2">{s.label}</div>
        <div className="text-3xl font-bold">{s.value}</div>
      </div>
    ))}
  </div>
);

interface NotificationItem {
  id: string;
  type: 'GENERATION_COMPLETE' | 'GENERATION_FAILED';
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
}

/**
 * In-app notifications (TODO.md Phase 6) - written automatically when a
 * background curriculum-generation job finishes or fails. Polled rather
 * than pushed since there's no websocket/SSE infra in this app.
 */
const NotificationBell: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/notifications');
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    } catch {
      /* silent - the bell just won't update this tick */
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, [load]);

  const markRead = async (id: string) => {
    await api.patch(`/notifications/${id}/read`).catch(() => {});
    load();
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative w-11 h-11 rounded-xl border border-white/10 flex items-center justify-center hover:border-primary transition-colors"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-primary text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto glass-strong rounded-2xl border border-white/10 shadow-2xl z-40"
          >
            {notifications.length === 0 ? (
              <p className="text-sm text-gray-400 p-4">No notifications yet.</p>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => markRead(n.id)}
                  className={`w-full text-left px-4 py-3 border-b border-white/5 hover:bg-white/5 ${!n.read ? 'bg-primary/5' : ''}`}
                >
                  <p className={`text-sm font-medium ${n.type === 'GENERATION_FAILED' ? 'text-red-400' : 'text-green-400'}`}>
                    {n.title}
                  </p>
                  <p className="text-xs text-gray-400 mt-1 line-clamp-2">{n.body}</p>
                </button>
              ))
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const RAG_SERVICE_URL = import.meta.env.VITE_RAG_SERVICE_URL || 'http://localhost:8100';

/**
 * The auto-generated preview (text + picture) that starts building in the
 * background the moment a unit's PDF finishes indexing - shown here so a
 * teacher can see it "come alive" without opening the student tutorial view.
 */
const UnitPreviewBadge: React.FC<{ unitId: string; ready: boolean }> = ({ unitId, ready }) => {
  const [preview, setPreview] = useState<{ status: string; imageUrl: string | null } | null>(null);

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
  if (preview.status === 'PROCESSING') {
    return (
      <span className="flex items-center gap-1 text-xs text-gray-500">
        <Loader2 className="w-3 h-3 animate-spin" /> preparing visuals&hellip;
      </span>
    );
  }
  if (preview.status === 'READY' && preview.imageUrl) {
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

const ContentTab: React.FC<{ classroom: Classroom; onChanged: () => Promise<void> }> = ({ classroom, onChanged }) => {
  const [subjectName, setSubjectName] = useState('');
  const [unitTitleFor, setUnitTitleFor] = useState<Record<string, string>>({});
  const [uploadingUnit, setUploadingUnit] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState('');

  const addSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subjectName.trim()) return;
    await api.post(`/classrooms/${classroom.id}/subjects`, { name: subjectName });
    setSubjectName('');
    onChanged();
  };

  const addUnit = async (subjectId: string) => {
    const title = unitTitleFor[subjectId]?.trim();
    if (!title) return;
    await api.post(`/subjects/${subjectId}/units`, { title });
    setUnitTitleFor({ ...unitTitleFor, [subjectId]: '' });
    onChanged();
  };

  const abortControllersRef = useRef<Record<string, AbortController>>({});

  const uploadDocument = async (unitId: string, file: File) => {
    setUploadError('');
    setUploadingUnit(unitId);
    const controller = new AbortController();
    abortControllersRef.current[unitId] = controller;
    try {
      const form = new FormData();
      form.append('file', file);
      await api.post(`/units/${unitId}/documents`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
        signal: controller.signal
      });
      await onChanged();
    } catch (err: any) {
      // A user-triggered cancel isn't a failure worth alarming them about.
      if (err.code !== 'ERR_CANCELED' && err.name !== 'CanceledError') {
        setUploadError(err.response?.data?.error || 'Upload failed');
      }
    } finally {
      delete abortControllersRef.current[unitId];
      setUploadingUnit(null);
    }
  };

  const cancelUpload = (unitId: string) => {
    abortControllersRef.current[unitId]?.abort();
  };

  const statusBadge = (status: Unit['indexStatus']) => {
    const map: Record<Unit['indexStatus'], string> = {
      NOT_INDEXED: 'bg-gray-700 text-gray-300',
      PROCESSING: 'bg-amber-500/20 text-amber-400',
      READY: 'bg-green-500/20 text-green-400',
      FAILED: 'bg-red-500/20 text-red-400'
    };
    return <span className={`text-xs px-2 py-0.5 rounded ${map[status]}`}>{status.replace('_', ' ')}</span>;
  };

  return (
    <div className="space-y-6">
      {uploadError && (
        <div className="bg-red-500/10 border border-red-500/40 text-red-400 p-4 rounded-xl text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" /> {uploadError}
        </div>
      )}

      <form onSubmit={addSubject} className="glass p-6 rounded-2xl flex gap-3 items-end">
        <div className="flex-1">
          <Input label="New subject" value={subjectName} onChange={(e) => setSubjectName(e.target.value)} placeholder="e.g. Mathematics" />
        </div>
        <Button type="submit" className="gap-2"><Plus className="w-4 h-4" /> Add subject</Button>
      </form>

      {classroom.subjects.map((subject) => (
        <div key={subject.id} className="glass rounded-2xl p-6">
          <h3 className="text-lg font-bold mb-4">{subject.name}</h3>

          <div className="space-y-3">
            {subject.units.map((unit) => (
              <div key={unit.id} className="bg-dark/50 border border-white/5 rounded-xl p-4 flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3">
                  <FileText className="w-4 h-4 text-gray-400" />
                  <span className="font-medium">{unit.title}</span>
                  {statusBadge(unit.indexStatus)}
                  <span className="text-xs text-gray-500">{unit._count?.documents || 0} document(s)</span>
                  <UnitPreviewBadge unitId={unit.id} ready={unit.indexStatus === 'READY'} />
                </div>
                {uploadingUnit === unit.id ? (
                  <div className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg border border-white/10">
                    <Loader2 className="w-4 h-4 animate-spin" /> Processing…
                    <button
                      type="button"
                      onClick={() => cancelUpload(unit.id)}
                      className="text-red-400 hover:text-red-300 font-medium ml-1"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <label className="cursor-pointer text-xs px-3 py-2 rounded-lg border border-white/10 flex items-center gap-2 hover:border-primary">
                    <Upload className="w-4 h-4" />
                    Upload PDF
                    <input
                      type="file"
                      accept="application/pdf"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) uploadDocument(unit.id, file);
                        e.target.value = '';
                      }}
                    />
                  </label>
                )}
              </div>
            ))}
          </div>

          <div className="flex gap-3 mt-4">
            <input
              value={unitTitleFor[subject.id] || ''}
              onChange={(e) => setUnitTitleFor({ ...unitTitleFor, [subject.id]: e.target.value })}
              placeholder="New unit title, e.g. Unit 3 - Fractions"
              className="flex-1 bg-dark-card border border-dark-border rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-primary"
            />
            <Button size="sm" variant="ghost" onClick={() => addUnit(subject.id)}>Add unit</Button>
          </div>
        </div>
      ))}

      {classroom.subjects.length === 0 && (
        <p className="text-center text-gray-500 py-8">No subjects yet. Add one above to start uploading syllabus PDFs.</p>
      )}
    </div>
  );
};

interface YoutubeQuizQuestion {
  id: string;
  order: number;
  question: string;
  options: string[];
  correct: string;
}
interface YoutubeQuiz {
  id: string;
  sourceUrl: string;
  status: 'QUEUED' | 'FETCHING_TRANSCRIPT' | 'GENERATING_QUESTIONS' | 'READY' | 'FAILED';
  errorMessage: string | null;
  title: string | null;
  questions: YoutubeQuizQuestion[];
  createdAt: string;
}

const YOUTUBE_QUIZ_STATUS_LABEL: Record<YoutubeQuiz['status'], string> = {
  QUEUED: 'Queued',
  FETCHING_TRANSCRIPT: 'Fetching transcript…',
  GENERATING_QUESTIONS: 'Generating questions…',
  READY: 'Ready',
  FAILED: 'Failed'
};

/**
 * Paste a YouTube URL -> background job fetches the transcript (SerpApi)
 * and generates a quiz from it (Gemini) - TODO.md Phase 11. Polls rather
 * than blocking, same pattern as generation-job status elsewhere.
 */
const YoutubeQuizTab: React.FC = () => {
  const [url, setUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [quizzes, setQuizzes] = useState<YoutubeQuiz[]>([]);

  const load = useCallback(async () => {
    const { data } = await api.get('/youtube-quiz');
    setQuizzes(data.quizzes);
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 8000);
    return () => clearInterval(interval);
  }, [load]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;
    setError('');
    setSubmitting(true);
    try {
      await api.post('/youtube-quiz', { url: url.trim() });
      setUrl('');
      await load();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Could not start quiz generation');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-500/10 border border-red-500/40 text-red-400 p-4 rounded-xl text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      <form onSubmit={submit} className="glass p-6 rounded-2xl flex flex-col sm:flex-row gap-3 sm:items-end">
        <div className="flex-1">
          <Input
            label="YouTube video URL"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=..."
          />
        </div>
        <Button type="submit" loading={submitting} className="gap-2">
          <Sparkles className="w-4 h-4" /> Generate quiz
        </Button>
      </form>

      <div className="space-y-3">
        {quizzes.map((quiz) => (
          <div key={quiz.id} className="glass rounded-2xl p-6">
            <div className="flex items-center justify-between gap-4 flex-wrap mb-2">
              <div className="flex items-center gap-3">
                <Video className="w-4 h-4 text-red-400" />
                <span className="font-medium">{quiz.title || quiz.sourceUrl}</span>
              </div>
              <span
                className={`text-xs px-2 py-0.5 rounded flex items-center gap-1.5 ${
                  quiz.status === 'READY'
                    ? 'bg-green-500/20 text-green-400'
                    : quiz.status === 'FAILED'
                    ? 'bg-red-500/20 text-red-400'
                    : 'bg-amber-500/20 text-amber-400'
                }`}
              >
                {(quiz.status === 'QUEUED' || quiz.status === 'FETCHING_TRANSCRIPT' || quiz.status === 'GENERATING_QUESTIONS') && (
                  <Loader2 className="w-3 h-3 animate-spin" />
                )}
                {YOUTUBE_QUIZ_STATUS_LABEL[quiz.status]}
              </span>
            </div>

            {quiz.status === 'FAILED' && quiz.errorMessage && (
              <p className="text-xs text-red-400 mt-2">{quiz.errorMessage}</p>
            )}

            {quiz.status === 'READY' && (
              <div className="space-y-3 mt-3">
                {quiz.questions.map((q, i) => (
                  <div key={q.id} className="bg-dark/50 rounded-xl p-4 text-sm">
                    <p className="font-medium mb-2">{i + 1}. {q.question}</p>
                    <ul className="text-gray-400 space-y-1">
                      {q.options.map((opt) => (
                        <li key={opt} className={opt === q.correct ? 'text-green-400' : ''}>
                          {opt === q.correct ? '✓ ' : '• '}{opt}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

        {quizzes.length === 0 && (
          <p className="text-center text-gray-500 py-8">No YouTube quizzes yet - paste a URL above to generate one.</p>
        )}
      </div>
    </div>
  );
};

const RequestsTab: React.FC<{ classroom: Classroom; onChanged: () => Promise<void> }> = ({ classroom, onChanged }) => {
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
        <div key={req.id} className="glass p-6 rounded-2xl">
          <div className="flex items-center justify-between flex-wrap gap-4 mb-4">
            <div>
              <p className="font-bold">{req.student.name}</p>
              <p className="text-sm text-gray-400">{req.student.email}</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-2xl font-bold text-primary-light">{Math.round(req.matchScore)}%</div>
                <div className="text-xs text-gray-500">match score</div>
              </div>
              <button onClick={() => approve(req.id)} className="p-2 bg-green-500/10 border border-green-500/30 text-green-400 rounded-lg hover:bg-green-500/20">
                <Check className="w-5 h-5" />
              </button>
              <button onClick={() => reject(req.id)} className="p-2 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg hover:bg-red-500/20">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
          <div className="space-y-1.5">
            {req.matchReasons.filter((r) => r.applicable).map((r, i) => (
              <div key={i} className={`text-xs flex items-center gap-2 ${r.passed ? 'text-green-400' : 'text-amber-400'}`}>
                {r.passed ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />} {r.detail}
              </div>
            ))}
            {req.matchReasons.filter((r) => r.applicable).length === 0 && (
              <p className="text-xs text-gray-500">This classroom has no admission criteria set - every student matches by default.</p>
            )}
          </div>
        </div>
      ))}
      {classroom.joinRequests.length === 0 && <p className="text-center text-gray-500 py-8">No pending requests.</p>}
    </div>
  );
};

const RosterTab: React.FC<{ classroom: Classroom }> = ({ classroom }) => (
  <div className="glass rounded-2xl overflow-hidden">
    <table className="w-full text-left border-collapse">
      <thead>
        <tr className="bg-white/5 border-b border-white/10 text-sm">
          <th className="p-4 font-medium text-gray-300">Name</th>
          <th className="p-4 font-medium text-gray-300">Latest score</th>
          <th className="p-4 font-medium text-gray-300">Attention span</th>
          <th className="p-4 font-medium text-gray-300">Preferred mode</th>
          <th className="p-4 font-medium text-gray-300">XP</th>
          <th className="p-4 font-medium text-gray-300">Streak</th>
          <th className="p-4 font-medium text-gray-300">Badges</th>
          <th className="p-4 font-medium text-gray-300">Joined</th>
        </tr>
      </thead>
      <tbody>
        {classroom.enrolments.map((e) => {
          const attempt = e.student.attempts[0];
          const progress = e.student.progress;
          return (
            <tr key={e.id} className="border-b border-white/5">
              <td className="p-4">
                <div className="font-medium">{e.student.name}</div>
                <div className="text-xs text-gray-500">{e.student.email}</div>
              </td>
              <td className="p-4">
                {attempt ? (
                  <span className={attempt.scorePercent >= 70 ? 'text-green-400' : attempt.scorePercent >= 40 ? 'text-amber-400' : 'text-red-400'}>
                    {Math.round(attempt.scorePercent)}%
                  </span>
                ) : (
                  <span className="text-gray-500">No attempt yet</span>
                )}
              </td>
              <td className="p-4 text-gray-300">{attempt ? `${Math.round(attempt.attentionSpanScore)}%` : '—'}</td>
              <td className="p-4 text-gray-300">{attempt?.preferredMode || '—'}</td>
              <td className="p-4 text-gray-300">{progress?.xp ?? 0}</td>
              <td className="p-4 text-gray-300">{progress?.streakDays ?? 0}d</td>
              <td className="p-4 text-gray-300">{progress?.badges.length ?? 0}</td>
              <td className="p-4 text-gray-400 text-sm">{new Date(e.joinedAt).toLocaleDateString()}</td>
            </tr>
          );
        })}
        {classroom.enrolments.length === 0 && (
          <tr><td colSpan={8} className="p-8 text-center text-gray-500">No students enrolled yet.</td></tr>
        )}
      </tbody>
    </table>
  </div>
);

const CriteriaTab: React.FC<{ classroom: Classroom; onChanged: () => Promise<void> }> = ({ classroom, onChanged }) => {
  const c = classroom.admissionCriteria || {};
  const [form, setForm] = useState({
    minAttentionSpanScore: c.minAttentionSpanScore ?? '',
    maxAttentionSpanScore: c.maxAttentionSpanScore ?? '',
    minScorePercent: c.minScorePercent ?? '',
    maxScorePercent: c.maxScorePercent ?? '',
    preferredModes: (c.preferredModes ? JSON.parse(typeof c.preferredModes === 'string' ? c.preferredModes : JSON.stringify(c.preferredModes)) : []) as string[],
    arRecommendedOnly: c.arRecommendedOnly ?? null
  });
  const [saving, setSaving] = useState(false);

  const toggleMode = (mode: string) => {
    setForm((f) => ({
      ...f,
      preferredModes: f.preferredModes.includes(mode) ? f.preferredModes.filter((m) => m !== mode) : [...f.preferredModes, mode]
    }));
  };

  const save = async () => {
    setSaving(true);
    try {
      const num = (v: any) => (v === '' ? null : Number(v));
      await api.put(`/classrooms/${classroom.id}/criteria`, {
        minAttentionSpanScore: num(form.minAttentionSpanScore),
        maxAttentionSpanScore: num(form.maxAttentionSpanScore),
        minScorePercent: num(form.minScorePercent),
        maxScorePercent: num(form.maxScorePercent),
        preferredModes: form.preferredModes,
        arRecommendedOnly: form.arRecommendedOnly
      });
      await onChanged();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="glass p-6 rounded-2xl max-w-2xl space-y-6">
      <p className="text-sm text-gray-400">
        Define what kind of learner this classroom fits best. Every field is optional - leave blank for no
        constraint on that axis. Students see exactly which of these they matched when they request to join.
      </p>

      <div className="grid grid-cols-2 gap-4">
        <Input label="Min attention span %" type="number" value={form.minAttentionSpanScore} onChange={(e) => setForm({ ...form, minAttentionSpanScore: e.target.value })} />
        <Input label="Max attention span %" type="number" value={form.maxAttentionSpanScore} onChange={(e) => setForm({ ...form, maxAttentionSpanScore: e.target.value })} />
        <Input label="Min assessment score %" type="number" value={form.minScorePercent} onChange={(e) => setForm({ ...form, minScorePercent: e.target.value })} />
        <Input label="Max assessment score %" type="number" value={form.maxScorePercent} onChange={(e) => setForm({ ...form, maxScorePercent: e.target.value })} />
      </div>

      <div>
        <label className="text-sm text-gray-400 mb-2 block">Preferred learning modes</label>
        <div className="flex gap-2">
          {['TEXT', 'AUDIO', 'VISUAL'].map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => toggleMode(mode)}
              className={`px-4 py-2 rounded-lg text-sm border ${form.preferredModes.includes(mode) ? 'bg-primary/20 border-primary text-white' : 'border-white/10 text-gray-400'}`}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      <label className="flex items-center gap-3">
        <input
          type="checkbox"
          checked={!!form.arRecommendedOnly}
          onChange={(e) => setForm({ ...form, arRecommendedOnly: e.target.checked })}
          className="w-4 h-4"
        />
        <span className="text-sm">Only recommend to students flagged for the AR track</span>
      </label>

      <Button onClick={save} loading={saving}>Save criteria</Button>
    </div>
  );
};

export default TeacherDashboardPage;
