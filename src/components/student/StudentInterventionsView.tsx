import React, { useState, useEffect } from 'react';
import { Student, InterventionRecord } from '../../types';
import { dbService } from '../../services/serviceFactory';
import {
  ShieldAlert,
  CheckCircle2,
  Clock,
  TrendingUp,
  UserCheck,
  AlertCircle,
  FileText,
  Target,
  Sparkles,
  RefreshCw,
  Award
} from 'lucide-react';

interface StudentInterventionsViewProps {
  student: Student;
  onOpenMeetings?: () => void;
}

export const StudentInterventionsView: React.FC<StudentInterventionsViewProps> = ({
  student,
  onOpenMeetings,
}) => {
  const [interventions, setInterventions] = useState<InterventionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadInterventions();
  }, [student?.id, student?.usn, student?.userId]);

  const loadInterventions = async () => {
    setLoading(true);
    try {
      const candidateKey = student.id || student.usn || student.userId;
      const list = await dbService.getInterventions({ studentId: candidateKey });
      setInterventions(list);
    } catch (err) {
      console.error('Failed to load student interventions:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const candidateKey = student.id || student.usn || student.userId;
      const list = await dbService.getInterventions({ studentId: candidateKey });
      setInterventions(list);
    } finally {
      setRefreshing(false);
    }
  };

  const activeInterventions = interventions.filter((i) => i.status !== 'RESOLVED' && i.status !== 'CLOSED');
  const resolvedInterventions = interventions.filter((i) => i.status === 'RESOLVED' || i.status === 'CLOSED');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-rose-400" />
            Mentorship Support & Interventions
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Personalized academic guidance, action plans, and progress milestones set by your faculty mentor
          </p>
        </div>

        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-2 transition-all w-fit shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-indigo-400' : ''}`} />
          Refresh Status
        </button>
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center gap-3.5">
          <div className="p-3 rounded-xl bg-rose-950 text-rose-400 border border-rose-800/60 shrink-0">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-400">Active Action Plans</p>
            <p className="text-2xl font-bold text-white mt-0.5">{activeInterventions.length}</p>
            <span className="text-[11px] text-rose-400 font-semibold">Requires attention</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center gap-3.5">
          <div className="p-3 rounded-xl bg-emerald-950 text-emerald-400 border border-emerald-800/60 shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-400">Resolved Milestones</p>
            <p className="text-2xl font-bold text-white mt-0.5">{resolvedInterventions.length}</p>
            <span className="text-[11px] text-emerald-400 font-semibold">Goals achieved</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center gap-3.5">
          <div className="p-3 rounded-xl bg-indigo-950 text-indigo-400 border border-indigo-800/60 shrink-0">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-400">Assigned Mentor</p>
            <p className="text-sm font-bold text-white mt-0.5 truncate">{student.mentorName || 'Unallocated'}</p>
            <span className="text-[11px] text-indigo-400 font-semibold">{student.mentorEmail || 'Institutional Faculty'}</span>
          </div>
        </div>
      </div>

      {/* Main List */}
      <div className="space-y-4">
        {loading ? (
          <div className="p-12 text-center bg-slate-900/60 border border-slate-800 rounded-2xl space-y-2">
            <RefreshCw className="w-6 h-6 text-indigo-400 animate-spin mx-auto mb-2" />
            <p className="text-xs text-slate-400">Loading your mentorship guidance records...</p>
          </div>
        ) : interventions.length === 0 ? (
          <div className="p-12 text-center bg-slate-900/60 border border-slate-800 rounded-2xl space-y-3">
            <Award className="w-10 h-10 text-emerald-400 mx-auto" />
            <h3 className="text-sm font-bold text-white">No Active Interventions</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Your academic standing and attendance are currently in good order. When your faculty mentor initiates a tailored study plan, guidance milestone, or target recommendation, it will appear here.
            </p>
            {onOpenMeetings && (
              <button
                onClick={onOpenMeetings}
                className="mt-3 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md transition-all inline-flex items-center gap-1.5"
              >
                Schedule Meeting with Mentor
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {interventions.map((item) => {
              const isResolved = item.status === 'RESOLVED' || item.status === 'CLOSED';
              return (
                <div
                  key={item.id}
                  className={`p-5 rounded-2xl border transition-all ${
                    isResolved
                      ? 'bg-slate-900/40 border-slate-800'
                      : 'bg-slate-900 border-indigo-900/50 shadow-lg shadow-indigo-950/20'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-3 border-b border-slate-800/80">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-indigo-950 text-indigo-300 border border-indigo-800">
                          {item.category || 'Academic Support'}
                        </span>
                        <span className="text-xs font-mono text-slate-400">
                          Initiated on {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'Recent'}
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-white mt-1">
                        Mentorship Action Plan: {item.category}
                      </h3>
                      <p className="text-xs text-slate-400 flex items-center gap-1">
                        <UserCheck className="w-3.5 h-3.5 text-indigo-400" /> Supervised by{' '}
                        <strong className="text-white">{item.mentorName || 'Faculty Mentor'}</strong>
                      </p>
                    </div>

                    <span
                      className={`px-3 py-1 text-xs font-extrabold uppercase rounded-xl border shrink-0 ${
                        item.status === 'RESOLVED'
                          ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                          : item.status === 'IN_PROGRESS'
                          ? 'bg-indigo-950 text-indigo-300 border-indigo-800'
                          : 'bg-rose-950 text-rose-300 border-rose-800'
                      }`}
                    >
                      {item.status.replace('_', ' ')}
                    </span>
                  </div>

                  {/* Target Benchmarks */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 my-4">
                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80">
                      <span className="text-[10px] font-semibold text-slate-400 uppercase block">Baseline CGPA</span>
                      <span className="text-base font-bold text-white font-mono">{item.baselineCgpa ?? student.cgpa.toFixed(2)}</span>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80">
                      <span className="text-[10px] font-semibold text-indigo-300 uppercase block">Target CGPA</span>
                      <span className="text-base font-bold text-indigo-300 font-mono flex items-center gap-1">
                        <Target className="w-3.5 h-3.5" />
                        {item.targetCgpa ?? 8.5}
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80">
                      <span className="text-[10px] font-semibold text-slate-400 uppercase block">Baseline Attendance</span>
                      <span className="text-base font-bold text-white font-mono">{item.baselineAttendance ?? student.attendance}%</span>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80">
                      <span className="text-[10px] font-semibold text-emerald-300 uppercase block">Target Attendance</span>
                      <span className="text-base font-bold text-emerald-300 font-mono flex items-center gap-1">
                        <TrendingUp className="w-3.5 h-3.5" />
                        {item.targetAttendance ?? 85}%
                      </span>
                    </div>
                  </div>

                  {/* Mentor Description / Context */}
                  {item.description && (
                    <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 text-xs text-slate-300 space-y-1">
                      <span className="font-semibold text-slate-400 block text-[11px] uppercase tracking-wider">
                        Mentor's Assessment & Recommendations:
                      </span>
                      <p className="leading-relaxed">{item.description}</p>
                    </div>
                  )}

                  {/* Action Steps Taken */}
                  {item.actionsTaken && item.actionsTaken.length > 0 && (
                    <div className="mt-3.5 space-y-2">
                      <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                        Milestones & Action Steps:
                      </span>
                      <div className="space-y-1.5">
                        {item.actionsTaken.map((act, idx) => (
                          <div
                            key={idx}
                            className="flex items-center gap-2 text-xs text-slate-300 bg-slate-950/60 px-3 py-2 rounded-lg border border-slate-800/60"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            <span>{act}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
