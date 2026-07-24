import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import api from '../lib/api';
import { useAuth, type DisabilityType } from './AuthContext';

export type FontSize = 'SMALL' | 'MEDIUM' | 'LARGE' | 'XLARGE';
export type AppTheme = 'DEFAULT' | 'DYSLEXIA' | 'ADHD' | 'SENSORY' | 'DARK_CONTRAST';

export interface AccessibilityPrefs {
  fontSize: FontSize;
  highContrast: boolean;
  alwaysNarrate: boolean;
  reducedMotion: boolean;
  signLanguage: boolean;
  audiobookMode: boolean;
  appTheme: AppTheme;
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
  appTheme: 'DEFAULT',
};

// Applied to <html>'s own font-size, which is what Tailwind's text-* classes
// scale from (they're all rem, and rem is always relative to the ROOT
// element, never the nearest ancestor).

export const FONT_SCALE_PX: Record<FontSize, string> = {
  SMALL: '14px',
  MEDIUM: '16px',
  LARGE: '18px',
  XLARGE: '21px',
};

const LOCAL_STORAGE_KEY = 'pragya_accessibility_prefs';

const loadLocalPrefs = (): AccessibilityPrefs => {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      return { ...DEFAULT_PREFS, ...JSON.parse(raw) };
    }
  } catch {
    /* fallback to defaults */
  }
  return DEFAULT_PREFS;
};

interface AccessibilityContextType {
  prefs: AccessibilityPrefs;
  loading: boolean;
  updatePrefs: (patch: AccessibilityPatch) => Promise<void>;
  resetPrefs: () => void;
}

const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined);

export const AccessibilityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, token, refreshUser } = useAuth();
  const [prefs, setPrefs] = useState<AccessibilityPrefs>(loadLocalPrefs);
  const [loading, setLoading] = useState(false);

  // Apply DOM side-effects globally whenever prefs change
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(prefs));
    } catch {
      /* ignore storage errors */
    }

    const root = document.documentElement;
    root.classList.toggle('high-contrast', prefs.highContrast);
    root.classList.toggle('reduced-motion', prefs.reducedMotion);
    root.style.fontSize = FONT_SCALE_PX[prefs.fontSize] || '16px';
    root.setAttribute('data-theme', prefs.appTheme || 'DEFAULT');
  }, [prefs]);

  // Load student preferences from backend on mount or user login
  useEffect(() => {
    if (!token || user?.role !== 'STUDENT') {
      return;
    }
    let cancelled = false;
    setLoading(true);
    api
      .get('/me/accessibility')
      .then(({ data }) => {
        if (cancelled) return;
        setPrefs((prev) => ({
          ...prev,
          fontSize: data.fontSize || prev.fontSize,
          highContrast: data.highContrast ?? prev.highContrast,
          alwaysNarrate: data.alwaysNarrate ?? prev.alwaysNarrate,
          reducedMotion: data.reducedMotion ?? prev.reducedMotion,
          signLanguage: data.signLanguage ?? prev.signLanguage,
          audiobookMode: data.audiobookMode ?? prev.audiobookMode,
          appTheme: data.appTheme || prev.appTheme || 'DEFAULT',
        }));
      })
      .catch(() => {
        // Fallback to client-side storage
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
      
      setPrefs((prev) => {
        const next = { ...prev, ...prefPatch };
        try {
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(next));
        } catch {}
        return next;
      });

      if (token && user?.role === 'STUDENT') {
        try {
          const { data } = await api.patch('/me/accessibility', patch);
          setPrefs((prev) => ({
            ...prev,
            fontSize: data.fontSize || prev.fontSize,
            highContrast: data.highContrast ?? prev.highContrast,
            alwaysNarrate: data.alwaysNarrate ?? prev.alwaysNarrate,
            reducedMotion: data.reducedMotion ?? prev.reducedMotion,
            signLanguage: data.signLanguage ?? prev.signLanguage,
            audiobookMode: data.audiobookMode ?? prev.audiobookMode,
            appTheme: prefPatch.appTheme || prev.appTheme || 'DEFAULT',
          }));
          if (disabilityType !== undefined) await refreshUser();
        } catch {
          // Local fallback holds
        }
      }
    },
    [token, user?.role, refreshUser]
  );

  const resetPrefs = useCallback(() => {
    updatePrefs(DEFAULT_PREFS);
  }, [updatePrefs]);

  return (
    <AccessibilityContext.Provider value={{ prefs, loading, updatePrefs, resetPrefs }}>
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
