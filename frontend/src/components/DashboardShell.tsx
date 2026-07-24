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

export const DashboardShell: React.FC<DashboardShellProps> = ({ navItems, children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-[#FAF9F5] text-slate-800 flex font-sans selection:bg-emerald-100 selection:text-emerald-900">
      <aside className="w-64 bg-white border-r border-slate-200/80 flex-col hidden md:flex sticky top-0 h-screen shadow-xs">
        <div className="p-6 border-b border-slate-100">
          <Link to="/" className="flex items-center">
            <img src="/logo.png" alt="Pragya Logo" className="h-16 md:h-20 w-auto object-contain" />
          </Link>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          {navItems.map((item, i) => (
            <button
              key={i}
              onClick={() => (item.onClick ? item.onClick() : navigate(item.path))}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl transition-all font-medium text-sm ${
                item.active
                  ? 'bg-emerald-50 text-emerald-900 font-bold border border-emerald-200 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <span className="flex items-center space-x-3">
                <item.icon className={`w-5 h-5 ${item.active ? 'text-emerald-600' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </span>
              {!!item.badge && (
                <span className="bg-amber-100 text-amber-800 text-[11px] font-bold rounded-full px-2 py-0.5 border border-amber-200">
                  {item.badge}
                </span>
              )}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-100 bg-[#FAF9F5]/50">
          <div className="flex items-center space-x-3 mb-3 px-2">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center border border-emerald-200 shrink-0">
              {user?.name?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="overflow-hidden">
              <p className="font-bold text-sm text-slate-900 truncate max-w-[130px]">{user?.name || 'User'}</p>
              <p className="text-xs text-slate-500 truncate max-w-[130px]">{user?.email || ''}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center space-x-3 px-4 py-2.5 text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-2xl transition-colors font-medium text-sm"
          >
            <LogOut className="w-4 h-4" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 p-6 md:p-10 overflow-y-auto">{children}</main>
    </div>
  );
};

export default DashboardShell;

