import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Users, FileText, Database, CreditCard, Plus, Trash2, GraduationCap, Check, X, ArrowLeft, SlidersHorizontal, Loader2, Pencil, Image as ImageIcon, Upload } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../lib/api';

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'TEACHER' | 'STUDENT';
  createdAt: string;
}

interface Teacher {
  id: string;
  name: string;
  email: string;
  teacherStatus: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
  teacherNote: string | null;
  createdAt: string;
  classroomTaught: { id: string; name: string } | null;
}

interface AdminQuestion {
  id: string;
  subject: string;
  question: string;
  options: string[];
  answer: string;
  learningMode: string;
  imageUrl?: string | null;
}

interface AdminPayment {
  id: string;
  plan: string;
  paymentStatus: string;
  createdAt: string;
  user: { name: string; email: string };
}

interface Analytics {
  totalUsers: number;
  activeSubscriptions: number;
  avgEngagement: { TEXT: number; AUDIO: number; VISUAL: number };
}

export const AdminPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('Overview');
  const [isQuestionModalOpen, setIsQuestionModalOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<AdminQuestion | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [rejectingTeacher, setRejectingTeacher] = useState<Teacher | null>(null);
  const [rejectNote, setRejectNote] = useState('');

  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [questions, setQuestions] = useState<AdminQuestion[]>([]);
  const [payments, setPayments] = useState<AdminPayment[]>([]);
  const [loading, setLoading] = useState(false);

  const [newQuestion, setNewQuestion] = useState({
    subject: '', question: '', optionA: '', optionB: '', optionC: '', optionD: '', answer: '', imageUrl: '', learningMode: 'TEXT'
  });

  const openCreateModal = () => {
    setEditingQuestion(null);
    setNewQuestion({ subject: '', question: '', optionA: '', optionB: '', optionC: '', optionD: '', answer: '', imageUrl: '', learningMode: 'TEXT' });
    setIsQuestionModalOpen(true);
  };

  const openEditModal = (q: AdminQuestion) => {
    setEditingQuestion(q);
    const opts = Array.isArray(q.options) ? q.options : (typeof q.options === 'string' ? JSON.parse(q.options) : []);
    setNewQuestion({
      subject: q.subject,
      question: q.question,
      optionA: opts[0] || '',
      optionB: opts[1] || '',
      optionC: opts[2] || '',
      optionD: opts[3] || '',
      answer: q.answer,
      imageUrl: q.imageUrl || '',
      learningMode: q.learningMode,
    });
    setIsQuestionModalOpen(true);
  };

  const [gradeLevel, setGradeLevel] = useState('');
  const [savingGrade, setSavingGrade] = useState(false);
  const [gradeSaved, setGradeSaved] = useState(false);

  const pendingCount = teachers.filter((t) => t.teacherStatus === 'PENDING').length;

  const loadOverview = useCallback(async () => {
    const { data } = await api.get('/admin/analytics');
    setAnalytics(data);
  }, []);

  const loadUsers = useCallback(async () => {
    const { data } = await api.get('/admin/users?limit=100');
    setUsers(data.users);
  }, []);

  const loadTeachers = useCallback(async () => {
    const { data } = await api.get('/admin/teachers');
    setTeachers(data.teachers);
  }, []);

  const loadQuestions = useCallback(async () => {
    const { data } = await api.get('/admin/questions?limit=50');
    setQuestions(data.questions);
  }, []);

  const loadPayments = useCallback(async () => {
    const { data } = await api.get('/admin/payments');
    setPayments(data);
  }, []);

  const loadConfig = useCallback(async () => {
    const { data } = await api.get('/admin/config');
    setGradeLevel(data.config?.gradeLevel || '');
  }, []);

  const saveGrade = async () => {
    if (!gradeLevel.trim()) return;
    setSavingGrade(true);
    setGradeSaved(false);
    try {
      await api.patch('/admin/config', { gradeLevel: gradeLevel.trim() });
      setGradeSaved(true);
      setTimeout(() => setGradeSaved(false), 3000);
    } finally {
      setSavingGrade(false);
    }
  };

  useEffect(() => {
    loadTeachers().catch(() => undefined);
  }, [loadTeachers]);

  useEffect(() => {
    setLoading(true);
    const loaders: Record<string, () => Promise<void>> = {
      Overview: loadOverview,
      Users: loadUsers,
      Teachers: loadTeachers,
      Questions: loadQuestions,
      Payments: loadPayments,
      Settings: loadConfig
    };
    loaders[activeTab]?.()
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, [activeTab, loadOverview, loadUsers, loadTeachers, loadQuestions, loadPayments, loadConfig]);

  const changeRole = async (userId: string, role: string) => {
    await api.patch(`/admin/users/${userId}`, { role });
    loadUsers();
  };

  const deleteUser = async (userId: string) => {
    if (!confirm('Delete this user? This cannot be undone.')) return;
    await api.delete(`/admin/users/${userId}`);
    loadUsers();
  };

  const approveTeacher = async (id: string) => {
    await api.patch(`/admin/teachers/${id}/approve`);
    loadTeachers();
  };

  const submitReject = async () => {
    if (!rejectingTeacher) return;
    await api.patch(`/admin/teachers/${rejectingTeacher.id}/reject`, { note: rejectNote });
    setRejectingTeacher(null);
    setRejectNote('');
    loadTeachers();
  };

  const submitQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      subject: newQuestion.subject,
      question: newQuestion.question,
      options: [newQuestion.optionA, newQuestion.optionB, newQuestion.optionC, newQuestion.optionD].filter(Boolean),
      answer: newQuestion.answer,
      learningMode: newQuestion.learningMode,
      imageUrl: newQuestion.imageUrl.trim() || null,
    };

    if (editingQuestion) {
      await api.put(`/admin/questions/${editingQuestion.id}`, payload);
    } else {
      await api.post('/admin/questions', payload);
    }

    setIsQuestionModalOpen(false);
    setEditingQuestion(null);
    setNewQuestion({ subject: '', question: '', optionA: '', optionB: '', optionC: '', optionD: '', answer: '', imageUrl: '', learningMode: 'TEXT' });
    loadQuestions();
  };

  const deleteQuestion = async (id: string) => {
    if (!confirm('Delete this question?')) return;
    await api.delete(`/admin/questions/${id}`);
    loadQuestions();
  };

  const tabs = [
    { id: 'Overview', icon: Database },
    { id: 'Users', icon: Users },
    { id: 'Teachers', icon: GraduationCap, badge: pendingCount },
    { id: 'Questions', icon: FileText },
    { id: 'Payments', icon: CreditCard },
    { id: 'Settings', icon: SlidersHorizontal }
  ];

  const statusPill = (status: string) => {
    const tone =
      status === 'APPROVED' || status === 'SUCCESS'
        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
        : status === 'PENDING'
        ? 'bg-amber-50 text-amber-800 border-amber-200'
        : 'bg-rose-50 text-rose-800 border-rose-200';
    return <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${tone}`}>{status}</span>;
  };

  const renderOverview = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: 'Total Users', value: analytics?.totalUsers ?? '—' },
          { label: 'Active Subscriptions', value: analytics?.activeSubscriptions ?? '—' },
          { label: 'Pending Educators', value: pendingCount },
          {
            label: 'Avg Engagement (Text)',
            value: analytics ? `${Math.round(analytics.avgEngagement.TEXT)}%` : '—'
          }
        ].map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
            <div className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">{stat.label}</div>
            <div className="text-3xl font-bold text-slate-900 mb-1">{stat.value}</div>
          </div>
        ))}
      </div>
      {analytics && (
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
          <h3 className="text-base font-bold text-slate-900 mb-4">Engagement by Learning Mode</h3>
          <div className="space-y-4">
            {(['TEXT', 'AUDIO', 'VISUAL'] as const).map((mode) => (
              <div key={mode}>
                <div className="flex justify-between text-xs font-bold text-slate-700 mb-1.5">
                  <span>{mode}</span>
                  <span>{Math.round(analytics.avgEngagement[mode])}%</span>
                </div>
                <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${analytics.avgEngagement[mode]}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const renderUsers = () => (
    <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#FAF9F5] border-b border-slate-200 text-xs font-bold text-slate-600 uppercase tracking-wider">
              <th className="p-4">Name</th>
              <th className="p-4">Email</th>
              <th className="p-4">Role</th>
              <th className="p-4">Actions</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {users.map((u) => (
              <tr key={u.id} className="border-b border-slate-100 hover:bg-[#FAF9F5]">
                <td className="p-4 font-bold text-slate-900">{u.name}</td>
                <td className="p-4 text-slate-500">{u.email}</td>
                <td className="p-4">
                  <select
                    value={u.role}
                    onChange={(e) => changeRole(u.id, e.target.value)}
                    className="bg-[#FAF9F5] border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800"
                  >
                    <option value="STUDENT">STUDENT</option>
                    <option value="TEACHER">TEACHER</option>
                    <option value="ADMIN">ADMIN</option>
                  </select>
                </td>
                <td className="p-4">
                  <button
                    onClick={() => deleteUser(u.id)}
                    className="p-2 bg-rose-50 text-rose-700 rounded-xl hover:bg-rose-100 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
            {users.length === 0 && !loading && (
              <tr><td colSpan={4} className="p-8 text-center text-slate-400 text-xs">No users found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderTeachers = () => (
    <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#FAF9F5] border-b border-slate-200 text-xs font-bold text-slate-600 uppercase tracking-wider">
              <th className="p-4">Name</th>
              <th className="p-4">Email</th>
              <th className="p-4">Classroom</th>
              <th className="p-4">Status</th>
              <th className="p-4">Actions</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {teachers.map((t) => (
              <tr key={t.id} className="border-b border-slate-100 hover:bg-[#FAF9F5]">
                <td className="p-4 font-bold text-slate-900">{t.name}</td>
                <td className="p-4 text-slate-500">{t.email}</td>
                <td className="p-4 text-slate-600 font-medium">{t.classroomTaught?.name || '—'}</td>
                <td className="p-4">{statusPill(t.teacherStatus)}</td>
                <td className="p-4 flex space-x-2">
                  {t.teacherStatus === 'PENDING' && (
                    <>
                      <button
                        onClick={() => approveTeacher(t.id)}
                        className="p-2 bg-emerald-100 text-emerald-800 rounded-xl hover:bg-emerald-200 font-bold"
                        title="Approve"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setRejectingTeacher(t)}
                        className="p-2 bg-rose-100 text-rose-800 rounded-xl hover:bg-rose-200 font-bold"
                        title="Reject"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </>
                  )}
                  {t.teacherStatus === 'APPROVED' && (
                    <button
                      onClick={() => setRejectingTeacher(t)}
                      className="text-xs font-bold px-3 py-1.5 bg-rose-50 text-rose-700 border border-rose-200 rounded-xl hover:bg-rose-100"
                    >
                      Suspend
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {teachers.length === 0 && !loading && (
              <tr><td colSpan={5} className="p-8 text-center text-slate-400 text-xs">No educators found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderQuestions = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold text-slate-900">Question Bank</h3>
        <button
          onClick={openCreateModal}
          className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-4 py-2.5 rounded-2xl shadow-sm border-b-2 border-emerald-700 active:translate-y-0.5 transition-all text-xs flex items-center gap-1.5 cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Add Question
        </button>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#FAF9F5] border-b border-slate-200 text-xs font-bold text-slate-600 uppercase tracking-wider">
              <th className="p-4">Subject</th>
              <th className="p-4">Question</th>
              <th className="p-4">Target Mode</th>
              <th className="p-4">Actions</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {questions.map((q) => (
              <tr key={q.id} className="border-b border-slate-100 hover:bg-[#FAF9F5]">
                <td className="p-4 text-xs font-bold text-slate-800">{q.subject}</td>
                <td className="p-4 text-xs text-slate-700 max-w-[300px]">
                  <div className="font-medium truncate">{q.question}</div>
                  {q.imageUrl && (
                    <div className="text-[10px] text-emerald-700 flex items-center gap-1 mt-0.5 truncate">
                      <ImageIcon className="w-3 h-3 shrink-0" />
                      <span className="truncate">{q.imageUrl}</span>
                    </div>
                  )}
                </td>
                <td className="p-4 text-xs font-bold text-slate-600">{q.learningMode}</td>
                <td className="p-4 flex items-center gap-2">
                  <button
                    onClick={() => openEditModal(q)}
                    className="p-2 bg-emerald-50 text-emerald-700 rounded-xl hover:bg-emerald-100 transition-colors cursor-pointer"
                    title="Edit Question"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => deleteQuestion(q.id)}
                    className="p-2 bg-rose-50 text-rose-700 rounded-xl hover:bg-rose-100 transition-colors cursor-pointer"
                    title="Delete Question"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
            {questions.length === 0 && !loading && (
              <tr><td colSpan={4} className="p-8 text-center text-slate-400 text-xs">No questions found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderPayments = () => (
    <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-[#FAF9F5] border-b border-slate-200 text-xs font-bold text-slate-600 uppercase tracking-wider">
            <th className="p-4">User</th>
            <th className="p-4">Plan</th>
            <th className="p-4">Status</th>
            <th className="p-4">Date</th>
          </tr>
        </thead>
        <tbody className="text-sm">
          {payments.map((p) => (
            <tr key={p.id} className="border-b border-slate-100 hover:bg-[#FAF9F5]">
              <td className="p-4 text-xs font-bold text-slate-900">{p.user?.name} <span className="text-slate-500 font-normal">({p.user?.email})</span></td>
              <td className="p-4 text-xs text-slate-700 font-medium">{p.plan}</td>
              <td className="p-4">{statusPill(p.paymentStatus)}</td>
              <td className="p-4 text-xs text-slate-500 font-medium">{new Date(p.createdAt).toLocaleDateString()}</td>
            </tr>
          ))}
          {payments.length === 0 && !loading && (
            <tr><td colSpan={4} className="p-8 text-center text-slate-400 text-xs">No payments recorded.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );

  const GRADE_PRESETS = ['Nursery', 'LKG', 'UKG', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5'];
  const renderSettings = () => (
    <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-8 max-w-2xl">
      <div className="flex items-center gap-2 mb-2">
        <SlidersHorizontal className="w-5 h-5 text-emerald-600" />
        <h2 className="text-lg font-bold text-slate-900">Target grade level</h2>
      </div>
      <p className="text-sm text-slate-500 mb-6 leading-relaxed">
        The education level all AI-generated tutorials, lessons, and quizzes are written for. Changing it
        steers vocabulary, examples, and difficulty for <strong>newly generated</strong> content — existing
        curricula are unchanged. Only admins can set this.
      </p>

      <div className="flex flex-wrap gap-2 mb-4">
        {GRADE_PRESETS.map((g) => (
          <button
            key={g}
            onClick={() => setGradeLevel(g)}
            className={`text-xs font-bold px-3 py-1.5 rounded-full border transition-all ${
              gradeLevel === g
                ? 'bg-emerald-50 text-emerald-900 border-emerald-500'
                : 'border-slate-200 bg-[#FAF9F5] text-slate-600 hover:border-slate-300'
            }`}
          >
            {g}
          </button>
        ))}
      </div>

      <label className="block text-xs font-bold text-slate-600 mb-1.5">Grade / education level</label>
      <div className="flex gap-3">
        <input
          value={gradeLevel}
          onChange={(e) => setGradeLevel(e.target.value)}
          placeholder="e.g. Grade 3"
          maxLength={60}
          className="flex-1 border border-slate-200 rounded-2xl px-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none"
        />
        <button
          onClick={saveGrade}
          disabled={savingGrade || !gradeLevel.trim()}
          className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-5 py-2.5 rounded-2xl text-xs shadow-md border-b-4 border-emerald-700 active:translate-y-0.5 active:border-b-2 transition-all disabled:opacity-50"
        >
          {savingGrade ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          Save
        </button>
      </div>
      {gradeSaved && <p className="text-xs font-bold text-emerald-700 mt-3">Saved. New tutorials will target &ldquo;{gradeLevel}&rdquo;.</p>}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#FAF9F5] text-slate-800 font-sans selection:bg-emerald-100 selection:text-emerald-900 p-6 md:p-10">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-3 mb-2">
              {/* Deliberately the plain student dashboard, not homePathFor():
                  an admin has no disability profile, and homePathFor would
                  send them to /admin - the page they're already on. */}
              <Link to="/dashboard" className="text-xs font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1">
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
              </Link>
            </div>
            <h1 className="text-3xl font-bold text-slate-900">Admin Console</h1>
            <p className="text-slate-500 text-sm mt-0.5">Manage users, teacher approvals, questions, and subscriptions.</p>
          </div>
        </div>

        <div className="flex overflow-x-auto space-x-2 mb-8 bg-white p-1.5 rounded-2xl border border-slate-200/80 shadow-xs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative flex items-center space-x-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-emerald-500 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span>{tab.id}</span>
              {!!tab.badge && (
                <span className="ml-1 bg-amber-100 text-amber-900 text-[10px] font-bold rounded-full px-2 py-0.5 border border-amber-200">
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'Overview' && renderOverview()}
          {activeTab === 'Users' && renderUsers()}
          {activeTab === 'Teachers' && renderTeachers()}
          {activeTab === 'Questions' && renderQuestions()}
          {activeTab === 'Payments' && renderPayments()}
          {activeTab === 'Settings' && renderSettings()}
        </motion.div>
      </div>

      {isQuestionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white max-w-lg w-full p-8 rounded-3xl border border-slate-200 shadow-xl space-y-4">
            <h3 className="text-xl font-bold text-slate-900">
              {editingQuestion ? "Edit Question" : "Add New Question"}
            </h3>
            <form className="space-y-3" onSubmit={submitQuestion}>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Subject</label>
                <input type="text" value={newQuestion.subject} onChange={(e) => setNewQuestion({ ...newQuestion, subject: e.target.value })} className="w-full bg-[#FAF9F5] border border-slate-200 rounded-2xl px-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-emerald-500" required />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Question Text</label>
                <input type="text" value={newQuestion.question} onChange={(e) => setNewQuestion({ ...newQuestion, question: e.target.value })} className="w-full bg-[#FAF9F5] border border-slate-200 rounded-2xl px-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-emerald-500" required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Option A</label>
                  <input type="text" value={newQuestion.optionA} onChange={(e) => setNewQuestion({ ...newQuestion, optionA: e.target.value })} className="w-full bg-[#FAF9F5] border border-slate-200 rounded-2xl px-4 py-2 text-xs text-slate-800 focus:outline-none focus:border-emerald-500" required />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Option B</label>
                  <input type="text" value={newQuestion.optionB} onChange={(e) => setNewQuestion({ ...newQuestion, optionB: e.target.value })} className="w-full bg-[#FAF9F5] border border-slate-200 rounded-2xl px-4 py-2 text-xs text-slate-800 focus:outline-none focus:border-emerald-500" required />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Option C</label>
                  <input type="text" value={newQuestion.optionC} onChange={(e) => setNewQuestion({ ...newQuestion, optionC: e.target.value })} className="w-full bg-[#FAF9F5] border border-slate-200 rounded-2xl px-4 py-2 text-xs text-slate-800 focus:outline-none focus:border-emerald-500" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Option D</label>
                  <input type="text" value={newQuestion.optionD} onChange={(e) => setNewQuestion({ ...newQuestion, optionD: e.target.value })} className="w-full bg-[#FAF9F5] border border-slate-200 rounded-2xl px-4 py-2 text-xs text-slate-800 focus:outline-none focus:border-emerald-500" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Correct Answer</label>
                <input type="text" placeholder="Must match one option exactly" value={newQuestion.answer} onChange={(e) => setNewQuestion({ ...newQuestion, answer: e.target.value })} className="w-full bg-[#FAF9F5] border border-slate-200 rounded-2xl px-4 py-2 text-xs text-slate-800 focus:outline-none focus:border-emerald-500" required />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Visual Question Photo / Image</label>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <label className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 bg-[#FAF9F5] border border-dashed border-slate-300 rounded-2xl hover:border-emerald-500 cursor-pointer text-xs text-slate-700 font-bold transition-all shadow-xs">
                      <Upload className="w-4 h-4 text-emerald-600" />
                      <span>{uploadingImage ? "Processing photo..." : "Upload Image File from Computer"}</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setUploadingImage(true);
                            const reader = new FileReader();
                            reader.onload = (event) => {
                              const result = event.target?.result as string;
                              if (result) {
                                setNewQuestion((prev) => ({ ...prev, imageUrl: result }));
                              }
                              setUploadingImage(false);
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                    </label>
                  </div>

                  <div className="text-center text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                    — or paste web image URL —
                  </div>

                  <input
                    type="text"
                    placeholder="https://images.unsplash.com/... or paste image URL"
                    value={newQuestion.imageUrl}
                    onChange={(e) => setNewQuestion({ ...newQuestion, imageUrl: e.target.value })}
                    className="w-full bg-[#FAF9F5] border border-slate-200 rounded-2xl px-4 py-2 text-xs text-slate-800 focus:outline-none focus:border-emerald-500"
                  />

                  {newQuestion.imageUrl && (
                    <div className="relative mt-2 rounded-2xl overflow-hidden border border-slate-200 h-28 bg-slate-900 flex items-center justify-center shadow-xs">
                      <img
                        src={newQuestion.imageUrl}
                        alt="Question visual preview"
                        className="h-full w-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => setNewQuestion({ ...newQuestion, imageUrl: "" })}
                        className="absolute top-1.5 right-1.5 p-1 rounded-full bg-slate-900/80 text-white hover:bg-rose-600 transition-colors cursor-pointer"
                        title="Remove photo"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Target Mode</label>
                <select
                  value={newQuestion.learningMode}
                  onChange={(e) => setNewQuestion({ ...newQuestion, learningMode: e.target.value })}
                  className="w-full bg-[#FAF9F5] border border-slate-200 rounded-2xl px-4 py-2 text-xs text-slate-800 focus:outline-none focus:border-emerald-500"
                >
                  <option value="TEXT">TEXT</option>
                  <option value="AUDIO">AUDIO</option>
                  <option value="VISUAL">VISUAL</option>
                  <option value="AR">AR</option>
                </select>
              </div>
              <div className="pt-3 flex space-x-3">
                <button type="submit" className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 rounded-2xl shadow-sm border-b-4 border-emerald-700 text-xs cursor-pointer">
                  {editingQuestion ? "Update Question" : "Save Question"}
                </button>
                <button type="button" onClick={() => { setIsQuestionModalOpen(false); setEditingQuestion(null); }} className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-4 py-3 rounded-2xl text-xs cursor-pointer">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {rejectingTeacher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white max-w-md w-full p-8 rounded-3xl border border-slate-200 shadow-xl space-y-4">
            <h3 className="text-xl font-bold text-slate-900">Reject {rejectingTeacher.name}</h3>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Reason for rejection (optional)</label>
              <input
                type="text"
                value={rejectNote}
                onChange={(e) => setRejectNote(e.target.value)}
                placeholder="Brief reason shown to the teacher"
                className="w-full bg-[#FAF9F5] border border-slate-200 rounded-2xl px-4 py-3 text-xs text-slate-800 focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div className="flex space-x-3 pt-2">
              <button onClick={submitReject} className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-bold py-3 rounded-2xl text-xs shadow-sm">
                Confirm Rejection
              </button>
              <button type="button" onClick={() => setRejectingTeacher(null)} className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-4 py-3 rounded-2xl text-xs">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPage;

