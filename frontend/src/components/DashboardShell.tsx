import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogOut, LucideIcon } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export interface NavItem {
  icon: LucideIcon;
  label: string;
  path: string;
  active?: boolean;
  badge?: number;
  /** For in-page tabs (no real route change) instead of navigating to `path`. */
  onClick?: () => void;
}

interface DashboardShellProps {
  navItems: NavItem[];
  children: React.ReactNode;
}

/**
 * The sidebar/logout/user-badge chrome that DashboardPage.tsx already
 * established. Pulled out because Teacher, Classroom, Tutorial and Progress
 * pages all need the identical shell around different content - this is the
 * "reuse the existing theme and components" instruction applied literally.
 */
export const DashboardShell: React.FC<DashboardShellProps> = ({ navItems, children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-dark flex">
      <aside className="w-64 glass border-r border-white/5 flex-col hidden md:flex sticky top-0 h-screen">
        <div className="p-6">
          <Link to="/" className="flex items-center space-x-2">
            <span className="text-2xl">🧠</span>
            <span className="font-display font-bold text-xl tracking-tight gradient-text">NeuroLearn</span>
          </Link>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2">
          {navItems.map((item, i) => (
            <button
              key={i}
              onClick={() => (item.onClick ? item.onClick() : navigate(item.path))}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all ${
                item.active
                  ? 'bg-primary/20 text-white border border-primary/30'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <span className="flex items-center space-x-3">
                <item.icon className={`w-5 h-5 ${item.active ? 'text-primary' : ''}`} />
                <span className="font-medium">{item.label}</span>
              </span>
              {!!item.badge && (
                <span className="bg-accent text-dark text-[10px] font-bold rounded-full px-1.5 py-0.5">
                  {item.badge}
                </span>
              )}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-white/10">
          <div className="flex items-center space-x-3 mb-4 px-2">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-bold">
              {user?.name?.charAt(0) || 'U'}
            </div>
            <div>
              <p className="font-medium text-sm text-white truncate max-w-[120px]">{user?.name || 'User'}</p>
              <p className="text-xs text-gray-500 truncate max-w-[120px]">{user?.email || ''}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center space-x-3 px-4 py-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 p-6 md:p-10 overflow-y-auto">{children}</main>
    </div>
  );
};

export default DashboardShell;
