import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Gamepad2 } from 'lucide-react';

export const ArGamePage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="h-screen w-screen bg-[#FAF9F5] flex flex-col overflow-hidden relative text-slate-800 font-sans"
    >
      {/* Top Header Bar */}
      <header className="bg-white px-6 py-3 flex items-center justify-between z-20 shrink-0 border-b border-slate-200 shadow-xs">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => navigate('/dashboard')}
            className="inline-flex items-center text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3.5 py-2 rounded-2xl transition-all"
          >
            <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to Dashboard
          </button>
          <div className="h-5 w-[1px] bg-slate-200 hidden sm:block" />
          <div className="flex items-center space-x-2 text-slate-900 font-bold text-sm hidden sm:flex">
            <Gamepad2 className="w-5 h-5 text-purple-600" />
            <span>AR Balloon Learning Game</span>
          </div>
        </div>

        <div className="flex items-center space-x-3 text-xs">
          <span className="inline-flex items-center px-3 py-1 rounded-full bg-purple-50 text-purple-800 border border-purple-200 font-bold">
            <span className="w-2 h-2 rounded-full bg-purple-500 mr-2 animate-pulse" /> 3D WebXR Active
          </span>
        </div>
      </header>

      {/* Embedded AR Game Iframe */}
      <div className="flex-1 w-full h-full relative">
        <iframe
          src="/ar-game.html"
          title="NeuroLearn AR Balloon Game"
          className="w-full h-full border-none"
          allow="camera; microphone; accelerometer; magnetometer; gyroscope; autoplay"
        />
      </div>
    </motion.div>
  );
};

export default ArGamePage;

