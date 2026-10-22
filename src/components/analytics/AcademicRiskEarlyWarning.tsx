import React, { useState, useEffect } from 'react';
import { Student, UserRole, RiskLevel, ExplainableRisk } from '../../types';
import { dbService } from '../../services/serviceFactory';
import { calculateExplainableRisk } from '../../utils/riskCalculator';
import {
  AlertTriangle,
  ShieldAlert,
  Search,
  Users,
  CheckCircle2,
  TrendingDown,
  Filter,
  GraduationCap,
  Plus,
  BookOpen,
  DollarSign,
  Clock,
  ArrowRight
} from 'lucide-react';

interface AcademicRiskEarlyWarningProps {
  userRole: UserRole;
  userId: string;
  onViewStudent360: (studentId: string) => void;
  onInitiateIntervention?: (studentId: string) => void;
}

export const AcademicRiskEarlyWarning: React.FC<AcademicRiskEarlyWarningProps> = ({
  userRole,
  userId,
  onViewStudent360,
  onInitiateIntervention,
}) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [riskFilter, setRiskFilter] = useState<'ALL' | 'HIGH_PRIORITY' | 'NEEDS_MONITORING' | 'GOOD_PERFORMANCE'>('ALL');
  const [factorFilter, setFactorFilter] = useState<'ALL' | 'CGPA_DEFICIT' | 'ATTENDANCE_DEFICIT' | 'BACKLOGS' | 'LOW_STUDY' | 'FINANCIAL_NEED'>('ALL');

  useEffect(() => {
    loadData();
  }, [userRole, userId]);

  const loadData = async () => {
    setLoading(true);
    try {
      let rawStudents: Student[] = [];
      if (userRole === 'mentor') {
        rawStudents = await dbService.getStudentsByMentorId(userId);
      } else {
        const res = await dbService.getStudents();
        rawStudents = res.students;
      }

      // Re-evaluate risk dynamically using the standard riskCalculator logic
      const evaluated = rawStudents.map((st) => {
        const riskEval: ExplainableRisk = calculateExplainableRisk(st);
        return {
          ...st,
          riskLevel: riskEval.status,
          riskReasons: riskEval.reasons,
        };
      });

      setStudents(evaluated);
    } catch (err) {
      console.error('Failed to load Early Warning data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Metrics summary calculation
  const totalCount = students.length;
  const highPriorityStudents = students.filter((s) => s.riskLevel === 'HIGH_PRIORITY');
  const needsMonitoringStudents = students.filter((s) => s.riskLevel === 'NEEDS_MONITORING');
  const goodStandingStudents = students.filter((s) => s.riskLevel === 'GOOD_PERFORMANCE');

  const highPriorityCount = highPriorityStudents.length;
  const needsMonitoringCount = needsMonitoringStudents.length;
  const goodStandingCount = goodStandingStudents.length;

  const highPriorityPct = totalCount > 0 ? ((highPriorityCount / totalCount) * 100).toFixed(1) : '0.0';
  const needsMonitoringPct = totalCount > 0 ? ((needsMonitoringCount / totalCount) * 100).toFixed(1) : '0.0';
  const goodStandingPct = totalCount > 0 ? ((goodStandingCount / totalCount) * 100).toFixed(1) : '0.0';

  // Filter logic
  const filteredStudents = students.filter((st) => {
    // 1. Search filter
    const matchesSearch =
      st.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      st.usn.toLowerCase().includes(searchTerm.toLowerCase()) ||
      st.department.toLowerCase().includes(searchTerm.toLowerCase());

    // 2. Risk level filter
    const matchesRisk = riskFilter === 'ALL' || st.riskLevel === riskFilter;

    // 3. Risk factor filter
    let matchesFactor = true;
    if (factorFilter === 'CGPA_DEFICIT') {
      matchesFactor = (st.cgpa || 0) < 6.5;
    } else if (factorFilter === 'ATTENDANCE_DEFICIT') {
      matchesFactor = (st.attendance || 0) < 75;
    } else if (factorFilter === 'BACKLOGS') {
      matchesFactor = (st.previousYearBacklogs || st.currentBacklogs || 0) > 0;
    } else if (factorFilter === 'LOW_STUDY') {
      matchesFactor = (st.studyHours || 0) < 8;
    } else if (factorFilter === 'FINANCIAL_NEED') {
      matchesFactor = (st.financialScore || 5) <= 3;
    }

    return matchesSearch && matchesRisk && matchesFactor;
  });

  return (
    <div className="space-y-6 text-xs">
      {/* Module Title Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-amber-950 via-slate-900 to-indigo-950 border border-amber-800/60 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-amber-600 text-white shadow-lg shadow-amber-600/30">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">Academic Risk & Early Warning System</h2>
            <p className="text-xs text-slate-300">
              {userRole === 'mentor'
                ? 'Real-time explainable risk tracking for your assigned mentees'
                : 'Institutional risk analytics across all academic departments'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono bg-slate-900/80 px-3.5 py-2 rounded-xl border border-amber-800/40 text-amber-300">
          <span>Scope:</span>
          <strong className="text-white uppercase">{userRole === 'mentor' ? 'My Mentees' : 'All Institutional Students'}</strong>
        </div>
      </div>

      {/* Institutional / Mentor Risk Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Mentees / Students</span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-white">{totalCount}</span>
            <Users className="w-5 h-5 text-indigo-400" />
          </div>
          <span className="text-[10px] text-slate-500">Evaluated against academic risk model</span>
        </div>

        <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-900/60 space-y-1">
          <span className="text-[10px] uppercase font-bold text-rose-300 block">High Priority Risk</span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-rose-400">{highPriorityCount}</span>
            <span className="text-xs font-bold text-rose-400 font-mono">{highPriorityPct}%</span>
          </div>
          <span className="text-[10px] text-rose-300/70">Requires prompt mentorship intervention</span>
        </div>

        <div className="p-4 rounded-2xl bg-amber-950/40 border border-amber-900/60 space-y-1">
          <span className="text-[10px] uppercase font-bold text-amber-300 block">Needs Monitoring</span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-amber-400">{needsMonitoringCount}</span>
            <span className="text-xs font-bold text-amber-400 font-mono">{needsMonitoringPct}%</span>
          </div>
          <span className="text-[10px] text-amber-300/70">Moderate deficit or early decline signs</span>
        </div>

        <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-900/60 space-y-1">
          <span className="text-[10px] uppercase font-bold text-emerald-300 block">Good Standing</span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-emerald-400">{goodStandingCount}</span>
            <span className="text-xs font-bold text-emerald-400 font-mono">{goodStandingPct}%</span>
          </div>
          <span className="text-[10px] text-emerald-300/70">Meeting academic targets</span>
        </div>
      </div>

      {/* Filter and Search Controls */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by student name, USN, or department..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Risk Level Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 md:pb-0">
            <button
              onClick={() => setRiskFilter('ALL')}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs shrink-0 whitespace-nowrap transition-colors ${
                riskFilter === 'ALL' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              All ({totalCount})
            </button>
            <button
              onClick={() => setRiskFilter('HIGH_PRIORITY')}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs shrink-0 whitespace-nowrap transition-colors ${
                riskFilter === 'HIGH_PRIORITY' ? 'bg-rose-600 text-white shadow-sm' : 'bg-slate-950 text-rose-400 hover:text-white border border-slate-800'
              }`}
            >
              High Priority ({highPriorityCount})
            </button>
            <button
              onClick={() => setRiskFilter('NEEDS_MONITORING')}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs shrink-0 whitespace-nowrap transition-colors ${
                riskFilter === 'NEEDS_MONITORING' ? 'bg-amber-600 text-white shadow-sm' : 'bg-slate-950 text-amber-400 hover:text-white border border-slate-800'
              }`}
            >
              Needs Monitoring ({needsMonitoringCount})
            </button>
            <button
              onClick={() => setRiskFilter('GOOD_PERFORMANCE')}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs shrink-0 whitespace-nowrap transition-colors ${
                riskFilter === 'GOOD_PERFORMANCE' ? 'bg-emerald-600 text-white shadow-sm' : 'bg-slate-950 text-emerald-400 hover:text-white border border-slate-800'
              }`}
            >
              Good Standing ({goodStandingCount})
            </button>
          </div>
        </div>

        {/* Specific Risk Factor Filter Buttons */}
        <div className="flex items-center gap-2 pt-2 border-t border-slate-800/80 flex-wrap">
          <span className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1">
            <Filter className="w-3 h-3" /> Risk Factor Filter:
          </span>

          <button
            onClick={() => setFactorFilter('ALL')}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold ${
              factorFilter === 'ALL' ? 'bg-slate-700 text-white' : 'bg-slate-950 text-slate-400 border border-slate-800'
            }`}
          >
            Any Risk Factor
          </button>
          <button
            onClick={() => setFactorFilter('CGPA_DEFICIT')}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold ${
              factorFilter === 'CGPA_DEFICIT' ? 'bg-indigo-600 text-white' : 'bg-slate-950 text-indigo-300 border border-slate-800'
            }`}
          >
            CGPA Deficit (&lt; 6.5)
          </button>
          <button
            onClick={() => setFactorFilter('ATTENDANCE_DEFICIT')}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold ${
              factorFilter === 'ATTENDANCE_DEFICIT' ? 'bg-rose-600 text-white' : 'bg-slate-950 text-rose-300 border border-slate-800'
            }`}
          >
            Attendance Deficit (&lt; 75%)
          </button>
          <button
            onClick={() => setFactorFilter('BACKLOGS')}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold ${
              factorFilter === 'BACKLOGS' ? 'bg-amber-600 text-white' : 'bg-slate-950 text-amber-300 border border-slate-800'
            }`}
          >
            Active Backlogs (&gt; 0)
          </button>
          <button
            onClick={() => setFactorFilter('LOW_STUDY')}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold ${
              factorFilter === 'LOW_STUDY' ? 'bg-purple-600 text-white' : 'bg-slate-950 text-purple-300 border border-slate-800'
            }`}
          >
            Low Study Discipline (&lt; 8h)
          </button>
          <button
            onClick={() => setFactorFilter('FINANCIAL_NEED')}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold ${
              factorFilter === 'FINANCIAL_NEED' ? 'bg-emerald-600 text-white' : 'bg-slate-950 text-emerald-300 border border-slate-800'
            }`}
          >
            Financial Need Indicator (&le; 3)
          </button>
        </div>
      </div>

      {/* At-Risk Students Grid */}
      {loading ? (
        <div className="p-8 text-center text-xs text-slate-400">Evaluating student risk levels...</div>
      ) : filteredStudents.length === 0 ? (
        <div className="p-8 text-center text-xs text-slate-400 bg-slate-900 border border-slate-800 rounded-2xl">
          No students match the selected risk filters.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredStudents.map((st) => (
            <div
              key={st.id}
              className={`p-5 rounded-2xl bg-slate-900 border transition-colors space-y-4 ${
                st.riskLevel === 'HIGH_PRIORITY'
                  ? 'border-rose-800/80 shadow-rose-950/20'
                  : st.riskLevel === 'NEEDS_MONITORING'
                  ? 'border-amber-800/80 shadow-amber-950/20'
                  : 'border-slate-800 hover:border-slate-700'
              }`}
            >
              {/* Header info */}
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-bold text-white text-sm flex items-center gap-2">
                    {st.name} <span className="text-slate-400 text-xs font-mono">({st.usn})</span>
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {st.department} • {st.program || 'B.Tech'} {st.year || '3rd Year'} ({st.semester || 'Semester 6'})
                  </p>
                  {userRole === 'admin' && (
                    <p className="text-[10px] text-indigo-300 mt-0.5">
                      Assigned Mentor: <strong>{st.mentorName || 'Unallocated'}</strong>
                    </p>
                  )}
                </div>

                <span
                  className={`px-2.5 py-1 text-[10px] font-extrabold uppercase rounded-lg border ${
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

              {/* Metrics Grid */}
              <div className="grid grid-cols-4 gap-2 text-center">
                <div className="p-2 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-[9px] text-slate-400 block">CGPA</span>
                  <span className={`font-bold text-xs ${st.cgpa < 6.5 ? 'text-rose-400' : 'text-indigo-300'}`}>
                    {st.cgpa.toFixed(2)}
                  </span>
                </div>
                <div className="p-2 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-[9px] text-slate-400 block">Attendance</span>
                  <span className={`font-bold text-xs ${st.attendance < 75 ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {st.attendance}%
                  </span>
                </div>
                <div className="p-2 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-[9px] text-slate-400 block">Backlogs</span>
                  <span className={`font-bold text-xs ${(st.previousYearBacklogs || 0) > 0 ? 'text-rose-400' : 'text-slate-300'}`}>
                    {st.previousYearBacklogs || st.currentBacklogs || 0}
                  </span>
                </div>
                <div className="p-2 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-[9px] text-slate-400 block">Study Hrs</span>
                  <span className={`font-bold text-xs ${st.studyHours < 8 ? 'text-amber-400' : 'text-purple-300'}`}>
                    {st.studyHours}h/wk
                  </span>
                </div>
              </div>

              {/* Explainable Contributing Factors */}
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                <span className="text-[10px] font-bold uppercase text-slate-400 block tracking-wider">
                  Explainable Risk Reasons:
                </span>
                <div className="space-y-1">
                  {st.riskReasons && st.riskReasons.length > 0 ? (
                    st.riskReasons.map((r, idx) => (
                      <p key={idx} className="text-[11px] text-slate-300 bg-slate-900/90 px-2.5 py-1 rounded-md border border-slate-800/80">
                        • {r}
                      </p>
                    ))
                  ) : (
                    <p className="text-[11px] text-emerald-400 bg-slate-900/90 px-2.5 py-1 rounded-md border border-slate-800/80">
                      • Student is performing in Good Standing.
                    </p>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2 pt-1 justify-end">
                <button
                  onClick={() => onViewStudent360(st.id)}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-colors"
                >
                  Student 360° Profile
                </button>

                {onInitiateIntervention && userRole !== 'student' && (
                  <button
                    onClick={() => onInitiateIntervention(st.id)}
                    className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md shadow-rose-600/30 flex items-center gap-1.5"
                  >
                    <ShieldAlert className="w-3.5 h-3.5" /> Initiate Intervention
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
