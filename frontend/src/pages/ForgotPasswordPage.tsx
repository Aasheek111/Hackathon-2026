import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, CheckCircle2, ArrowRight } from 'lucide-react';

export const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSubmitted(true);
    }, 1200);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen flex items-center justify-center py-16 px-4 bg-[#FAF9F5] text-slate-800 font-sans selection:bg-emerald-100 selection:text-emerald-900"
    >
      <div className="w-full max-w-md bg-white p-8 sm:p-10 rounded-3xl border border-slate-200/80 shadow-md">
        <Link to="/login" className="inline-flex items-center text-xs font-bold text-slate-500 hover:text-slate-800 mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to Login
        </Link>

        {submitted ? (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-4">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-200">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Check your email</h2>
            <p className="text-slate-600 text-sm leading-relaxed">
              We've sent password reset instructions to <br/>
              <strong className="text-slate-900 font-bold">{email}</strong>
            </p>
          </motion.div>
        ) : (
          <>
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-slate-900 mb-1">Reset Password</h2>
              <p className="text-slate-500 text-sm">Enter your email and we'll send reset instructions.</p>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-5 h-5 absolute left-3.5 top-3.5 text-slate-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full bg-[#FAF9F5] border border-slate-200 rounded-2xl pl-11 pr-4 py-3 text-slate-800 focus:outline-none focus:border-emerald-500 focus:bg-white text-sm"
                    required
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3.5 px-6 rounded-2xl shadow-md border-b-4 border-emerald-700 active:translate-y-0.5 active:border-b-2 transition-all flex items-center justify-center gap-2 text-base mt-2"
              >
                <span>{loading ? 'Sending...' : 'Send Instructions'}</span>
                {!loading && <ArrowRight className="w-5 h-5" />}
              </button>
            </form>
          </>
        )}
      </div>
    </motion.div>
  );
};

export default ForgotPasswordPage;

