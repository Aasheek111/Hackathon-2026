import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import api from '../lib/api';
import { useAuth } from './AuthContext';

export type FontSize = 'SMALL' | 'MEDIUM' | 'LARGE' | 'XLARGE';

export interface AccessibilityPrefs {
  fontSize: FontSize;
  highContrast: boolean;
  alwaysNarrate: boolean;
  reducedMotion: boolean;
  signLanguage: boolean;
  audiobookMode: boolean;
}

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
  updatePrefs: (patch: Partial<AccessibilityPrefs>) => Promise<void>;
}

const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined);

export const AccessibilityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, token } = useAuth();
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

  const updatePrefs = useCallback(async (patch: Partial<AccessibilityPrefs>) => {
    setPrefs((prev) => ({ ...prev, ...patch })); // optimistic - user-set beats inferred, applies instantly
    try {
      await api.patch('/me/accessibility', patch);
    } catch {
      // Best-effort sync; the local change still stands for this session.
    }
  }, []);

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
