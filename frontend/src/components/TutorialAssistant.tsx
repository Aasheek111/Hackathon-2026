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
  onCustomizeVisual: (instruction: string) => Promise<{ ok: boolean; message: string }>;
}

const SUGGESTIONS: Array<{ label: string; icon: typeof ImageIcon; mode: LearningMode }> = [
  { label: 'More pictures', icon: ImageIcon, mode: 'VISUAL' },
  { label: 'Read it to me', icon: Volume2, mode: 'AUDIO' },
  { label: 'Just text', icon: BookOpen, mode: 'TEXT' }
];

/**
 * A small rule-based assistant, not a real LLM - it pattern-matches a few
 * phrases to the mode switch that already exists on TutorialPage (`load`).
 * Framed honestly in its own first message so nobody mistakes it for AI.
 * The one exception: a descriptive visual request (see
 * `isDescriptiveVisualRequest`) is forwarded verbatim to Gemini image
 * generation via `onCustomizeVisual`, rather than pattern-matched.
 */
function matchMode(input: string): LearningMode | null {
  const text = input.toLowerCase();
  if (/listen|audio|read.*(to|for) me|say it|hear/.test(text)) return 'AUDIO';
  if (/visual|picture|image|draw|diagram|show me/.test(text)) return 'VISUAL';
  if (/text|words? only|just read|plain/.test(text)) return 'TEXT';
  return null;
}

const VISUAL_INTENT = /visual|picture|image|draw|diagram|show me/i;

/**
 * Distinguishes "make it visual" (a bare mode switch) from "draw a red
 * rocket with stars" (an actual description of what to draw) so short
 * requests keep the instant mode-switch behaviour and longer ones become a
 * real image-customization request.
 */
function isDescriptiveVisualRequest(input: string): boolean {
  return VISUAL_INTENT.test(input) && input.trim().split(/\s+/).length > 4;
}

const MODE_LABEL: Record<LearningMode, string> = {
  TEXT: 'text',
  AUDIO: 'audio',
  VISUAL: 'visual',
  AR: 'AR'
};

export const TutorialAssistant: React.FC<TutorialAssistantProps> = ({
  currentMode,
  onModeChange,
  onCustomizeVisual
}) => {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      from: 'bot',
      text:
        "Hi! I'm a simple helper (not a full AI) - tell me how you'd like this tutorial, describe a picture you want (e.g. \"draw a red rocket with stars\"), or tap a suggestion below."
    }
  ]);
  const [drawing, setDrawing] = useState(false);
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
            : `Switching to ${MODE_LABEL[mode]} mode for you.`
      }
    ]);
    if (mode !== currentMode) onModeChange(mode);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = input.trim();
    if (!value || drawing) return;
    setInput('');

    if (isDescriptiveVisualRequest(value)) {
      setMessages((prev) => [
        ...prev,
        { from: 'student', text: value },
        { from: 'bot', text: 'Let me draw that for you...' }
      ]);
      setDrawing(true);
      const result = await onCustomizeVisual(value);
      setDrawing(false);
      setMessages((prev) => [...prev, { from: 'bot', text: result.message }]);
      return;
    }

    const mode = matchMode(value);
    if (mode) {
      requestMode(mode, value);
    } else {
      setMessages((prev) => [
        ...prev,
        { from: 'student', text: value },
        { from: 'bot', text: "I can switch between text, audio and visual - try one of the suggestions below!" }
      ]);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-40">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', damping: 22, stiffness: 260 }}
            className="mb-4 w-80 sm:w-96 glass-strong rounded-3xl border border-white/10 shadow-2xl overflow-hidden flex flex-col"
            style={{ maxHeight: '28rem' }}
          >
            <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between bg-primary/10">
              <div className="flex items-center gap-2 font-bold">
                <MessageCircle className="w-5 h-5 text-primary-light" /> Tutorial Buddy
              </div>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
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
                    className={`px-4 py-2 rounded-2xl text-sm max-w-[85%] ${
                      m.from === 'student' ? 'bg-primary text-white' : 'bg-dark-card border border-white/10 text-gray-200'
                    }`}
                  >
                    {m.text}
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="px-4 pb-3 flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s.mode}
                  onClick={() => requestMode(s.mode, s.label)}
                  className="text-xs flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-white/10 text-gray-300 hover:border-primary hover:text-white transition-colors"
                >
                  <s.icon className="w-3.5 h-3.5" /> {s.label}
                </button>
              ))}
            </div>

            <form onSubmit={submit} className="p-3 border-t border-white/10 flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={drawing ? 'Drawing your picture...' : 'e.g. draw a red rocket with stars'}
                disabled={drawing}
                className="flex-1 bg-dark-card border border-dark-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary disabled:opacity-60"
              />
              <button
                type="submit"
                disabled={drawing}
                className="bg-primary text-white rounded-xl px-3 py-2 hover:opacity-90 transition-opacity disabled:opacity-60"
                aria-label="Send"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.94 }}
        onClick={() => setOpen((v) => !v)}
        className="w-14 h-14 rounded-full bg-gradient-to-br from-primary to-primary-dark text-white flex items-center justify-center shadow-[0_0_25px_rgba(108,61,231,0.5)]"
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
