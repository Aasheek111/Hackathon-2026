import React, { useState } from "react";
import { Sparkles, Loader2, Send } from "lucide-react";
import api from "../lib/api";

/**
 * Learner-facing AI tutor panel, shared by the deaf dashboard and the sign
 * language pages. Text-in / text-out on purpose - the blind dashboard has its
 * own speech-wrapped version, since its answers need reading aloud and its
 * input arrives by voice.
 *
 * The learner's accessibility profile is applied server-side from their
 * session (see backend/src/routes/assistant.ts), so nothing about tone needs
 * to be passed from here.
 */

const SUGGESTIONS = [
  "Explain this in simpler words",
  "Give me another example",
  "Summarise this lesson",
  "Ask me a question about this",
];

export const AiAssistantPanel: React.FC<{
  /** Lesson/story text the learner is on, so answers stay on topic. */
  context?: string;
  className?: string;
}> = ({ context, className = "" }) => {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);

  const ask = async (raw: string) => {
    const q = raw.trim();
    if (!q || loading) return;
    setLoading(true);
    setAnswer("");
    try {
      const { data } = await api.post("/assistant/ask", {
        question: q,
        ...(context ? { context } : {}),
      });
      setAnswer(data.answer);
    } catch (err: any) {
      setAnswer(
        err.response?.data?.error ||
          "The assistant couldn't answer right now. Please try again in a moment.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <section
      aria-labelledby="assistant-heading"
      className={`bg-white rounded-3xl border border-slate-200/80 shadow-xs p-5 ${className}`}
    >
      <div className="flex items-center gap-2 mb-1">
        <Sparkles className="w-4.5 h-4.5 text-emerald-600" aria-hidden="true" />
        <h2 id="assistant-heading" className="font-bold text-slate-900 text-sm">
          Learning assistant
        </h2>
      </div>
      <p className="text-xs text-slate-500 mb-3">
        Ask anything about your lessons. Answers are written in plain language.
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          ask(question);
        }}
        className="flex gap-2"
      >
        <label htmlFor="assistant-input" className="sr-only">
          Ask the learning assistant a question
        </label>
        <input
          id="assistant-input"
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Explain fractions to me"
          className="flex-1 bg-[#FAF9F5] border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-emerald-500 focus:bg-white"
        />
        <button
          type="submit"
          disabled={loading || !question.trim()}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-bold disabled:opacity-60"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          Ask
        </button>
      </form>

      <div className="flex flex-wrap gap-1.5 mt-2">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => {
              setQuestion(s);
              ask(s);
            }}
            disabled={loading}
            className="text-[11px] font-medium px-2.5 py-1 rounded-full border border-slate-200 bg-[#FAF9F5] text-slate-600 hover:border-emerald-400 hover:text-emerald-800 disabled:opacity-60"
          >
            {s}
          </button>
        ))}
      </div>

      {/* aria-live so a screen-reader user hears the answer arrive rather than
          having to go looking for it. */}
      <div aria-live="polite" aria-atomic="true">
        {answer && (
          <p className="mt-3 text-sm text-slate-700 leading-relaxed bg-[#FAF9F5] border border-slate-200 rounded-2xl p-3 whitespace-pre-line">
            {answer}
          </p>
        )}
      </div>
    </section>
  );
};

export default AiAssistantPanel;
