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

// Pixel size a scoped page should use for its own root font-size (inline
// style, e.g. CurriculumPlayerPage/StorybookView) - deliberately NOT applied
// globally via document.documentElement, matching the same "scoped to
// specific files, never touch shared CSS" convention already used for the
// light/dark theme toggle, so pages that haven't opted in are unaffected.
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
