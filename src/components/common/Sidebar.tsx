import React from 'react';
import { UserRole } from '../../types';
import {
  LayoutDashboard,
  Users,
  UserCheck,
  Building2,
  FileCheck,
  ShieldAlert,
  History,
  BookOpen,
  Calendar,
  CheckSquare,
  Sparkles,
  Compass,
  Award,
  Target,
  Search,
  Activity,
  LogOut,
  Flame,
  FileDown,
  Database,
  Brain,
  Star,
  AlertTriangle,
  X
} from 'lucide-react';

interface SidebarProps {
  role: UserRole;
  activeSection: string;
  onSelectSection: (section: string) => void;
  onOpenGlobalSearch?: () => void;
  onLogout: () => void;
  userName: string;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  role,
  activeSection,
  onSelectSection,
  onOpenGlobalSearch,
  onLogout,
  userName,
  isOpenMobile = false,
  onCloseMobile,
}) => {
  const getNavItems = () => {
    if (role === 'admin') {
      return [
        { id: 'executive', label: 'Executive Overview', icon: Building2 },
        { id: 'overview', label: 'Dashboard Overview', icon: LayoutDashboard },
        { id: 'academic-risk', label: 'Early Warning System', icon: AlertTriangle },
        { id: 'academic-calendar', label: 'Academic Calendar', icon: Calendar },
        { id: 'semester-manager', label: 'Semesters & Terms', icon: Building2 },
        { id: 'mentors', label: 'Faculty Mentors', icon: UserCheck },
        { id: 'allocation', label: 'All Students & Allocations', icon: Users },
        { id: 'mentor-effectiveness', label: 'Mentor Effectiveness', icon: Star },
        { id: 'analytics', label: 'Institutional Analytics', icon: Building2 },
        { id: 'workload', label: 'Mentor Workload', icon: UserCheck },
        { id: 'csv-import', label: 'CSV Import & History', icon: FileCheck },
        { id: 'resources', label: 'Resource Library', icon: BookOpen },
        { id: 'meetings', label: 'Meeting Scheduler', icon: Calendar },
        { id: 'tasks', label: 'Follow-Up Tasks', icon: CheckSquare },
        { id: 'backup-export', label: 'Data Backup & Export', icon: Database },
        { id: 'audit-logs', label: 'Governance Audit Logs', icon: History },
        { id: 'system-health', label: 'System Health', icon: Activity },
      ];
    }

    if (role === 'mentor') {
      return [
        { id: 'overview', label: 'My Mentees Portfolio', icon: Users },
        { id: 'academic-risk', label: 'Early Warning System', icon: AlertTriangle },
        { id: 'intervention-center', label: 'Intervention Center', icon: ShieldAlert },
        { id: 'recommendations', label: 'Students Needing Attention', icon: Flame },
        { id: 'meetings', label: 'Meeting Scheduler', icon: Calendar },
        { id: 'tasks', label: 'Follow-Up Tasks', icon: CheckSquare },
        { id: 'resources', label: 'Resource Library', icon: BookOpen },
        { id: 'safety-alerts', label: 'AI Safety Risk Alerts', icon: ShieldAlert },
      ];
    }

    // Student Role
    return [
      { id: 'overview', label: 'Academic Overview', icon: LayoutDashboard },
      { id: 'ai-mentor', label: 'AI Voice Avatar Mentor', icon: Sparkles },
      { id: 'career-roadmap', label: 'Career Roadmap', icon: Compass },
      { id: 'ai-memory', label: 'Controlled AI Memory', icon: Brain },
      { id: 'study-planner', label: 'AI Daily Study Planner', icon: Calendar },
      { id: 'resume-assistant', label: 'AI Resume Assistant', icon: FileCheck },
      { id: 'career-guidance', label: 'Career & Placement Intelligence', icon: Compass },
      { id: 'goals', label: 'Goals & Achievements', icon: Target },
      { id: 'academic-calendar', label: 'Academic Calendar', icon: Calendar },
      { id: 'meetings', label: 'Scheduled Meetings', icon: Calendar },
      { id: 'tasks', label: 'Assigned Tasks', icon: CheckSquare },
      { id: 'resources', label: 'Study Resources', icon: FileDown },
      { id: 'portfolio', label: 'Career Portfolio', icon: Award },
      { id: 'timeline', label: 'Progress Timeline', icon: History },
    ];
  };

  const navItems = getNavItems();

  const handleItemClick = (id: string) => {
    onSelectSection(id);
    if (onCloseMobile) onCloseMobile();
  };

  return (
    <>
      {/* Mobile Drawer Backdrop */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      {/* Main Sidebar Aside */}
      <aside
        className={`fixed lg:sticky top-0 left-0 z-50 lg:z-30 h-screen w-64 max-w-[80vw] bg-slate-950 border-r border-slate-800/80 flex flex-col shrink-0 transition-transform duration-300 ease-in-out ${
          isOpenMobile ? 'translate-x-0 shadow-2xl shadow-indigo-950/50' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand Logo & Mobile Close Button */}
        <div className="p-4 sm:p-5 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center text-white font-black text-lg shadow-lg shadow-indigo-600/30">
              X
            </div>
            <div>
              <h1 className="font-extrabold text-white text-base tracking-tight leading-none">
                EduMentor<span className="text-indigo-400">X</span>
              </h1>
              <span className="text-[10px] text-indigo-400 font-mono tracking-wider font-bold">PHASE 3 INTELLIGENCE</span>
            </div>
          </div>

          {/* Close button for mobile drawer */}
          <button
            onClick={onCloseMobile}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white bg-slate-900 border border-slate-800 focus:outline-none"
            aria-label="Close menu"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Global Search Button Trigger */}
        {role !== 'student' && onOpenGlobalSearch && (
          <div className="px-3 pt-3">
            <button
              onClick={() => {
                onOpenGlobalSearch();
                if (onCloseMobile) onCloseMobile();
              }}
              className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white text-xs font-semibold flex items-center gap-2 transition-colors active:scale-95"
            >
              <Search className="w-4 h-4 text-indigo-400 shrink-0" />
              <span className="truncate">Search USN, Mentors, Files...</span>
            </button>
          </div>
        )}

        {/* Navigation List */}
        <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto no-scrollbar">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleItemClick(item.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all text-left ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                    : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Logout Footer */}
        <div className="p-3.5 border-t border-slate-800/80 bg-slate-950">
          <button
            onClick={() => {
              onLogout();
              if (onCloseMobile) onCloseMobile();
            }}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 border border-slate-800 hover:border-rose-900/60 font-bold text-xs transition-all active:scale-95"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
};
