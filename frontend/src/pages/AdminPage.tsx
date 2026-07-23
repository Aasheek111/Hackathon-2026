import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Users, FileText, Database, CreditCard, Plus, Trash2, GraduationCap, Check, X } from 'lucide-react';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
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
  const [rejectingTeacher, setRejectingTeacher] = useState<Teacher | null>(null);
  const [rejectNote, setRejectNote] = useState('');

  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [questions, setQuestions] = useState<AdminQuestion[]>([]);
  const [payments, setPayments] = useState<AdminPayment[]>([]);
  const [loading, setLoading] = useState(false);

  const [newQuestion, setNewQuestion] = useState({
    subject: '', question: '', optionA: '', optionB: '', optionC: '', optionD: '', answer: '', learningMode: 'TEXT'
  });

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

  useEffect(() => {
    // Teachers are loaded up front regardless of tab, so the pending badge on
    // the tab bar itself is always accurate.
    loadTeachers().catch(() => undefined);
  }, [loadTeachers]);

  useEffect(() => {
    setLoading(true);
    const loaders: Record<string, () => Promise<void>> = {
      Overview: loadOverview,
      Users: loadUsers,
      Teachers: loadTeachers,
      Questions: loadQuestions,
      Payments: loadPayments
    };
    loaders[activeTab]?.()
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, [activeTab, loadOverview, loadUsers, loadTeachers, loadQuestions, loadPayments]);

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
    await api.post('/admin/questions', {
      subject: newQuestion.subject,
      question: newQuestion.question,
      options: [newQuestion.optionA, newQuestion.optionB, newQuestion.optionC, newQuestion.optionD].filter(Boolean),
      answer: newQuestion.answer,
      learningMode: newQuestion.learningMode
    });
    setIsQuestionModalOpen(false);
    setNewQuestion({ subject: '', question: '', optionA: '', optionB: '', optionC: '', optionD: '', answer: '', learningMode: 'TEXT' });
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
    { id: 'Payments', icon: CreditCard }
  ];

  const statusPill = (status: string) => {
    const tone =
      status === 'APPROVED' || status === 'SUCCESS'
        ? 'bg-green-500/20 text-green-400'
        : status === 'PENDING'
        ? 'bg-amber-500/20 text-amber-400'
        : 'bg-red-500/20 text-red-400';
    return <span className={`px-2 py-1 rounded text-xs font-medium ${tone}`}>{status}</span>;
  };

  const renderOverview = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: 'Total Users', value: analytics?.totalUsers ?? '—' },
          { label: 'Active Subscriptions', value: analytics?.activeSubscriptions ?? '—' },
          { label: 'Pending Teachers', value: pendingCount },
          {
            label: 'Avg Engagement (Text)',
            value: analytics ? `${Math.round(analytics.avgEngagement.TEXT)}%` : '—'
          }
        ].map((stat, i) => (
          <div key={i} className="glass p-6 rounded-2xl">
            <div className="text-gray-400 text-sm mb-2">{stat.label}</div>
            <div className="text-3xl font-bold mb-2">{stat.value}</div>
          </div>
        ))}
      </div>
      {analytics && (
        <div className="glass p-6 rounded-2xl">
          <h3 className="text-lg font-bold mb-4">Engagement by mode</h3>
          <div className="space-y-3">
            {(['TEXT', 'AUDIO', 'VISUAL'] as const).map((mode) => (
              <div key={mode}>
                <div className="flex justify-between text-sm mb-1">
                  <span>{mode}</span>
                  <span>{Math.round(analytics.avgEngagement[mode])}%</span>
                </div>
                <div className="h-2 bg-dark rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full" style={{ width: `${analytics.avgEngagement[mode]}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const renderUsers = () => (
    <div className="glass rounded-2xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-white/5 border-b border-white/10 text-sm">
              <th className="p-4 font-medium text-gray-300">Name</th>
              <th className="p-4 font-medium text-gray-300">Email</th>
              <th className="p-4 font-medium text-gray-300">Role</th>
              <th className="p-4 font-medium text-gray-300">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-white/5 hover:bg-white/5">
                <td className="p-4">{u.name}</td>
                <td className="p-4 text-gray-400">{u.email}</td>
                <td className="p-4">
                  <select
                    value={u.role}
                    onChange={(e) => changeRole(u.id, e.target.value)}
                    className="bg-dark border border-white/10 rounded px-2 py-1 text-xs"
                  >
                    <option value="STUDENT">STUDENT</option>
                    <option value="TEACHER">TEACHER</option>
                    <option value="ADMIN">ADMIN</option>
                  </select>
                </td>
                <td className="p-4">
                  <button
                    onClick={() => deleteUser(u.id)}
                    className="p-1.5 bg-dark border border-white/10 rounded hover:text-red-500"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
            {users.length === 0 && !loading && (
              <tr><td colSpan={4} className="p-8 text-center text-gray-500">No users yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderTeachers = () => (
    <div className="glass rounded-2xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-white/5 border-b border-white/10 text-sm">
              <th className="p-4 font-medium text-gray-300">Name</th>
              <th className="p-4 font-medium text-gray-300">Email</th>
              <th className="p-4 font-medium text-gray-300">Classroom</th>
              <th className="p-4 font-medium text-gray-300">Status</th>
              <th className="p-4 font-medium text-gray-300">Actions</th>
            </tr>
          </thead>
          <tbody>
            {teachers.map((t) => (
              <tr key={t.id} className="border-b border-white/5 hover:bg-white/5">
                <td className="p-4">{t.name}</td>
                <td className="p-4 text-gray-400">{t.email}</td>
                <td className="p-4 text-gray-400">{t.classroomTaught?.name || '—'}</td>
                <td className="p-4">{statusPill(t.teacherStatus)}</td>
                <td className="p-4 flex space-x-2">
                  {t.teacherStatus === 'PENDING' && (
                    <>
                      <button
                        onClick={() => approveTeacher(t.id)}
                        className="p-1.5 bg-green-500/10 border border-green-500/30 text-green-400 rounded hover:bg-green-500/20"
                        title="Approve"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setRejectingTeacher(t)}
                        className="p-1.5 bg-red-500/10 border border-red-500/30 text-red-400 rounded hover:bg-red-500/20"
                        title="Reject"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </>
                  )}
                  {t.teacherStatus === 'APPROVED' && (
                    <button
                      onClick={() => setRejectingTeacher(t)}
                      className="text-xs px-2 py-1 bg-dark border border-white/10 rounded hover:text-red-400"
                    >
                      Suspend
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {teachers.length === 0 && !loading && (
              <tr><td colSpan={5} className="p-8 text-center text-gray-500">No teachers yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderQuestions = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold">Question Bank</h3>
        <Button onClick={() => setIsQuestionModalOpen(true)} size="sm" className="gap-2">
          <Plus className="w-4 h-4" /> Add Question
        </Button>
      </div>

      <div className="glass rounded-2xl overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-white/5 border-b border-white/10 text-sm">
              <th className="p-4 font-medium text-gray-300">Subject</th>
              <th className="p-4 font-medium text-gray-300">Question</th>
              <th className="p-4 font-medium text-gray-300">Target Mode</th>
              <th className="p-4 font-medium text-gray-300">Actions</th>
            </tr>
          </thead>
          <tbody>
            {questions.map((q) => (
              <tr key={q.id} className="border-b border-white/5 hover:bg-white/5">
                <td className="p-4 text-sm">{q.subject}</td>
                <td className="p-4 text-sm truncate max-w-[300px]">{q.question}</td>
                <td className="p-4 text-sm">{q.learningMode}</td>
                <td className="p-4">
                  <button
                    onClick={() => deleteQuestion(q.id)}
                    className="p-1.5 bg-dark border border-white/10 rounded hover:text-red-500"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
            {questions.length === 0 && !loading && (
              <tr><td colSpan={4} className="p-8 text-center text-gray-500">No questions yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderPayments = () => (
    <div className="glass rounded-2xl overflow-hidden">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-white/5 border-b border-white/10 text-sm">
            <th className="p-4 font-medium text-gray-300">User</th>
            <th className="p-4 font-medium text-gray-300">Plan</th>
            <th className="p-4 font-medium text-gray-300">Status</th>
            <th className="p-4 font-medium text-gray-300">Date</th>
          </tr>
        </thead>
        <tbody>
          {payments.map((p) => (
            <tr key={p.id} className="border-b border-white/5 hover:bg-white/5">
              <td className="p-4 text-sm">{p.user?.name} <span className="text-gray-500">({p.user?.email})</span></td>
              <td className="p-4 text-sm">{p.plan}</td>
              <td className="p-4">{statusPill(p.paymentStatus)}</td>
              <td className="p-4 text-sm text-gray-400">{new Date(p.createdAt).toLocaleDateString()}</td>
            </tr>
          ))}
          {payments.length === 0 && !loading && (
            <tr><td colSpan={4} className="p-8 text-center text-gray-500">No payments yet.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="min-h-screen bg-dark text-white p-6 md:p-10">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold">Admin Dashboard</h1>
            <p className="text-gray-400">Manage platform resources and users.</p>
          </div>
        </div>

        <div className="flex overflow-x-auto space-x-2 mb-8 bg-dark-card p-1.5 rounded-xl border border-white/5">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative flex items-center space-x-2 px-6 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-primary text-white shadow-lg'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span>{tab.id}</span>
              {!!tab.badge && (
                <span className="ml-1 bg-accent text-dark text-[10px] font-bold rounded-full px-1.5 py-0.5">
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
        </motion.div>
      </div>

      <Modal isOpen={isQuestionModalOpen} onClose={() => setIsQuestionModalOpen(false)} title="Add New Question">
        <form className="space-y-4" onSubmit={submitQuestion}>
          <Input label="Subject" value={newQuestion.subject} onChange={(e) => setNewQuestion({ ...newQuestion, subject: e.target.value })} required />
          <Input label="Question Text" value={newQuestion.question} onChange={(e) => setNewQuestion({ ...newQuestion, question: e.target.value })} required />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Option A" value={newQuestion.optionA} onChange={(e) => setNewQuestion({ ...newQuestion, optionA: e.target.value })} required />
            <Input label="Option B" value={newQuestion.optionB} onChange={(e) => setNewQuestion({ ...newQuestion, optionB: e.target.value })} required />
            <Input label="Option C" value={newQuestion.optionC} onChange={(e) => setNewQuestion({ ...newQuestion, optionC: e.target.value })} />
            <Input label="Option D" value={newQuestion.optionD} onChange={(e) => setNewQuestion({ ...newQuestion, optionD: e.target.value })} />
          </div>
          <Input label="Correct Answer" placeholder="Must match one option exactly" value={newQuestion.answer} onChange={(e) => setNewQuestion({ ...newQuestion, answer: e.target.value })} required />
          <div>
            <label className="text-sm text-gray-400 mb-1 block">Target learning mode</label>
            <select
              value={newQuestion.learningMode}
              onChange={(e) => setNewQuestion({ ...newQuestion, learningMode: e.target.value })}
              className="w-full bg-dark border border-white/10 rounded-lg px-3 py-2"
            >
              <option value="TEXT">TEXT</option>
              <option value="AUDIO">AUDIO</option>
              <option value="VISUAL">VISUAL</option>
              <option value="AR">AR</option>
            </select>
          </div>
          <div className="pt-4 flex space-x-3">
            <Button type="submit" className="flex-1">Save Question</Button>
            <Button type="button" variant="ghost" onClick={() => setIsQuestionModalOpen(false)}>Cancel</Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={!!rejectingTeacher} onClose={() => setRejectingTeacher(null)} title={`Reject ${rejectingTeacher?.name || ''}`}>
        <div className="space-y-4">
          <Input label="Reason (shown to the teacher)" value={rejectNote} onChange={(e) => setRejectNote(e.target.value)} />
          <div className="flex space-x-3">
            <Button onClick={submitReject} className="flex-1">Confirm</Button>
            <Button type="button" variant="ghost" onClick={() => setRejectingTeacher(null)}>Cancel</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default AdminPage;
