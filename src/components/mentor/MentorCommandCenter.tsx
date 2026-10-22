import React, { useState, useEffect } from 'react';
import {
  Student,
  InterventionRecord,
  FollowUpTask,
  Meeting,
  AppNotification
} from '../../types';
import { dbService } from '../../services/serviceFactory';
import { logLoginStage } from '../../utils/loginPerfLogger';
import { calculateExplainableRisk } from '../../utils/riskCalculator';
import { MentorActionCenter } from './MentorActionCenter';
import {
  AlertTriangle,
  ShieldAlert,
  Clock,
  Calendar,
  Users,
  CheckCircle2,
  Bell,
  Search,
  ArrowRight,
  TrendingDown,
  Activity,
  Plus,
  BookOpen,
  CheckSquare,
  Sparkles
} from 'lucide-react';

interface MentorCommandCenterProps {
  mentorId: string;
  mentorName: string;
  onNavigate: (section: string) => void;
  onViewStudent360: (studentId: string) => void;
  actorId: string;
}

export const MentorCommandCenter: React.FC<MentorCommandCenterProps> = ({
  mentorId,
  mentorName,
  onNavigate,
  onViewStudent360,
  actorId,
}) => {
  const [mentees, setMentees] = useState<Student[]>([]);
  const [interventions, setInterventions] = useState<InterventionRecord[]>([]);
  const [tasks, setTasks] = useState<FollowUpTask[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search for directory section
  const [searchTerm, setSearchTerm] = useState('');
  const [riskFilter, setRiskFilter] = useState('');

  useEffect(() => {
    loadCommandCenterData();
  }, [mentorId]);

  const loadCommandCenterData = async () => {
    const tStart = performance.now();
    setLoading(true);
    try {
      // Perform single-pass concurrent fetch across independent mentor-scoped datasets
      const [stList, iList, tList, mList, nList] = await Promise.all([
        dbService.getStudentsByMentorId(mentorId),
        dbService.getInterventions({ mentorId }),
        dbService.getFollowUpTasks({ mentorId }),
        dbService.getMeetings({ mentorId }),
        dbService.getNotifications(mentorId, 'mentor'),
      ]);

      // Calculate explainable risk dynamically in memory
      const evaluatedStudents = stList.map((s) => {
        const risk = calculateExplainableRisk(s);
        return {
          ...s,
          riskLevel: risk.status,
          riskReasons: risk.reasons,
        };
      });

      setMentees(evaluatedStudents);
      setInterventions(iList);
      setTasks(tList);
      setMeetings(mList);
      setNotifications(nList);
      logLoginStage('7_dashboardFirstRenderAndQueries', performance.now() - tStart, 'SUCCESS', 'mentor-command-center');
    } catch (err) {
      logLoginStage('7_dashboardFirstRenderAndQueries', performance.now() - tStart, 'FAILURE', 'mentor-command-center');
      console.error('Failed to load Mentor Command Center data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Date formatting helpers
  const todayStr = new Date().toISOString().substring(0, 10);
  const formattedTodayDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  // Derived in-memory metrics
  const highPriorityMentees = mentees.filter((s) => s.riskLevel === 'HIGH_PRIORITY');
  const needsMonitoringMentees = mentees.filter((s) => s.riskLevel === 'NEEDS_MONITORING');
  const goodStandingMentees = mentees.filter((s) => s.riskLevel === 'GOOD_PERFORMANCE');

  const openInterventions = interventions.filter(
    (i) => i.status !== 'RESOLVED' && i.status !== 'CLOSED'
  );

  const overdueTasks = tasks.filter(
    (t) => t.status !== 'COMPLETED' && t.dueDate && t.dueDate < todayStr
  );

  const todayMeetings = meetings.filter((m) => m.date === todayStr);
  const upcomingMeetings = meetings.filter((m) => m.date > todayStr && m.status !== 'cancelled');

  const unreadNotifications = notifications.filter((n) => !n.read);

  // High-risk & urgent items count
  const totalUrgentAttentionCount =
    highPriorityMentees.length + openInterventions.length + overdueTasks.length + todayMeetings.length;

  // Search & Filtered directory list
  const filteredMentees = mentees.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.usn.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.department.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRisk = !riskFilter || s.riskLevel === riskFilter;
    return matchesSearch && matchesRisk;
  });

  const handleToggleTask = async (taskId: string, currentStatus: FollowUpTask['status']) => {
    const nextStatus = currentStatus === 'COMPLETED' ? 'TODO' : 'COMPLETED';
    await dbService.updateTaskStatus(taskId, nextStatus);
    await loadCommandCenterData();
  };

  return (
    <div className="space-y-6 text-xs">
      {/* COMMAND CENTER HEADER BANNER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-indigo-950 via-slate-900 to-slate-950 border border-indigo-800/60 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-indigo-600 font-extrabold text-white text-2xl flex items-center justify-center shadow-lg shadow-indigo-600/40 shrink-0">
            {mentorName.charAt(0)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-white tracking-tight">Mentor Command Center</h2>
              <span className="px-2.5 py-0.5 text-[10px] font-bold uppercase rounded-full bg-indigo-900/80 text-indigo-300 border border-indigo-700/60 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-indigo-400" /> Active Session
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1">
              Welcome back, <strong>{mentorName}</strong> • {formattedTodayDate}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 text-xs flex items-center gap-2">
            <Users className="w-4 h-4 text-indigo-400" />
            <span>Mentees:</span>
            <strong className="text-white font-mono">{mentees.length}</strong>
          </div>

          <button
            onClick={() => onNavigate('intervention-center')}
            className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-lg shadow-rose-600/30 flex items-center gap-2"
          >
            <ShieldAlert className="w-4 h-4" /> Intervention Center
          </button>
        </div>
      </div>

      {/* QUICK-ACTION WORKSPACE PANEL */}
      <MentorActionCenter onNavigate={onNavigate} />

      {/* PRIORITIZED "NEEDS YOUR ATTENTION TODAY" HERO SECTION */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-rose-950/70 via-slate-900 to-amber-950/70 border border-rose-800/80 space-y-4 shadow-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-rose-600 text-white shadow-md">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                What Needs Your Attention Today?
              </h3>
              <p className="text-xs text-slate-300">Prioritized high-risk mentees, overdue tasks, and open interventions</p>
            </div>
          </div>

          <span
            className={`px-3 py-1 text-xs font-bold uppercase rounded-lg border ${
              totalUrgentAttentionCount > 0
                ? 'bg-rose-950 text-rose-300 border-rose-800 shadow-rose-900/30'
                : 'bg-emerald-950 text-emerald-300 border-emerald-800'
            }`}
          >
            {totalUrgentAttentionCount > 0 ? `${totalUrgentAttentionCount} Urgent Action Items` : 'All Clear / Good Standing'}
          </span>
        </div>

        {/* ATTENTION SUMMARY STAT CARDS */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* High Priority Mentees */}
          <div className="p-3.5 rounded-xl bg-slate-950/90 border border-rose-900/80 space-y-1">
            <span className="text-[10px] uppercase font-bold text-rose-400 block truncate">🔴 High Priority</span>
            <span className="text-xl font-extrabold text-rose-400 font-mono">{highPriorityMentees.length}</span>
            <span className="text-[9px] text-slate-400 block truncate">Mentees requiring focus</span>
          </div>

          {/* Needs Monitoring */}
          <div className="p-3.5 rounded-xl bg-slate-950/90 border border-amber-900/80 space-y-1">
            <span className="text-[10px] uppercase font-bold text-amber-400 block truncate">🟠 Needs Monitoring</span>
            <span className="text-xl font-extrabold text-amber-400 font-mono">{needsMonitoringMentees.length}</span>
            <span className="text-[9px] text-slate-400 block truncate">Moderate risk deficit</span>
          </div>

          {/* Open Interventions */}
          <div className="p-3.5 rounded-xl bg-slate-950/90 border border-rose-900/80 space-y-1">
            <span className="text-[10px] uppercase font-bold text-rose-300 block truncate">📋 Open Interventions</span>
            <span className="text-xl font-extrabold text-rose-300 font-mono">{openInterventions.length}</span>
            <span className="text-[9px] text-slate-400 block truncate">Active lifecycles</span>
          </div>

          {/* Overdue Tasks */}
          <div className="p-3.5 rounded-xl bg-slate-950/90 border border-rose-900/80 space-y-1">
            <span className="text-[10px] uppercase font-bold text-rose-400 block truncate">⏰ Overdue Tasks</span>
            <span className="text-xl font-extrabold text-rose-400 font-mono">{overdueTasks.length}</span>
            <span className="text-[9px] text-slate-400 block truncate">Passed target date</span>
          </div>

          {/* Today's Meetings */}
          <div className="p-3.5 rounded-xl bg-slate-950/90 border border-indigo-900/80 space-y-1">
            <span className="text-[10px] uppercase font-bold text-indigo-300 block truncate">📅 Today's Meetings</span>
            <span className="text-xl font-extrabold text-indigo-300 font-mono">{todayMeetings.length}</span>
            <span className="text-[9px] text-slate-400 block truncate">Scheduled for today</span>
          </div>

          {/* Unread Notifications */}
          <div className="p-3.5 rounded-xl bg-slate-950/90 border border-purple-900/80 space-y-1">
            <span className="text-[10px] uppercase font-bold text-purple-300 block truncate">🔔 Notifications</span>
            <span className="text-xl font-extrabold text-purple-300 font-mono">{unreadNotifications.length}</span>
            <span className="text-[9px] text-slate-400 block truncate">Unread mentor alerts</span>
          </div>
        </div>
      </div>

      {/* TWO-COLUMN COMMAND PANELS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* PANEL A: HIGH-PRIORITY MENTEES & OPEN INTERVENTIONS */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-400" /> High-Risk Mentees & Active Interventions
            </h3>
            <button
              onClick={() => onNavigate('intervention-center')}
              className="text-[11px] font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
            >
              Intervention Center <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {loading ? (
            <div className="p-6 text-center text-xs text-slate-400">Loading high-risk mentee data...</div>
          ) : highPriorityMentees.length === 0 && openInterventions.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400 bg-slate-950 border border-slate-800 rounded-xl">
              No high-priority mentees or active open interventions. All mentees are performing in Good Standing.
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
              {highPriorityMentees.map((st) => (
                <div
                  key={st.id}
                  className="p-3.5 rounded-xl bg-slate-950 border border-rose-800/80 space-y-2 hover:border-rose-700 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-bold text-white text-xs flex items-center gap-2">
                        {st.name} <span className="text-slate-400 text-[10px] font-mono">({st.usn})</span>
                      </h4>
                      <p className="text-[10px] text-slate-400">
                        {st.department} • CGPA {st.cgpa.toFixed(2)} • Attendance {st.attendance}%
                      </p>
                    </div>

                    <span className="px-2 py-0.5 text-[9px] font-extrabold uppercase rounded bg-rose-950 text-rose-300 border border-rose-800">
                      HIGH PRIORITY
                    </span>
                  </div>

                  {st.riskReasons && st.riskReasons.length > 0 && (
                    <p className="text-[11px] text-slate-300 bg-slate-900 p-2 rounded-lg border border-slate-800/60 truncate">
                      • {st.riskReasons[0]}
                    </p>
                  )}

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      onClick={() => onViewStudent360(st.id)}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold text-[10px]"
                    >
                      Inspect 360° Profile
                    </button>
                    <button
                      onClick={() => onNavigate('intervention-center')}
                      className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-[10px] flex items-center gap-1 shadow-sm"
                    >
                      Intervention <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* PANEL B: TODAY'S SCHEDULE & OVERDUE FOLLOW-UP TASKS */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Calendar className="w-4 h-4 text-indigo-400" /> Today's Meetings & Overdue Follow-ups
            </h3>
            <button
              onClick={() => onNavigate('tasks')}
              className="text-[11px] font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
            >
              All Tasks & Meetings <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {loading ? (
            <div className="p-6 text-center text-xs text-slate-400">Loading schedules and tasks...</div>
          ) : todayMeetings.length === 0 && overdueTasks.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400 bg-slate-950 border border-slate-800 rounded-xl">
              No meetings scheduled for today and zero overdue follow-up tasks.
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
              {/* Today's Meetings */}
              {todayMeetings.map((m) => (
                <div key={m.id} className="p-3.5 rounded-xl bg-slate-950 border border-indigo-800/80 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-xs flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-indigo-400" /> Meeting with {m.studentName}
                    </span>
                    <span className="px-2 py-0.5 text-[9px] font-bold uppercase rounded bg-indigo-950 text-indigo-300 border border-indigo-800">
                      TODAY @ {m.time}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300">{m.agenda || 'Mentorship Discussion'}</p>
                </div>
              ))}

              {/* Overdue Tasks */}
              {overdueTasks.map((t) => (
                <div key={t.id} className="p-3.5 rounded-xl bg-slate-950 border border-rose-800/80 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={t.status === 'COMPLETED'}
                        onChange={() => handleToggleTask(t.id, t.status)}
                        className="rounded text-rose-600 focus:ring-0"
                      />
                      <span className="font-bold text-white text-xs">{t.title}</span>
                    </div>
                    <span className="px-2 py-0.5 text-[9px] font-bold uppercase rounded bg-rose-950 text-rose-300 border border-rose-800">
                      OVERDUE ({t.dueDate})
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400">Mentee: {t.studentName}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* MENTEE PORTFOLIO DIRECTORY TABLE */}
      <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-400" /> Assigned Mentee Directory
            </h3>
            <p className="text-[10px] text-slate-400">Real-time performance tracking for all assigned mentees</p>
          </div>

          {/* Search & Filter Bar */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Search mentee..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:outline-none focus:border-indigo-500"
              />
            </div>

            <select
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl py-1.5 px-3 text-xs text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="">All Statuses</option>
              <option value="HIGH_PRIORITY">High Priority</option>
              <option value="NEEDS_MONITORING">Needs Monitoring</option>
              <option value="GOOD_PERFORMANCE">Good Standing</option>
            </select>
          </div>
        </div>

        {/* Directory Cards / Grid */}
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400">Loading mentee directory...</div>
        ) : filteredMentees.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400 bg-slate-950 border border-slate-800 rounded-xl">
            No assigned mentees match the selected filter.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredMentees.map((st) => (
              <div
                key={st.id}
                className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3 hover:border-indigo-800/80 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-600 font-bold text-white text-sm flex items-center justify-center shadow-md">
                      {st.name.charAt(0)}
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-xs">{st.name}</h4>
                      <p className="text-[10px] text-slate-400 font-mono">{st.usn}</p>
                    </div>
                  </div>

                  <span
                    className={`px-2 py-0.5 text-[9px] font-extrabold uppercase rounded border ${
                      st.riskLevel === 'GOOD_PERFORMANCE'
                        ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                        : st.riskLevel === 'HIGH_PRIORITY'
                        ? 'bg-rose-950 text-rose-300 border-rose-800'
                        : 'bg-amber-950 text-amber-300 border-amber-800'
                    }`}
                  >
                    {st.riskLevel.replace('_', ' ')}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="p-1.5 rounded-lg bg-slate-900 border border-slate-800">
                    <span className="text-[9px] text-slate-400 block">CGPA</span>
                    <span className="font-bold text-indigo-300">{st.cgpa.toFixed(2)}</span>
                  </div>
                  <div className="p-1.5 rounded-lg bg-slate-900 border border-slate-800">
                    <span className="text-[9px] text-slate-400 block">Attendance</span>
                    <span className="font-bold text-emerald-400">{st.attendance}%</span>
                  </div>
                  <div className="p-1.5 rounded-lg bg-slate-900 border border-slate-800">
                    <span className="text-[9px] text-slate-400 block">Backlogs</span>
                    <span className="font-bold text-rose-400">{st.previousYearBacklogs || st.currentBacklogs || 0}</span>
                  </div>
                </div>

                <div className="flex items-center justify-end pt-1">
                  <button
                    onClick={() => onViewStudent360(st.id)}
                    className="w-full py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-colors text-center"
                  >
                    Inspect Student 360° Profile
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
