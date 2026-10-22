import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { dbService } from '../../services/serviceFactory';
import { AllocationHistory, AppNotification } from '../../types';
import { Bug, ChevronDown, ChevronUp, Database, UserCheck, Key, Bell } from 'lucide-react';

export const DemoDiagnosticPanel: React.FC = () => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [allocations, setAllocations] = useState<AllocationHistory[]>([]);
  const [userNotifs, setUserNotifs] = useState<AppNotification[]>([]);
  const [allocatedStudentsCount, setAllocatedStudentsCount] = useState(0);
  const [mentorMenteesCount, setMentorMenteesCount] = useState(0);

  useEffect(() => {
    if (user && isOpen) {
      loadDiagnostics();
    }
  }, [user, isOpen]);

  const loadDiagnostics = async () => {
    try {
      const [hList, stRes, nList] = await Promise.all([
        dbService.getAllocationHistory(),
        dbService.getStudents(1, 1000),
        dbService.getNotifications(user!.id, user!.role),
      ]);
      setAllocations(hList.slice(0, 10));
      setAllocatedStudentsCount(stRes.students.filter((s) => s.mentorId).length);
      setUserNotifs(nList);

      if (user && user.role === 'mentor') {
        const mentees = await dbService.getStudentsByMentorId(user.id);
        setMentorMenteesCount(mentees.length);
      }
    } catch (err) {
      console.error('Failed to load diagnostics:', err);
    }
  };

  if (!user) return null;

  return (
    <div className="bg-slate-950 border-b border-amber-900/60 text-xs text-slate-300">
      <div className="max-w-7xl mx-auto px-3.5 sm:px-6 py-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <span className="px-2 py-0.5 rounded bg-amber-950 text-amber-400 font-bold font-mono border border-amber-800 flex items-center gap-1 text-[11px]">
            <Bug className="w-3 h-3" /> DEMO DIAGNOSTICS
          </span>
          <span className="text-slate-300 font-medium text-[11px] sm:text-xs">
            User: <strong className="text-white">{user.name}</strong> (<code className="text-indigo-300 text-[10px]">ID: {user.id}</code> | Role: {user.role})
          </span>
          {user.role === 'mentor' && (
            <span className="text-emerald-400 font-bold text-[11px] sm:text-xs">
              • Mentees: {mentorMenteesCount} | Notifs: {userNotifs.length}
            </span>
          )}
        </div>

        <button
          onClick={() => setIsOpen(!isOpen)}
          className="text-slate-400 hover:text-white flex items-center gap-1 font-bold font-mono text-[11px]"
        >
          {isOpen ? 'Hide Panel' : 'Inspect Isolation'}
          {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {isOpen && (
        <div className="p-4 bg-slate-900 border-t border-slate-800 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* User Session Inspect */}
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
              <h5 className="font-bold text-indigo-300 flex items-center gap-1">
                <Key className="w-3.5 h-3.5" /> Authenticated Session
              </h5>
              <p><span className="text-slate-400">user.id:</span> <code className="text-emerald-400">{user.id}</code></p>
              <p><span className="text-slate-400">user.email:</span> <code className="text-slate-200">{user.email}</code></p>
              <p><span className="text-slate-400">user.role:</span> <code className="text-purple-300">{user.role}</code></p>
            </div>

            {/* Allocation Metrics */}
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
              <h5 className="font-bold text-indigo-300 flex items-center gap-1">
                <Database className="w-3.5 h-3.5" /> Database Allocations
              </h5>
              <p><span className="text-slate-400">Total Allocated:</span> <strong className="text-emerald-400">{allocatedStudentsCount}</strong></p>
              <p><span className="text-slate-400">History Records:</span> <strong className="text-white">{allocations.length}</strong></p>
            </div>

            {/* Notification Isolation */}
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
              <h5 className="font-bold text-indigo-300 flex items-center gap-1">
                <Bell className="w-3.5 h-3.5" /> Notification Isolation
              </h5>
              <p><span className="text-slate-400">Recipient Target:</span> <code className="text-indigo-300">recipientUserId === {user.id}</code></p>
              <p><span className="text-slate-400">Isolated Count:</span> <strong className="text-emerald-400">{userNotifs.length} notifications</strong></p>
            </div>

            {/* Authoritative Relationship Status */}
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
              <h5 className="font-bold text-indigo-300 flex items-center gap-1">
                <UserCheck className="w-3.5 h-3.5" /> Authoritative Relationship
              </h5>
              <p className="text-[11px] text-slate-300">
                Mentee resolution & notifications strictly enforce <code className="text-indigo-300">mentorId === recipientUserId === authenticatedUser.id</code>.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
