import React from 'react';
import { motion } from 'framer-motion';
import { Link, useLocation } from 'react-router-dom';
import { Trophy, ArrowRight, Sparkles, BookOpen, Volume2, Image as ImageIcon } from 'lucide-react';
import Button from '../components/ui/Button';

export const QuizResultPage: React.FC = () => {
  const location = useLocation();
  const quizScore = location.state?.score ?? 18;
  const totalQuestions = location.state?.total ?? 20;

  // Mock data representing analysis
  const profile = {
    text: 68,
    audio: 82,
    visual: 95,
    recommended: 'VISUAL'
  };

  const getModeDetails = (mode: string) => {
    switch (mode) {
      case 'VISUAL': return { icon: ImageIcon, color: 'bg-green-500', text: 'text-green-400', label: 'Visual Mode', desc: 'You process information best when it\'s presented with images and spatial relationships.' };
      case 'AUDIO': return { icon: Volume2, color: 'bg-blue-500', text: 'text-blue-400', label: 'Audio Mode', desc: 'You learn best through listening and auditory repetition.' };
      default: return { icon: BookOpen, color: 'bg-primary', text: 'text-primary', label: 'Text Mode', desc: 'You excel at reading and processing structured written information.' };
    }
  };

  const recommended = getModeDetails(profile.recommended);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen bg-dark pt-24 pb-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center"
    >
      <div className="w-full max-w-4xl">
        <div className="text-center mb-12">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", bounce: 0.5 }}
            className="w-24 h-24 bg-gradient-to-br from-accent to-orange-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_50px_rgba(245,158,11,0.4)]"
          >
            <Trophy className="w-12 h-12 text-white" />
          </motion.div>
          <h1 className="text-4xl md:text-5xl font-display font-bold mb-4">Assessment Complete!</h1>
          <div className="inline-flex items-center px-4 py-2 rounded-full bg-primary/20 border border-primary/40 text-primary-light font-bold mb-4">
            Quiz Score: {quizScore} / {totalQuestions} Correct ({Math.round((quizScore / totalQuestions) * 100)}%)
          </div>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            We've analyzed your eye tracking engagement patterns across all {totalQuestions} questions.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Charts */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="glass-strong p-8 rounded-3xl"
          >
            <h3 className="text-xl font-bold mb-6">Engagement Breakdown</h3>
            <div className="space-y-6">
              {[
                { label: 'Visual', value: profile.visual, color: 'bg-green-500', icon: ImageIcon },
                { label: 'Audio', value: profile.audio, color: 'bg-blue-500', icon: Volume2 },
                { label: 'Text', value: profile.text, color: 'bg-amber-500', icon: BookOpen }
              ].map((item, i) => (
                <div key={i}>
                  <div className="flex justify-between items-center mb-2">
                    <span className="flex items-center text-sm font-medium">
                      <item.icon className="w-4 h-4 mr-2 text-gray-400" />
                      {item.label}
                    </span>
                    <span className="text-sm font-bold">{item.value}%</span>
                  </div>
                  <div className="h-3 w-full bg-dark rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${item.value}%` }}
                      transition={{ duration: 1, delay: 0.5 + (i * 0.2) }}
                      className={`h-full ${item.color} rounded-full`}
                    />
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Recommendation */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="glass p-8 rounded-3xl relative overflow-hidden flex flex-col justify-center border-primary/30"
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -z-10" />
            
            <div className="flex items-center space-x-2 text-primary font-medium mb-4">
              <Sparkles className="w-5 h-5" />
              <span>Recommended Approach</span>
            </div>
            
            <div className="flex items-center space-x-4 mb-4">
              <div className={`p-4 rounded-2xl ${recommended.color}/20 text-white`}>
                <recommended.icon className={`w-10 h-10 ${recommended.text}`} />
              </div>
              <h2 className="text-3xl font-display font-bold">{recommended.label}</h2>
            </div>
            
            <p className="text-gray-300 leading-relaxed mb-8">
              Based on your engagement data, {recommended.desc.toLowerCase()} 
              We've configured your dashboard to prioritize this modality, while still adapting dynamically when needed.
            </p>

            <Link to="/subscription">
              <Button size="lg" className="w-full gap-2 shadow-[0_0_20px_rgba(108,61,231,0.3)]">
                Unlock Full Access <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
};

export default QuizResultPage;
