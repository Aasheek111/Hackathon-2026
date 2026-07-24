import { useEffect, useRef, useState } from 'react';
import api from '../lib/api';

const CV_SERVICE_URL = import.meta.env.VITE_CV_SERVICE_URL || 'http://localhost:8000';
// Passive tutorial logging doesn't need the quiz's 250ms real-time cadence -
// a sample every few seconds is plenty to build a concentration picture and
// keeps the webcam/CV load light.
const SAMPLE_INTERVAL_MS = 4000;
const CONSENT_STORAGE_KEY = 'neurolearn_camera_consent';

export function hasCameraConsent(): boolean {
  try {
    return localStorage.getItem(CONSENT_STORAGE_KEY) === 'granted';
  } catch {
    return false;
  }
}

interface Tracking {
  active: boolean;
  score: number | null;
  faceDetected: boolean;
}

/**
 * Streams concentration while a student is in the tutorial player: grabs a
 * webcam frame every few seconds, sends it to the local CV service for an
 * engagement/gaze read, and posts a rollup to the backend keyed to the unit +
 * lesson the student is currently on. All local compute, no external AI, and
 * fully best-effort - a denied camera or a dropped frame just means no data
 * that tick, never a broken lesson.
 *
 * Runs the webcam imperatively (no rendered <video>) so a page can opt in
 * with a single hook call. lessonOrder/mode are read live from refs, so the
 * webcam isn't torn down and restarted every time the student flips a lesson
 * or switches presentation mode.
 */
export function useConcentrationTracking(
  unitId: string,
  lessonOrder: number,
  mode: string,
  enabled: boolean
): Tracking {
  const [active, setActive] = useState(false);
  const [score, setScore] = useState<number | null>(null);
  const [faceDetected, setFaceDetected] = useState(false);

  /**
   * Whether this tab is actually being looked at.
   *
   * Unmount cleanup already released the camera correctly, but switching to
   * another TAB doesn't unmount anything - the component stays alive and the
   * webcam light stays on while nobody is even looking at the page. That is a
   * privacy problem, not just a resource one, and it also makes the focus
   * samples meaningless (nobody is there to be focused).
   *
   * Folding visibility into the same guard as `enabled` means a hidden tab
   * tears the camera down through the existing, already-correct cleanup path,
   * and re-acquires it on return.
   */
  const [pageVisible, setPageVisible] = useState(
    typeof document === 'undefined' ? true : !document.hidden,
  );
  useEffect(() => {
    const onVisibility = () => setPageVisible(!document.hidden);
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  const lessonRef = useRef(lessonOrder);
  const modeRef = useRef(mode);
  useEffect(() => {
    lessonRef.current = lessonOrder;
  }, [lessonOrder]);
  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  useEffect(() => {
    if (!enabled || !unitId || !pageVisible) return;
    let cancelled = false;
    let intervalId: ReturnType<typeof setInterval> | null = null;
    let stream: MediaStream | null = null;
    let video: HTMLVideoElement | null = null;
    const canvas = document.createElement('canvas');
    const smooth = { value: 0 };

    const sample = async () => {
      if (!video || video.readyState < 2 || !video.videoWidth) return;
      canvas.width = 320;
      canvas.height = Math.round((video.videoHeight / video.videoWidth) * 320) || 240;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const frame = canvas.toDataURL('image/jpeg', 0.6);
      try {
        const res = await fetch(`${CV_SERVICE_URL}/analyze-frame`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ frame, session_id: `tutorial-${unitId}` })
        });
        if (!res.ok || cancelled) return;
        const r = await res.json();
        const face = !!r.face_detected;
        const raw = face ? Math.max(0, Math.min(100, r.engagement_score)) : 0;
        smooth.value = face ? Math.round(smooth.value * 0.55 + raw * 0.45) : 0;
        const s = smooth.value;
        const focused = face && r.gaze === 'forward' && s >= 60;
        setFaceDetected(face);
        setScore(s);
        if (face) {
          api
            .post(`/units/${unitId}/engagement`, {
              lessonOrder: lessonRef.current,
              score: s,
              focused,
              mode: modeRef.current
            })
            .catch(() => {});
        }
      } catch {
        /* CV service unreachable this tick - try again next interval */
      }
    };

    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
          audio: false
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        video = document.createElement('video');
        video.srcObject = stream;
        video.muted = true;
        (video as any).playsInline = true;
        await video.play().catch(() => {});
        setActive(true);
        intervalId = setInterval(sample, SAMPLE_INTERVAL_MS);
      } catch {
        setActive(false);
      }
    })();

    return () => {
      cancelled = true;
      if (intervalId) clearInterval(intervalId);
      stream?.getTracks().forEach((t) => t.stop());
      if (video) video.srcObject = null;
      setActive(false);
    };
  }, [enabled, unitId, pageVisible]);

  return { active, score, faceDetected };
}
