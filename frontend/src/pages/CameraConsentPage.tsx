import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Camera, Shield, Eye, Lock, ArrowRight } from 'lucide-react';

const CONSENT_STORAGE_KEY = 'neurolearn_camera_consent';

export const CameraConsentPage: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    if (localStorage.getItem(CONSENT_STORAGE_KEY)) {
      navigate('/quiz', { replace: true });
    }
  }, [navigate]);

  const handleAccept = async () => {
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        await navigator.mediaDevices.getUserMedia({ video: true });
      }
    } catch (err) {
      console.warn('Camera permission prompt closed or denied', err);
    } finally {
      localStorage.setItem(CONSENT_STORAGE_KEY, 'granted');
      navigate('/quiz');
    }
  };

  const handleDecline = () => {
    localStorage.setItem(CONSENT_STORAGE_KEY, 'declined');
    navigate('/quiz');
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.15 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      exit={{ opacity: 0 }}
      variants={containerVariants}
      className="min-h-screen flex flex-col items-center justify-center p-6 sm:p-12 bg-[#FAF9F5] text-slate-800 font-sans selection:bg-emerald-100 selection:text-emerald-900"
    >
      <motion.div variants={itemVariants} className="mb-6">
        <div className="w-20 h-20 bg-emerald-100 text-emerald-700 rounded-3xl flex items-center justify-center border border-emerald-200 shadow-sm">
          <Camera className="w-10 h-10" />
        </div>
      </motion.div>

      <motion.div variants={itemVariants} className="text-center max-w-xl mb-10 space-y-2">
        <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 leading-tight">
          Gentle Attention Tracking
        </h1>
        <p className="text-slate-600 text-base leading-relaxed">
          To automatically adapt between Text, Audio, and Visual cards when focus drifts, NeuroLearn asks to briefly check eye contact.
        </p>
      </motion.div>

      <motion.div variants={containerVariants} className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl w-full mb-10">
        {[
          { icon: Eye, color: 'bg-sky-100 text-sky-800', title: 'Why we use it', desc: 'To sense attention span and switch modes smoothly before frustration starts.' },
          { icon: Shield, color: 'bg-emerald-100 text-emerald-800', title: 'What we collect', desc: 'Only anonymous numerical scores (0-100). No images or videos are stored.' },
          { icon: Lock, color: 'bg-purple-100 text-purple-800', title: 'How it is protected', desc: 'Processing runs locally on your browser. Video feeds never leave your device.' }
        ].map((item, i) => (
          <motion.div key={i} variants={itemVariants} className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col items-center text-center">
            <div className={`w-12 h-12 ${item.color} rounded-2xl flex items-center justify-center mb-4 font-bold`}>
              <item.icon className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">{item.title}</h3>
            <p className="text-xs text-slate-600 leading-relaxed">{item.desc}</p>
          </motion.div>
        ))}
      </motion.div>

      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-4 w-full max-w-md">
        <button
          onClick={handleAccept}
          className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-4 px-6 rounded-2xl shadow-md border-b-4 border-emerald-700 active:translate-y-0.5 active:border-b-2 transition-all flex items-center justify-center gap-2 text-base"
        >
          <span>Enable Camera & Start Quiz</span>
          <ArrowRight className="w-5 h-5" />
        </button>

        <button
          onClick={handleDecline}
          className="w-full bg-white hover:bg-slate-50 text-slate-700 font-bold py-4 px-6 rounded-2xl shadow-xs border border-slate-200 border-b-4 border-b-slate-300 active:translate-y-0.5 active:border-b-2 transition-all text-sm"
        >
          Continue Without Camera
        </button>
      </motion.div>

      <motion.p variants={itemVariants} className="mt-8 text-xs text-slate-500 max-w-md text-center">
        You can revoke camera access at any time in your browser settings.
      </motion.p>
    </motion.div>
  );
};

export default CameraConsentPage;

