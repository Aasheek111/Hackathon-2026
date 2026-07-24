import React, { useState } from "react";
import { Hand } from "lucide-react";
import { ASL_ALPHABET } from "../data/aslAlphabet";
import SignSymbol from "./SignSymbol";

/**
 * Spells one word letter-by-letter using the standard ASL manual alphabet -
 * a fingerspelling study strip, not full sign-language translation (see
 * aslAlphabet.ts for why). Tap a letter to see its handshape description.
 */
export const AslFingerspellingStrip: React.FC<{
  word: string;
  highContrast?: boolean;
}> = ({ word, highContrast }) => {
  const [active, setActive] = useState<number | null>(null);
  const letters = word
    .toUpperCase()
    .split("")
    .filter((ch) => ASL_ALPHABET[ch]);

  if (letters.length === 0) return null;

  return (
    <div
      className={`w-full rounded-2xl p-4 sm:p-5 mt-4 border ${
        highContrast
          ? "bg-black border-yellow-400 text-yellow-300 shadow-lg"
          : "bg-sky-50/90 border-sky-300 text-slate-900 shadow-sm dark:bg-slate-900 dark:border-sky-500/40 dark:text-slate-100"
      }`}
    >
      <div className="flex items-center gap-2 mb-3 text-xs font-extrabold uppercase tracking-wide border-b border-sky-200/60 pb-2">
        <Hand
          className={`w-4 h-4 ${highContrast ? "text-yellow-300" : "text-sky-700 dark:text-sky-400"}`}
        />
        <span
          className={
            highContrast ? "text-yellow-300" : "text-slate-900 dark:text-white"
          }
        >
          Sign language: fingerspell "{word}"
        </span>
      </div>

      <div className="flex flex-wrap gap-3 w-full">
        {letters.map((ch, i) => (
          <button
            key={`${ch}-${i}`}
            type="button"
            onClick={() => setActive((cur) => (cur === i ? null : i))}
            className={`flex flex-col items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer min-w-[3.75rem] ${
              active === i
                ? highContrast
                  ? "bg-yellow-400 text-black border-yellow-300 ring-2 ring-yellow-300"
                  : "bg-sky-100 border-sky-600 text-sky-950 ring-2 ring-sky-500 shadow-md"
                : highContrast
                  ? "bg-slate-900 border-yellow-600 hover:border-yellow-300"
                  : "bg-white border-slate-300 hover:border-sky-400 shadow-xs dark:bg-slate-800 dark:border-slate-700"
            }`}
          >
            <SignSymbol
              term={ch}
              size={50}
              showMotion={false}
              className="drop-shadow-xs"
            />
            <span className="text-xs font-black mt-1.5 px-2.5 py-0.5 rounded-md bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-2xs">
              {ch}
            </span>
          </button>
        ))}
      </div>

      {active !== null && (
        <div className="flex items-start gap-3 mt-3 p-3.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 shadow-xs">
          <div
            className={`shrink-0 rounded-lg p-1.5 ${highContrast ? "bg-black border border-yellow-400" : "bg-sky-50 dark:bg-slate-900"}`}
          >
            <SignSymbol term={letters[active]} size={68} />
          </div>
          <p
            className={`text-xs leading-relaxed ${highContrast ? "text-yellow-200" : "text-slate-800 dark:text-gray-100"}`}
          >
            <strong className="text-slate-900 dark:text-white font-extrabold">
              Letter {letters[active]}:
            </strong>{" "}
            {ASL_ALPHABET[letters[active]]}
          </p>
        </div>
      )}
    </div>
  );
};

export default AslFingerspellingStrip;
