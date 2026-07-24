import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Send, Image as ImageIcon, Volume2, BookOpen } from 'lucide-react';

type LearningMode = 'TEXT' | 'AUDIO' | 'VISUAL' | 'AR';

interface ChatMessage {
  from: 'bot' | 'student';
  text: string;
}

interface TutorialAssistantProps {
  currentMode: LearningMode;
  onModeChange: (mode: LearningMode) => void;
}

const SUGGESTIONS: Array<{ label: string; icon: typeof ImageIcon; mode: LearningMode }> = [
  { label: 'More pictures', icon: ImageIcon, mode: 'VISUAL' },
  { label: 'Read it to me', icon: Volume2, mode: 'AUDIO' },
  { label: 'Just text', icon: BookOpen, mode: 'TEXT' }
];

function matchMode(input: string): LearningMode | null {
  const text = input.toLowerCase();
  if (/listen|audio|read.*(to|for) me|say it|hear/.test(text)) return 'AUDIO';
  if (/visual|picture|image|draw|diagram|show me/.test(text)) return 'VISUAL';
  if (/text|words? only|just read|plain/.test(text)) return 'TEXT';
  return null;
}

const MODE_LABEL: Record<LearningMode, string> = {
  TEXT: 'Text',
  AUDIO: 'Audio',
  VISUAL: 'Visual',
  AR: 'AR'
};

export const TutorialAssistant: React.FC<TutorialAssistantProps> = ({ currentMode, onModeChange }) => {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      from: 'bot',
      text: "Hi! I'm your Tutorial Buddy — tell me how you'd like this lesson, or tap a suggestion below!"
    }
  ]);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, open]);

  const requestMode = (mode: LearningMode, fromText?: string) => {
    setMessages((prev) => [
      ...prev,
      ...(fromText ? [{ from: 'student' as const, text: fromText }] : []),
      {
        from: 'bot',
        text:
          mode === currentMode
            ? `You're already in ${MODE_LABEL[mode]} mode!`
            : `Switching to ${MODE_LABEL[mode]} mode for you!`
      }
    ]);
    if (mode !== currentMode) onModeChange(mode);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const value = input.trim();
    if (!value) return;
    setInput('');
    const mode = matchMode(value);
    if (mode) {
      requestMode(mode, value);
    } else {
      setMessages((prev) => [
        ...prev,
        { from: 'student', text: value },
        { from: 'bot', text: "I can switch between text, audio narration, and visual cards — tap one of the buttons below!" }
      ]);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-40 font-sans selection:bg-emerald-100 selection:text-emerald-900">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', damping: 22, stiffness: 260 }}
            className="mb-4 w-80 sm:w-96 bg-white rounded-3xl border border-slate-200/80 shadow-xl overflow-hidden flex flex-col"
            style={{ maxHeight: '28rem' }}
          >
            <div className="px-5 py-3.5 border-b border-emerald-100 flex items-center justify-between bg-emerald-50/80">
              <div className="flex items-center gap-2 font-bold text-emerald-900 text-sm">
                <MessageCircle className="w-5 h-5 text-emerald-600" /> Tutorial Buddy
              </div>
              <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
              {messages.map((m, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: m.from === 'bot' ? -10 : 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={`flex ${m.from === 'student' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`px-4 py-2.5 rounded-2xl text-xs leading-relaxed max-w-[85%] font-medium ${
                      m.from === 'student' ? 'bg-emerald-500 text-white shadow-xs font-bold' : 'bg-[#FAF9F5] border border-slate-200/70 text-slate-800'
                    }`}
                  >
                    {m.text}
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="px-4 pb-3 flex flex-wrap gap-1.5">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s.mode}
                  onClick={() => requestMode(s.mode, s.label)}
                  className="text-xs font-bold flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-900 hover:bg-emerald-100 transition-colors"
                >
                  <s.icon className="w-3.5 h-3.5 text-emerald-700" /> {s.label}
                </button>
              ))}
            </div>

            <form onSubmit={submit} className="p-3 border-t border-slate-100 bg-[#FAF9F5] flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="e.g. show more pictures"
                className="flex-1 bg-white border border-slate-200 rounded-2xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-emerald-500"
              />
              <button
                type="submit"
                className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl px-3.5 py-2 transition-all font-bold"
                aria-label="Send"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setOpen((v) => !v)}
        className="w-14 h-14 rounded-3xl bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center shadow-lg border-b-4 border-emerald-700 active:translate-y-0.5 transition-all"
        aria-label="Open tutorial assistant"
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={open ? 'close' : 'open'}
            initial={{ opacity: 0, rotate: -45 }}
            animate={{ opacity: 1, rotate: 0 }}
            exit={{ opacity: 0, rotate: 45 }}
            transition={{ duration: 0.15 }}
          >
            {open ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
          </motion.span>
        </AnimatePresence>
      </motion.button>
    </div>
  );
};

export default TutorialAssistant;

