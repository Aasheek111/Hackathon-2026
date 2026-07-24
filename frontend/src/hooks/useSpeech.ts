import { useRef, useState } from "react";
import api from "../lib/api";

const RAG_SERVICE_URL =
  import.meta.env.VITE_RAG_SERVICE_URL || "http://localhost:8100";

/**
 * Gemini TTS (rag-service `/generate-speech`, cached by content hash) with a
 * fallback to the browser's own speechSynthesis if the call fails (no key,
 * quota, network) - never goes silent, matching this app's established
 * offline-degrades-gracefully contract for its other AI features. Shared by
 * CurriculumPlayerPage and StorybookView so both read-aloud experiences
 * (lesson narration, storybook page narration) go through the same fallback
 * chain instead of two divergent implementations.
 */
export function useSpeech() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [loading, setLoading] = useState(false);
  const synth = window.speechSynthesis;

  const playUrl = async (url: string, onEnded?: () => void) => {
    if (!audioRef.current) audioRef.current = new Audio();
    audioRef.current.onended = onEnded ?? null;
    audioRef.current.src = `${RAG_SERVICE_URL}${url}`;
    await audioRef.current.play();
  };

  // preGeneratedUrl: a pre-generated clip (e.g. a lesson's own audioUrl),
  // produced on the queue worker for instant playback, no round-trip. Falls
  // through to a live /tts call, then to the browser's own voice, so
  // "Listen" always makes sound even when no clip was pre-generated.
  // onEnded (optional): fires when this clip finishes - used by Audiobook
  // mode to chain straight into the next lesson hands-free.
  const speak = async (text: string, preGeneratedUrl?: string | null, onEnded?: () => void) => {
    const trimmed = text.trim();
    if (!trimmed && !preGeneratedUrl) return;
    synth.cancel();
    audioRef.current?.pause();
    setLoading(true);
    try {
      if (preGeneratedUrl) {
        await playUrl(preGeneratedUrl, onEnded);
        return;
      }
      const { data } = await api.post("/tts", { text: trimmed });
      await playUrl(data.audioUrl, onEnded);
    } catch {
      if (trimmed) {
        const utterance = new SpeechSynthesisUtterance(trimmed);
        if (onEnded) utterance.onend = onEnded;
        synth.speak(utterance);
      } else {
        onEnded?.();
      }
    } finally {
      setLoading(false);
    }
  };

  const stop = () => {
    audioRef.current?.pause();
    synth.cancel();
  };

  return { speak, stop, loading };
}

export default useSpeech;
