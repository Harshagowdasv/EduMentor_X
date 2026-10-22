import React from 'react';
import { UserRole } from '../../types';
import { ShieldCheck, UserCheck, GraduationCap, Menu } from 'lucide-react';
import { NotificationDropdown } from './NotificationDropdown';

interface HeaderProps {
  userId: string;
  userName: string;
  role: UserRole;
  department?: string;
  avatarUrl?: string;
  onNavigateSection?: (section: string) => void;
  onToggleMobileMenu?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  userId,
  userName,
  role,
  department,
  avatarUrl,
  onNavigateSection,
  onToggleMobileMenu,
}) => {
  return (
    <header className="h-16 bg-slate-950/80 border-b border-slate-800/80 backdrop-blur-md px-3.5 sm:px-6 flex items-center justify-between sticky top-0 z-20">
      {/* Mobile Drawer Trigger & Role Badge */}
      <div className="flex items-center gap-2.5 sm:gap-3">
        {onToggleMobileMenu && (
          <button
            onClick={onToggleMobileMenu}
            className="lg:hidden p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition-colors focus:outline-none"
            aria-label="Toggle navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        <span className="px-2.5 sm:px-3 py-1 text-[11px] sm:text-xs font-bold uppercase tracking-wider rounded-lg bg-indigo-950 text-indigo-300 border border-indigo-800/60 flex items-center gap-1.5 shrink-0">
          {role === 'admin' && <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />}
          {role === 'mentor' && <UserCheck className="w-3.5 h-3.5 text-purple-400" />}
          {role === 'student' && <GraduationCap className="w-3.5 h-3.5 text-sky-400" />}
          <span>{role} Portal</span>
        </span>
        {department && (
          <span className="text-xs text-slate-400 hidden md:inline truncate max-w-xs">
            • {department}
          </span>
        )}
      </div>

      {/* User Info & Actions */}
      <div className="flex items-center gap-2 sm:gap-4 shrink-0">
        <NotificationDropdown userId={userId} role={role} onNavigateSection={onNavigateSection} />

        <div className="flex items-center gap-2 sm:gap-3 text-right">
          <div className="hidden sm:block">
            <p className="text-xs font-bold text-white leading-tight truncate max-w-[140px]">{userName}</p>
            <p className="text-[10px] text-slate-400 uppercase font-mono">{role}</p>
          </div>
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center font-bold text-white text-xs sm:text-sm shadow-md shrink-0">
            {userName.charAt(0)}
          </div>
        </div>
      </div>
    </header>
  );
};
