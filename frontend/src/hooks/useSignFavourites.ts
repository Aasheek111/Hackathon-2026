import { useCallback, useEffect, useState } from "react";
import api from "../lib/api";
import { loadFavourites, saveFavourites } from "../data/signLanguage";

/**
 * Starred signs, synced to the student's account (GET/POST/DELETE
 * /api/me/sign-favourites) with localStorage as an instant-paint cache and
 * offline fallback.
 *
 * Load order: render immediately from whatever's cached locally (no loading
 * spinner for a list of stars), then reconcile with the server in the
 * background and adopt its list as truth once it answers - a favourite
 * starred on another device should show up here too.
 */
export function useSignFavourites() {
  const [favourites, setFavourites] = useState<string[]>(() => loadFavourites());
  const [synced, setSynced] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api
      .get("/me/sign-favourites")
      .then(({ data }) => {
        if (cancelled) return;
        setFavourites(data.signIds);
        saveFavourites(data.signIds);
        setSynced(true);
      })
      .catch(() => {
        // Not a student, logged out, or offline - the local cache stands.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const toggleFavourite = useCallback((signId: string) => {
    setFavourites((prev) => {
      const isFav = prev.includes(signId);
      const next = isFav ? prev.filter((id) => id !== signId) : [...prev, signId];
      saveFavourites(next);
      const request = isFav
        ? api.delete(`/me/sign-favourites/${encodeURIComponent(signId)}`)
        : api.post("/me/sign-favourites", { signId });
      request.catch(() => {
        // Best-effort sync, same contract as AccessibilityContext.updatePrefs -
        // the local star still stands for this session even if the write fails.
      });
      return next;
    });
  }, []);

  return { favourites, toggleFavourite, synced };
}

export default useSignFavourites;
