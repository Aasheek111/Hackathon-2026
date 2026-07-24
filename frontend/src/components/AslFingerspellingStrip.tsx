import React, { useState } from "react";
import { Hand } from "lucide-react";
import { ASL_ALPHABET } from "../data/aslAlphabet";
import HandshapeDiagram from "./HandshapeDiagram";

/**
 * Spells one word letter-by-letter using the standard ASL manual alphabet -
 * a fingerspelling study strip, not full sign-language translation (see
 * aslAlphabet.ts for why). Tap a letter to see its handshape description.
 */
export const AslFingerspellingStrip: React.FC<{ word: string; highContrast?: boolean }> = ({
  word,
  highContrast,
}) => {
  const [active, setActive] = useState<number | null>(null);
  const letters = word
    .toUpperCase()
    .split("")
    .filter((ch) => ASL_ALPHABET[ch]);

  if (letters.length === 0) return null;

  return (
    <div
      className={`rounded-2xl p-4 mt-3 border ${
        highContrast
          ? "bg-yellow-950/40 border-yellow-700 text-yellow-100"
          : "bg-sky-50 border-sky-200 text-slate-700 dark:bg-sky-500/10 dark:border-sky-500/30 dark:text-gray-200"
      }`}
    >
      <div className="flex items-center gap-2 mb-2 text-xs font-bold uppercase tracking-wide">
        <Hand className={`w-3.5 h-3.5 ${highContrast ? "text-yellow-300" : "text-sky-600 dark:text-sky-300"}`} />
        <span>Sign language: fingerspell "{word}"</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {letters.map((ch, i) => (
          <button
            key={`${ch}-${i}`}
            type="button"
            onClick={() => setActive((cur) => (cur === i ? null : i))}
            className={`w-9 h-9 rounded-lg font-bold text-sm border transition-colors ${
              active === i
                ? highContrast
                  ? "bg-yellow-400 text-black border-yellow-300"
                  : "bg-sky-500 text-white border-sky-500"
                : highContrast
                  ? "bg-black/40 border-yellow-700 hover:border-yellow-400"
                  : "bg-white border-sky-200 hover:border-sky-400 dark:bg-white/10 dark:border-sky-500/30"
            }`}
          >
            {ch}
          </button>
        ))}
      </div>
      {active !== null && (
        <div className="flex items-start gap-3 mt-2">
          <div className={`shrink-0 rounded-lg p-1 ${highContrast ? "bg-black/40 border border-yellow-700" : "bg-white dark:bg-white/10"}`}>
            <HandshapeDiagram term={letters[active]} size={72} />
          </div>
          <p className={`text-xs ${highContrast ? "text-yellow-200" : "text-slate-600 dark:text-gray-300"}`}>
            <strong>{letters[active]}:</strong> {ASL_ALPHABET[letters[active]]}
          </p>
        </div>
      )}
    </div>
  );
};

export default AslFingerspellingStrip;
