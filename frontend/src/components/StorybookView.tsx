import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Wand2,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Image as ImageIcon,
  BookOpen,
  Volume2,
  Loader2,
} from "lucide-react";
import Button from "./ui/Button";
import api, { resolveMediaUrl } from "../lib/api";
import { useAccessibility } from "../contexts/AccessibilityContext";
import { useAuth } from "../contexts/AuthContext";
import { useSpeech } from "../hooks/useSpeech";
import AslFingerspellingStrip from "./AslFingerspellingStrip";
import { pickKeyWord } from "../data/aslAlphabet";

interface StorybookPage {
  id: string;
  pageNumber: number;
  storyText: string;
  imageUrl: string | null;
}
interface Storybook {
  id: string;
  title: string | null;
  status: "QUEUED" | "GENERATING_STORY" | "GENERATING_IMAGES" | "READY" | "FAILED";
  errorMessage: string | null;
  pages: StorybookPage[];
}

const GENERATING_STATUSES = new Set(["QUEUED", "GENERATING_STORY", "GENERATING_IMAGES"]);
const POLL_INTERVAL_MS = 3000;

const STATUS_LABEL: Record<string, string> = {
  QUEUED: "Getting ready to write your story…",
  GENERATING_STORY: "Writing your story…",
  GENERATING_IMAGES: "Drawing the pictures…",
};

/** One half of the open book - an image up top, the story text below, a
 * page number in the corner. Identical markup for the left and right leaf,
 * just told which way it faces. */
const Leaf: React.FC<{
  page: StorybookPage | null;
  side: "left" | "right";
  onClick?: () => void;
  clickable: boolean;
  highContrast: boolean;
  signLanguage: boolean;
}> = ({ page, side, onClick, clickable, highContrast, signLanguage }) => (
  // A <div role="button"> rather than a real <button> - the fingerspelling
  // strip below the story text renders its own letter buttons, and a
  // <button> can't legally contain nested <button>s.
  <div
    role="button"
    tabIndex={clickable ? 0 : -1}
    onClick={clickable ? onClick : undefined}
    onKeyDown={
      clickable
        ? (e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onClick?.();
            }
          }
        : undefined
    }
    aria-disabled={!clickable}
    className={`group relative flex-1 min-h-[22rem] sm:min-h-[28rem] p-5 sm:p-8 flex flex-col text-left transition-transform outline-none ${
      highContrast ? "bg-black text-yellow-300" : "bg-[#f8f4ec] text-slate-800"
    } ${
      side === "left"
        ? "rounded-t-2xl sm:rounded-l-2xl sm:rounded-tr-none"
        : "rounded-b-2xl sm:rounded-r-2xl sm:rounded-bl-none"
    } ${clickable ? "cursor-pointer hover:brightness-95 focus-visible:ring-2 focus-visible:ring-sky-500" : "cursor-default"}`}
    style={{
      boxShadow:
        side === "left"
          ? "inset -8px 0 16px -12px rgba(0,0,0,0.35)"
          : "inset 8px 0 16px -12px rgba(0,0,0,0.35)",
    }}
    aria-label={
      page
        ? `Page ${page.pageNumber}`
        : side === "left"
          ? "Previous page"
          : "Next page"
    }
  >
    {page ? (
      <>
        {page.imageUrl ? (
          <img
            src={resolveMediaUrl(page.imageUrl)}
            alt={`Page ${page.pageNumber}`}
            className="w-full h-40 sm:h-56 object-cover rounded-xl mb-4 shadow-sm"
          />
        ) : (
          <div className="w-full h-40 sm:h-56 rounded-xl mb-4 bg-black/5 border border-black/10 flex items-center justify-center text-slate-400 text-sm">
            <ImageIcon className="w-5 h-5 mr-2" /> No picture for this page
          </div>
        )}
        <p className="flex-1 text-base sm:text-lg leading-relaxed">
          {page.storyText}
        </p>
        {signLanguage && pickKeyWord(page.storyText) && (
          <AslFingerspellingStrip word={pickKeyWord(page.storyText) as string} highContrast={highContrast} />
        )}
        <span className={`mt-4 text-xs self-center ${highContrast ? "text-yellow-500" : "text-slate-400"}`}>
          {page.pageNumber}
        </span>
      </>
    ) : (
      <div className={`flex-1 flex flex-col items-center justify-center ${highContrast ? "text-yellow-700" : "text-slate-300"}`}>
        <BookOpen className="w-10 h-10 mb-2" />
        <span className="text-sm">The End</span>
      </div>
    )}

    {clickable && (
      <span
        className={`absolute top-1/2 -translate-y-1/2 ${side === "left" ? "left-2" : "right-2"} opacity-0 group-hover:opacity-70 transition-opacity text-slate-500`}
      >
        {side === "left" ? <ChevronLeft className="w-6 h-6" /> : <ChevronRight className="w-6 h-6" />}
      </span>
    )}
  </div>
);

