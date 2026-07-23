import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Gamepad2 } from 'lucide-react';
import Button from '../components/ui/Button';

export const ArGamePage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="h-screen w-screen bg-dark flex flex-col overflow-hidden relative"
    >
      {/* Top Header Bar */}
      <header className="glass px-6 py-3 flex items-center justify-between z-20 shrink-0 border-b border-white/10">
        <div className="flex items-center space-x-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/dashboard')}
            className="text-gray-300 hover:text-white"
          >
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
          </Button>
          <div className="h-5 w-[1px] bg-white/20 hidden sm:block" />
          <div className="flex items-center space-x-2 text-primary-light font-display font-semibold hidden sm:flex">
            <Gamepad2 className="w-5 h-5 text-accent" />
            <span>AR Balloon Learning Game</span>
          </div>
        </div>

        <div className="flex items-center space-x-3 text-xs text-gray-400">
          <span className="inline-flex items-center px-3 py-1 rounded-full bg-primary/20 text-primary-light border border-primary/30">
            <span className="w-2 h-2 rounded-full bg-accent animate-pulse mr-2" /> 3D WebXR Active
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
