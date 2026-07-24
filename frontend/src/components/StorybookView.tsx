import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Wand2,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Image as ImageIcon,
} from "lucide-react";
import Button from "./ui/Button";
import api, { resolveMediaUrl } from "../lib/api";

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

/**
 * The unit's own content retold as a 5-page illustrated story - a fifth
 * presentation mode alongside Text/Audio/Visual/AR (TODO.md's storybook-mode
 * addition). Generated once per curriculum, then just page-flipped; nothing
 * here ever re-triggers generation once a storybook exists.
 */
export const StorybookView: React.FC<{ unitId: string }> = ({ unitId }) => {
  const [storybook, setStorybook] = useState<Storybook | null | undefined>(undefined); // undefined = still loading
  const [pageIndex, setPageIndex] = useState(0);
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

  useEffect(() => {
    let cancelled = false;
    load().then((sb) => {
      if (!cancelled && sb && GENERATING_STATUSES.has(sb.status)) {
        pollRef.current = setInterval(async () => {
          const fresh = await load();
          if (fresh && !GENERATING_STATUSES.has(fresh.status)) stopPolling();
        }, POLL_INTERVAL_MS);
      }
    });
    return () => {
      cancelled = true;
      stopPolling();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unitId]);

  const generate = async () => {
    setStarting(true);
    try {
      const { data } = await api.post(`/units/${unitId}/curriculum/storybook`);
      setStorybook(data.storybook);
      if (GENERATING_STATUSES.has(data.storybook.status)) {
        pollRef.current = setInterval(async () => {
          const fresh = await load();
          if (fresh && !GENERATING_STATUSES.has(fresh.status)) stopPolling();
        }, POLL_INTERVAL_MS);
      }
    } finally {
      setStarting(false);
    }
  };

  if (storybook === undefined) {
    return (
      <div className="glass-strong p-12 rounded-3xl text-center text-gray-400">
        Loading…
      </div>
    );
  }

  if (!storybook) {
    return (
      <div className="glass-strong p-10 rounded-3xl text-center">
        <Wand2 className="w-10 h-10 text-primary mx-auto mb-4" />
        <h3 className="text-xl font-display font-bold mb-2">
          Turn this lesson into a story
        </h3>
        <p className="text-gray-400 mb-6 max-w-md mx-auto">
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
      <div className="glass-strong p-12 rounded-3xl text-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="w-10 h-10 mx-auto mb-4"
        >
          <Wand2 className="w-10 h-10 text-primary" />
        </motion.div>
        <p className="text-gray-300 font-medium">
          {STATUS_LABEL[storybook.status] || "Working on it…"}
        </p>
        <p className="text-xs text-gray-500 mt-2">
          This takes a little while the first time - it's saved after, so
          it's instant next time.
        </p>
      </div>
    );
  }

  if (storybook.status === "FAILED") {
    return (
      <div className="glass-strong p-10 rounded-3xl text-center">
        <AlertCircle className="w-10 h-10 text-amber-400 mx-auto mb-4" />
        <p className="text-gray-300 mb-2">Couldn't write the story this time.</p>
        {storybook.errorMessage && (
          <p className="text-xs text-gray-500 mb-6">{storybook.errorMessage}</p>
        )}
        <Button onClick={generate} loading={starting}>
          Try again
        </Button>
      </div>
    );
  }

  const pages = storybook.pages;
  const page = pages[pageIndex];
  if (!page) return null;

  return (
    <div>
      {storybook.title && (
        <h2 className="text-xl font-display font-bold text-center mb-4">
          {storybook.title}
        </h2>
      )}
      <AnimatePresence mode="wait">
        <motion.div
          key={page.id}
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -30 }}
          className="glass-strong p-6 sm:p-10 rounded-3xl mb-6"
        >
          {page.imageUrl ? (
            <img
              src={resolveMediaUrl(page.imageUrl)}
              alt={`Page ${page.pageNumber}`}
              className="w-full max-h-[28rem] object-contain rounded-2xl mb-6 bg-black/20"
            />
          ) : (
            <div className="w-full h-48 rounded-2xl mb-6 bg-black/20 border border-white/10 flex items-center justify-center text-gray-500 text-sm">
              <ImageIcon className="w-5 h-5 mr-2" /> No picture for this page
            </div>
          )}
          <p className="text-xl text-gray-200 leading-relaxed text-center">
            {page.storyText}
          </p>
        </motion.div>
      </AnimatePresence>

      <div className="flex items-center justify-between gap-3">
        <Button
          variant="ghost"
          onClick={() => setPageIndex((i) => Math.max(0, i - 1))}
          disabled={pageIndex === 0}
          className="gap-2"
        >
          <ChevronLeft className="w-4 h-4" /> Previous
        </Button>
        <div className="flex gap-1.5">
          {pages.map((p, i) => (
            <button
              key={p.id}
              onClick={() => setPageIndex(i)}
              aria-label={`Page ${p.pageNumber}`}
              className={`w-2.5 h-2.5 rounded-full transition-all ${
                i === pageIndex ? "bg-primary w-6" : "bg-white/20 hover:bg-white/40"
              }`}
            />
          ))}
        </div>
        <Button
          onClick={() => setPageIndex((i) => Math.min(pages.length - 1, i + 1))}
          disabled={pageIndex === pages.length - 1}
          className="gap-2"
        >
          Next <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};

export default StorybookView;
