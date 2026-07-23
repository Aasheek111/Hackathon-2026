import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Camera, Shield, Eye, Lock } from 'lucide-react';
import Button from '../components/ui/Button';

const CONSENT_STORAGE_KEY = 'neurolearn_camera_consent';

export const CameraConsentPage: React.FC = () => {
  const navigate = useNavigate();

  // Only ask the first time this browser takes a quiz - a retake shouldn't
  // re-prompt for something already decided.
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
      className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-8 bg-dark relative overflow-hidden"
    >
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/10 rounded-full blur-[120px] -z-10 pointer-events-none" />

      <motion.div variants={itemVariants} className="relative mb-8">
        <div className="absolute inset-0 bg-primary/30 rounded-full animate-ping opacity-75" />
        <div className="relative w-24 h-24 bg-gradient-to-br from-primary to-primary-dark rounded-full flex items-center justify-center shadow-[0_0_40px_rgba(108,61,231,0.5)]">
          <Camera className="w-10 h-10 text-white" />
        </div>
      </motion.div>

      <motion.div variants={itemVariants} className="text-center max-w-2xl mb-12">
        <h1 className="text-3xl sm:text-5xl font-display font-bold mb-4">
          We'd like to use your camera
        </h1>
        <p className="text-lg text-gray-400">
          To personalize your learning experience, NeuroLearn needs access to your camera to gauge engagement levels in real-time.
        </p>
      </motion.div>

      <motion.div variants={containerVariants} className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl w-full mb-12">
        {[
          { icon: Eye, title: "Why we use it", desc: "To estimate engagement and automatically switch learning modes when you lose focus." },
          { icon: Shield, title: "What we collect", desc: "Only anonymous engagement signals (like attention span). No video or images are stored." },
          { icon: Lock, title: "How it's protected", desc: "All processing happens locally on your device. Video data never leaves your computer." }
        ].map((item, i) => (
          <motion.div key={i} variants={itemVariants} className="glass p-6 rounded-2xl flex flex-col items-center text-center">
            <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center mb-4">
              <item.icon className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-lg font-bold mb-2">{item.title}</h3>
            <p className="text-sm text-gray-400">{item.desc}</p>
          </motion.div>
        ))}
      </motion.div>

      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-4 w-full max-w-md">
        <Button onClick={handleAccept} size="lg" className="w-full">
          Accept & Start Quiz
        </Button>
        <Button onClick={handleDecline} variant="ghost" size="lg" className="w-full">
          Continue without Camera
        </Button>
      </motion.div>

      <motion.p variants={itemVariants} className="mt-12 text-xs text-gray-500 max-w-md text-center">
        You can change these permissions at any time in your browser settings. Read our <a href="#" className="text-primary hover:underline">Privacy Policy</a> for more details.
      </motion.p>
    </motion.div>
  );
};

export default CameraConsentPage;
