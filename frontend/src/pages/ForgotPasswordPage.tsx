import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, CheckCircle2 } from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';

export const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Simulate API call
    setTimeout(() => {
      setLoading(false);
      setSubmitted(true);
    }, 1500);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen flex items-center justify-center pt-20 pb-12 px-4 bg-dark relative overflow-hidden"
    >
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/20 rounded-full blur-[100px] -z-10" />
      
      <div className="w-full max-w-md glass-strong p-8 rounded-3xl">
        <Link to="/login" className="inline-flex items-center text-sm text-gray-400 hover:text-white mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Login
        </Link>

        {submitted ? (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-6">
            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-green-500" />
            </div>
            <h2 className="text-2xl font-display font-bold mb-2">Check your email</h2>
            <p className="text-gray-400">
              We've sent password reset instructions to <br/>
              <span className="text-white font-medium">{email}</span>
            </p>
          </motion.div>
        ) : (
          <>
            <div className="mb-8">
              <h2 className="text-3xl font-display font-bold mb-2">Reset Password</h2>
              <p className="text-gray-400">Enter your email and we'll send you instructions to reset your password.</p>
            </div>
            <form onSubmit={handleSubmit} className="space-y-6">
              <Input
                label="Email Address"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                icon={<Mail className="w-5 h-5" />}
                required
              />
              <Button type="submit" className="w-full" size="lg" loading={loading}>
                Send Instructions
              </Button>
            </form>
          </>
        )}
      </div>
    </motion.div>
  );
};

export default ForgotPasswordPage;
