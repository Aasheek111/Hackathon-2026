import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Users, FileText, Database, CreditCard, Plus, Edit2, Trash2 } from 'lucide-react';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';

export const AdminPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('Overview');
  const [isQuestionModalOpen, setIsQuestionModalOpen] = useState(false);

  const tabs = [
    { id: 'Overview', icon: Database },
    { id: 'Users', icon: Users },
    { id: 'Questions', icon: FileText },
    { id: 'Payments', icon: CreditCard }
  ];

  const renderOverview = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: 'Total Users', value: '1,245', trend: '+12%' },
          { label: 'Active Subscriptions', value: '892', trend: '+5%' },
          { label: 'Avg Engagement', value: '84%', trend: '+2%' },
          { label: 'Total Questions', value: '5,032', trend: '+140' }
        ].map((stat, i) => (
          <div key={i} className="glass p-6 rounded-2xl">
            <div className="text-gray-400 text-sm mb-2">{stat.label}</div>
            <div className="text-3xl font-bold mb-2">{stat.value}</div>
            <div className="text-green-400 text-sm">{stat.trend} this month</div>
          </div>
        ))}
      </div>
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
              <th className="p-4 font-medium text-gray-300">Subscription</th>
              <th className="p-4 font-medium text-gray-300">Actions</th>
            </tr>
          </thead>
          <tbody>
            {[
              { name: 'John Doe', email: 'john@example.com', role: 'USER', sub: 'Active' },
              { name: 'Jane Smith', email: 'jane@example.com', role: 'ADMIN', sub: 'N/A' },
              { name: 'Alice Johnson', email: 'alice@example.com', role: 'USER', sub: 'Expired' }
            ].map((u, i) => (
              <tr key={i} className="border-b border-white/5 hover:bg-white/5">
                <td className="p-4">{u.name}</td>
                <td className="p-4 text-gray-400">{u.email}</td>
                <td className="p-4">
                  <span className={`px-2 py-1 rounded text-xs ${u.role === 'ADMIN' ? 'bg-primary/20 text-primary-light' : 'bg-gray-800 text-gray-300'}`}>
                    {u.role}
                  </span>
                </td>
                <td className="p-4">
                  <span className={`px-2 py-1 rounded text-xs ${u.sub === 'Active' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                    {u.sub}
                  </span>
                </td>
                <td className="p-4 flex space-x-2">
                  <button className="p-1.5 bg-dark border border-white/10 rounded hover:text-primary"><Edit2 className="w-4 h-4" /></button>
                  <button className="p-1.5 bg-dark border border-white/10 rounded hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                </td>
              </tr>
            ))}
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
            {[
              { sub: 'Math', q: 'What is 5 + 3?', mode: 'ALL' },
              { sub: 'Science', q: 'Identify the solar system planet.', mode: 'VISUAL' },
            ].map((q, i) => (
              <tr key={i} className="border-b border-white/5 hover:bg-white/5">
                <td className="p-4 text-sm">{q.sub}</td>
                <td className="p-4 text-sm truncate max-w-[300px]">{q.q}</td>
                <td className="p-4 text-sm">{q.mode}</td>
                <td className="p-4 flex space-x-2">
                  <button className="p-1.5 bg-dark border border-white/10 rounded hover:text-primary"><Edit2 className="w-4 h-4" /></button>
                  <button className="p-1.5 bg-dark border border-white/10 rounded hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
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

        {/* Custom Tabs */}
        <div className="flex overflow-x-auto space-x-2 mb-8 bg-dark-card p-1.5 rounded-xl border border-white/5">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 px-6 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === tab.id 
                  ? 'bg-primary text-white shadow-lg' 
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span>{tab.id}</span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'Overview' && renderOverview()}
          {activeTab === 'Users' && renderUsers()}
          {activeTab === 'Questions' && renderQuestions()}
          {activeTab === 'Payments' && <div className="glass p-8 text-center text-gray-400 rounded-2xl">Payment history integration pending...</div>}
        </motion.div>
      </div>

      {/* Add Question Modal */}
      <Modal isOpen={isQuestionModalOpen} onClose={() => setIsQuestionModalOpen(false)} title="Add New Question">
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); setIsQuestionModalOpen(false); }}>
          <Input label="Question Text" placeholder="Enter question..." required />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Option A" required />
            <Input label="Option B" required />
            <Input label="Option C" required />
            <Input label="Option D" required />
          </div>
          <Input label="Correct Answer" placeholder="e.g. Option A" required />
          <div className="pt-4 flex space-x-3">
            <Button type="submit" className="flex-1">Save Question</Button>
            <Button type="button" variant="ghost" onClick={() => setIsQuestionModalOpen(false)}>Cancel</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default AdminPage;
