import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import api from '../lib/api';
import { useAuth, type DisabilityType } from './AuthContext';

export type FontSize = 'SMALL' | 'MEDIUM' | 'LARGE' | 'XLARGE';

export interface AccessibilityPrefs {
  fontSize: FontSize;
  highContrast: boolean;
  alwaysNarrate: boolean;
  reducedMotion: boolean;
  signLanguage: boolean;
  audiobookMode: boolean;
}

/** What PATCH /me/accessibility accepts - the prefs plus the profile itself. */
export type AccessibilityPatch = Partial<AccessibilityPrefs> & {
  disabilityType?: DisabilityType | null;
};

const DEFAULT_PREFS: AccessibilityPrefs = {
  fontSize: 'MEDIUM',
  highContrast: false,
  alwaysNarrate: false,
  reducedMotion: false,
  signLanguage: false,
  audiobookMode: false,
};

// Applied to <html>'s own font-size, which is what Tailwind's text-* classes
// scale from (they're all rem, and rem is always relative to the ROOT
// element, never the nearest ancestor - setting this on a wrapper div, which
// is what an earlier version of this file did, has NO effect on rem-sized
// text and is why the setting looked broken outside two hand-patched pages).
// Root-level IS the right amount of "global" here specifically because rem
// scaling is purely additive - every page gets proportionally bigger text
// and spacing with no risk of the color/contrast breakage that kept the
// light/dark theme toggle deliberately page-scoped.
export const FONT_SCALE_PX: Record<FontSize, string> = {
  SMALL: '15px',
  MEDIUM: '16px',
  LARGE: '19px',
  XLARGE: '23px',
};

interface AccessibilityContextType {
  prefs: AccessibilityPrefs;
  loading: boolean;
  updatePrefs: (patch: AccessibilityPatch) => Promise<void>;
}

const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined);

export const AccessibilityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, token, refreshUser } = useAuth();
  const [prefs, setPrefs] = useState<AccessibilityPrefs>(DEFAULT_PREFS);
  const [loading, setLoading] = useState(false);

  // Only students have AccessibilityPrefs rows (see backend/src/routes/accessibility.ts) -
  // teachers/admins just get the defaults, applied harmlessly since nothing
  // reads them for those roles.
  useEffect(() => {
    if (!token || user?.role !== 'STUDENT') {
      setPrefs(DEFAULT_PREFS);
      return;
    }
    let cancelled = false;
    setLoading(true);
    api
      .get('/me/accessibility')
      .then(({ data }) => {
        if (cancelled) return;
        setPrefs({
          fontSize: data.fontSize,
          highContrast: data.highContrast,
          alwaysNarrate: data.alwaysNarrate,
          reducedMotion: data.reducedMotion,
          signLanguage: data.signLanguage,
          audiobookMode: data.audiobookMode,
        });
      })
      .catch(() => {
        // Best-effort - stay on client-side defaults rather than blocking the page.
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token, user?.role]);

  // Root-level font scaling - see FONT_SCALE_PX's doc comment for why this
  // has to be the actual <html> element rather than a wrapper. Reset to the
  // browser default (not just MEDIUM's 16px) on logout/non-student so a
  // teacher/admin session, or the logged-out landing page, is never left at
  // a previous student's size.
  useEffect(() => {
    document.documentElement.style.fontSize =
      token && user?.role === 'STUDENT' ? FONT_SCALE_PX[prefs.fontSize] : '';
  }, [token, user?.role, prefs.fontSize]);

  const updatePrefs = useCallback(
    async (patch: AccessibilityPatch) => {
      const { disabilityType, ...prefPatch } = patch;
      // Optimistic - user-set beats inferred, applies instantly. disabilityType
      // is a User field, not a pref, so it's kept out of this merge.
      setPrefs((prev) => ({ ...prev, ...prefPatch }));
      try {
        const { data } = await api.patch('/me/accessibility', patch);
        // Adopt the server's row rather than only the optimistic merge:
        // changing disabilityType re-seeds that profile's defaults server-side
        // (see backend/src/routes/accessibility.ts), so the response can
        // legitimately contain toggles we never sent.
        setPrefs({
          fontSize: data.fontSize,
          highContrast: data.highContrast,
          alwaysNarrate: data.alwaysNarrate,
          reducedMotion: data.reducedMotion,
          signLanguage: data.signLanguage,
          audiobookMode: data.audiobookMode,
        });
        // Pull the new disabilityType into AuthContext so routing (homePathFor)
        // and any profile display follow immediately, without a reload.
        if (disabilityType !== undefined) await refreshUser();
      } catch {
        // Best-effort sync; the local change still stands for this session.
      }
    },
    [refreshUser]
  );

  return (
    <AccessibilityContext.Provider value={{ prefs, loading, updatePrefs }}>
      {children}
    </AccessibilityContext.Provider>
  );
};

export const useAccessibility = () => {
  const context = useContext(AccessibilityContext);
  if (context === undefined) {
    throw new Error('useAccessibility must be used within an AccessibilityProvider');
  }
  return context;
};