/**
 * The unit's own content retold as an illustrated story - a fifth
 * presentation mode alongside Text/Audio/Visual/AR. Generated once per
 * curriculum, then just paged through like an open book: two leaves visible
 * at once, click the right leaf to turn forward, the left leaf to turn back.
 */
export const StorybookView: React.FC<{ unitId: string }> = ({ unitId }) => {
  const { prefs } = useAccessibility();
  const { user } = useAuth();
  const isDeafUser = user?.disabilityType === "DEAFNESS" || prefs.signLanguage;
  const { speak, stop: stopSpeaking, loading: ttsLoading } = useSpeech();
  const [storybook, setStorybook] = useState<Storybook | null | undefined>(undefined); // undefined = still loading
  const [spreadIndex, setSpreadIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [starting, setStarting] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const load = useCallback(async () => {
    const { data } = await api.get(`/units/${unitId}/curriculum/storybook`);
    setStorybook(data.storybook);
    return data.storybook as Storybook | null;
  }, [unitId]);

  const beginPolling = useCallback(() => {
    stopPolling();
    pollRef.current = setInterval(async () => {
      const fresh = await load();
      if (fresh && !GENERATING_STATUSES.has(fresh.status)) stopPolling();
    }, POLL_INTERVAL_MS);
  }, [load, stopPolling]);

  useEffect(() => {
    let cancelled = false;
    load().then((sb) => {
      if (!cancelled && sb && GENERATING_STATUSES.has(sb.status)) beginPolling();
    });
    return () => {
      cancelled = true;
      stopPolling();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unitId]);

  // "Always narrate lessons" (Settings) also covers Storybook mode - reads
  // the current spread's page(s) aloud as soon as they're on screen, same
  // fallback chain (live TTS -> browser voice) as the lesson player.
  useEffect(() => {
    if (!prefs.alwaysNarrate) return;
    if (!storybook || storybook.status !== "READY") return;
    const left = storybook.pages[spreadIndex * 2];
    const right = storybook.pages[spreadIndex * 2 + 1];
    const text = [left?.storyText, right?.storyText].filter(Boolean).join(" ");
    if (text) speak(text);
    return () => stopSpeaking();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefs.alwaysNarrate, storybook, spreadIndex]);

  useEffect(() => stopSpeaking, []); // eslint-disable-line react-hooks/exhaustive-deps

  const generate = async () => {
    setStarting(true);
    try {
      const { data } = await api.post(`/units/${unitId}/curriculum/storybook`);
      setStorybook(data.storybook);
      if (GENERATING_STATUSES.has(data.storybook.status)) beginPolling();
    } finally {
      setStarting(false);
    }
  };

  const cardClass =
    "bg-white border border-slate-200/80 shadow-xs dark:bg-white/[0.09] dark:backdrop-blur-2xl dark:border-white/[0.14] dark:shadow-none";

  if (storybook === undefined) {
    return (
      <div className={`max-w-md mx-auto ${cardClass} p-12 rounded-3xl text-center text-slate-500 dark:text-gray-400`}>
        Loading…
      </div>
    );
  }

  if (!storybook) {
    return (
      <div className={`max-w-md mx-auto ${cardClass} p-10 rounded-3xl text-center`}>
        <Wand2 className="w-10 h-10 text-primary mx-auto mb-4" />
        <h3 className="text-xl font-display font-bold mb-2 text-slate-800 dark:text-white">
          Turn this lesson into a story
        </h3>
        <p className="text-slate-500 dark:text-gray-400 mb-6">
          We'll write a short 5-page illustrated story from this unit's own
          content - the same ideas, told as a story.
        </p>
        <Button onClick={generate} loading={starting} className="gap-2">
          <Wand2 className="w-4 h-4" /> Make my storybook
        </Button>
      </div>
    );
  }

  if (GENERATING_STATUSES.has(storybook.status)) {
    return (
      <div className={`max-w-md mx-auto ${cardClass} p-12 rounded-3xl text-center`}>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="w-10 h-10 mx-auto mb-4"
        >
          <Wand2 className="w-10 h-10 text-primary" />
        </motion.div>
        <p className="text-slate-700 dark:text-gray-300 font-medium">
          {STATUS_LABEL[storybook.status] || "Working on it…"}
        </p>
        <p className="text-xs text-slate-400 dark:text-gray-500 mt-2">
          This takes a little while the first time - it's saved after, so
          it's instant next time.
        </p>
      </div>
    );
  }

  if (storybook.status === "FAILED") {
    return (
      <div className={`max-w-md mx-auto ${cardClass} p-10 rounded-3xl text-center`}>
        <AlertCircle className="w-10 h-10 text-amber-500 dark:text-amber-400 mx-auto mb-4" />
        <p className="text-slate-700 dark:text-gray-300 mb-2">Couldn't write the story this time.</p>
        {storybook.errorMessage && (
          <p className="text-xs text-slate-400 dark:text-gray-500 mb-6">{storybook.errorMessage}</p>
        )}
        <Button onClick={generate} loading={starting}>
          Try again
        </Button>
      </div>
    );
  }

  const pages = storybook.pages;
  const totalSpreads = Math.ceil(pages.length / 2);
  const left = pages[spreadIndex * 2] ?? null;
  const right = pages[spreadIndex * 2 + 1] ?? null;
  const onFirstSpread = spreadIndex === 0;
  const onLastSpread = spreadIndex >= totalSpreads - 1;

  const turn = (dir: 1 | -1) => {
    setDirection(dir);
    setSpreadIndex((i) => Math.max(0, Math.min(totalSpreads - 1, i + dir)));
  };

  // Reduced motion: skip the 3D page-turn tilt entirely, just cut straight
  // to the next spread - same page-turning mechanic, no rotation/opacity ramp.
  const variants = prefs.reducedMotion
    ? { enter: { rotateY: 0, opacity: 1 }, center: { rotateY: 0, opacity: 1 }, exit: { rotateY: 0, opacity: 1 } }
    : {
        enter: (dir: number) => ({ rotateY: dir > 0 ? 60 : -60, opacity: 0 }),
        center: { rotateY: 0, opacity: 1 },
        exit: (dir: number) => ({ rotateY: dir > 0 ? -60 : 60, opacity: 0 }),
      };

  const hc = prefs.highContrast;

  return (
    <div className="px-4 sm:px-8">
      {storybook.title && (
        <h2 className={`text-xl font-display font-bold text-center mb-4 ${hc ? "text-yellow-300" : "text-slate-800 dark:text-white"}`}>
          {storybook.title}
        </h2>
      )}

      <div style={{ perspective: 2200 }} className="max-w-5xl mx-auto">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={spreadIndex}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: prefs.reducedMotion ? 0 : 0.4, ease: "easeInOut" }}
            style={{ transformStyle: "preserve-3d" }}
            className={`flex flex-col sm:flex-row rounded-2xl overflow-hidden shadow-2xl border-4 sm:divide-x-0 divide-y sm:divide-y-0 ${
              hc ? "border-yellow-500 divide-yellow-700" : "border-[#e8e0d0] divide-black/10"
            }`}
          >
            <Leaf
              page={left}
              side="left"
              clickable={!onFirstSpread}
              onClick={() => turn(-1)}
              highContrast={hc}
              signLanguage={isDeafUser}
            />
            <Leaf
              page={right}
              side="right"
              clickable={!onLastSpread}
              onClick={() => turn(1)}
              highContrast={hc}
              signLanguage={isDeafUser}
            />
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="flex items-center justify-center gap-4 mt-6">
        <button
          onClick={() => turn(-1)}
          disabled={onFirstSpread}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed dark:border-white/20 dark:text-white dark:hover:bg-white/5 dark:hover:border-white/40 transition-colors font-medium"
        >
          <ChevronLeft className="w-4 h-4" /> Previous
        </button>
        <div className="flex gap-1.5">
          {Array.from({ length: totalSpreads }).map((_, i) => (
            <button
              key={i}
              onClick={() => {
                setDirection(i > spreadIndex ? 1 : -1);
                setSpreadIndex(i);
              }}
              aria-label={`Spread ${i + 1}`}
              className={`w-2.5 h-2.5 rounded-full transition-all ${
                i === spreadIndex
                  ? "bg-primary w-6"
                  : "bg-slate-300 hover:bg-slate-400 dark:bg-white/20 dark:hover:bg-white/40"
              }`}
            />
          ))}
        </div>
        <Button onClick={() => turn(1)} disabled={onLastSpread} className="gap-2">
          Next <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
      <div className="flex justify-center mt-3">
        <button
          onClick={() => {
            const text = [left?.storyText, right?.storyText].filter(Boolean).join(" ");
            if (text) speak(text);
          }}
          disabled={ttsLoading}
          className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-300 dark:hover:text-blue-200 disabled:opacity-60"
        >
          {ttsLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Volume2 className="w-4 h-4" />}
          {ttsLoading ? "Loading audio…" : "Listen to this page"}
        </button>
      </div>
      <p className="text-center text-xs text-slate-400 dark:text-gray-500 mt-3">
        Click the right page to turn forward, the left page to turn back.
      </p>
    </div>
  );
};

export default StorybookView;
