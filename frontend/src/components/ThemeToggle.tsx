import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

/** A small light/dark switch, reusable in any header/sidebar. */
export const ThemeToggle: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      title={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      className={`inline-flex items-center justify-center w-9 h-9 rounded-full border transition-colors ${
        isDark
          ? 'bg-white/5 border-white/15 text-gray-300 hover:bg-white/10 hover:text-white'
          : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700 shadow-xs'
      } ${className}`}
    >
      {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
    </button>
  );
};

export default ThemeToggle;
