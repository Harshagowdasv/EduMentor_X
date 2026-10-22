import React, { useState, useEffect } from 'react';
import { Student, StudentAcademicMark } from '../../types';
import { dbService } from '../../services/serviceFactory';
import { logLoginStage } from '../../utils/loginPerfLogger';
import {
  TrendingUp,
  GraduationCap,
  Clock,
  AlertTriangle,
  Mail,
  FileSpreadsheet,
  TrendingDown,
  Minus,
  BookOpen,
  Loader2
} from 'lucide-react';

interface StudentDashboardOverviewProps {
  student: Student;
  onOpenAIMentor: () => void;
}

export const StudentDashboardOverview: React.FC<StudentDashboardOverviewProps> = ({
  student,
  onOpenAIMentor,
}) => {
  const [iaMarks, setIaMarks] = useState<StudentAcademicMark[]>([]);
  const [loadingMarks, setLoadingMarks] = useState(true);
  const [marksError, setMarksError] = useState<string | null>(null);
  const [selectedTermFilter, setSelectedTermFilter] = useState<string>('active');

  useEffect(() => {
    if (student && student.id) {
      loadStudentMarks();
    }
  }, [student?.id]);

  const loadStudentMarks = async () => {
    const tStart = performance.now();
    setLoadingMarks(true);
    setMarksError(null);
    try {
      const marks = await dbService.getStudentAcademicMarks(student.id);
      setIaMarks(marks);
      logLoginStage('7_dashboardFirstRenderAndQueries', performance.now() - tStart, 'SUCCESS', 'student-dashboard');
    } catch (err: any) {
      logLoginStage('7_dashboardFirstRenderAndQueries', performance.now() - tStart, 'FAILURE', 'student-dashboard');
      console.error('Failed to load student IA marks:', err);
      setMarksError(err.message || 'Failed to load IA marks');
    } finally {
      setLoadingMarks(false);
    }
  };

  // Extract unique terms
  const termsSet = Array.from(
    new Set(iaMarks.map((m) => `${m.academicYear}__${m.semester}`))
  );

  const filteredMarks = iaMarks.filter((m) => {
    if (selectedTermFilter === 'active' || selectedTermFilter === 'all') return true;
    const key = `${m.academicYear}__${m.semester}`;
    return key === selectedTermFilter;
  });

  return (
    <div className="space-y-6">
      {/* Top Academic Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex items-start gap-4">
          <div className="p-3 rounded-xl bg-indigo-950 text-indigo-400 border border-indigo-800/50">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-400">Cumulative CGPA</p>
            <p className="text-2xl font-bold text-white mt-1">{student.cgpa.toFixed(2)}</p>
            <span className="text-[11px] text-indigo-400 font-semibold">Scale 0 - 10.0</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex items-start gap-4">
          <div className="p-3 rounded-xl bg-emerald-950 text-emerald-400 border border-emerald-800/50">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-400">Lecture Attendance</p>
            <p className="text-2xl font-bold text-white mt-1">{student.attendance}%</p>
            <span className={`text-[11px] font-semibold ${student.attendance >= 75 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {student.attendance >= 75 ? 'Meets requirement' : 'Below 75%'}
            </span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex items-start gap-4">
          <div className="p-3 rounded-xl bg-purple-950 text-purple-400 border border-purple-800/50">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-400">Weekly Study Hours</p>
            <p className="text-2xl font-bold text-white mt-1">{student.studyHours} hrs</p>
            <span className="text-[11px] text-purple-300 font-semibold">Self-reported Discipline</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex items-start gap-4">
          <div className="p-3 rounded-xl bg-amber-950 text-amber-400 border border-amber-800/50">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-400">Active Backlogs</p>
            <p className="text-2xl font-bold text-white mt-1">{student.previousYearBacklogs}</p>
            <span className="text-[11px] text-slate-400">Previous semesters</span>
          </div>
        </div>
      </div>

      {/* ACADEMIC PERFORMANCE — IA MARKS SECTION */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-indigo-400" />
              Internal Assessment (IA1 / IA2) Performance
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Subject-wise marks, averages, and internal performance trends for {student.name} ({student.usn})
            </p>
          </div>

          {termsSet.length > 1 && (
            <div className="flex items-center gap-2">
              <label className="text-[11px] text-slate-400 font-medium">Filter Term:</label>
              <select
                value={selectedTermFilter}
                onChange={(e) => setSelectedTermFilter(e.target.value)}
                className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white"
              >
                <option value="all">All Terms ({termsSet.length})</option>
                {termsSet.map((termKey) => {
                  const [yr, sem] = termKey.split('__');
                  return (
                    <option key={termKey} value={termKey}>
                      {yr} • {sem}
                    </option>
                  );
                })}
              </select>
            </div>
          )}
        </div>

        {/* LOADING STATE */}
        {loadingMarks && (
          <div className="p-8 text-center bg-slate-950/60 border border-slate-800/80 rounded-xl space-y-2">
            <Loader2 className="w-6 h-6 text-indigo-400 animate-spin mx-auto mb-2" />
            <p className="text-slate-300 font-medium text-xs">Loading academic performance...</p>
          </div>
        )}

        {/* ERROR STATE */}
        {!loadingMarks && marksError && (
          <div className="p-4 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400" />
            Failed to load IA marks. Please try refreshing the page.
          </div>
        )}

        {/* EMPTY STATE */}
        {!loadingMarks && !marksError && iaMarks.length === 0 && (
          <div className="p-8 text-center bg-slate-950/60 border border-slate-800/80 rounded-xl space-y-2">
            <FileSpreadsheet className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <p className="text-slate-300 font-semibold text-xs">No IA marks have been uploaded for this semester yet.</p>
            <p className="text-slate-500 text-[11px]">Marks will appear here once entered by the academic administrator.</p>
          </div>
        )}

        {/* DATA TABLE */}
        {!loadingMarks && !marksError && filteredMarks.length > 0 && (
          <div className="border border-slate-800 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 font-semibold">
                <tr>
                  <th className="p-3">Academic Term</th>
                  <th className="p-3">Subject Code & Name</th>
                  <th className="p-3 text-center">IA1 (Max 50)</th>
                  <th className="p-3 text-center">IA2 (Max 50)</th>
                  <th className="p-3 text-center">Average</th>
                  <th className="p-3 text-center">Trend</th>
                  <th className="p-3 text-right">Performance Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 bg-slate-900/40 text-slate-300">
                {filteredMarks.map((m) => {
                  const avg = Math.round(((m.ia1Marks + m.ia2Marks) / 2) * 10) / 10;
                  const isLow = avg < 20 || m.ia1Marks < 20 || m.ia2Marks < 20; // < 40%
                  let trend: 'improving' | 'stable' | 'declining' = 'stable';
                  if (m.ia2Marks > m.ia1Marks) trend = 'improving';
                  else if (m.ia2Marks < m.ia1Marks) trend = 'declining';

                  return (
                    <tr key={m.id} className={isLow ? 'bg-rose-950/20' : 'hover:bg-slate-900/60'}>
                      <td className="p-3 font-mono text-[11px] text-slate-400">
                        {m.academicYear} • {m.semester}
                      </td>
                      <td className="p-3">
                        <span className="font-bold text-white block">{m.subjectCode}</span>
                        <span className="text-[11px] text-slate-400">{m.subjectName}</span>
                      </td>
                      <td className="p-3 text-center font-bold text-indigo-300">{m.ia1Marks}</td>
                      <td className="p-3 text-center font-bold text-indigo-300">{m.ia2Marks}</td>
                      <td className="p-3 text-center font-bold text-white">{avg}</td>
                      <td className="p-3 text-center">
                        {trend === 'improving' && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">
                            <TrendingUp className="w-3 h-3" /> Improving
                          </span>
                        )}
                        {trend === 'stable' && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                            <Minus className="w-3 h-3" /> Stable
                          </span>
                        )}
                        {trend === 'declining' && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-400 bg-rose-950 px-2 py-0.5 rounded border border-rose-800">
                            <TrendingDown className="w-3 h-3" /> Declining
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-right">
                        {isLow ? (
                          <span className="px-2.5 py-1 rounded text-[10px] font-bold bg-rose-950 text-rose-300 border border-rose-800">
                            Needs Academic Support
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
                            Satisfactory
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Main Mentor Card & AI Promo */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Mentor Card */}
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Your Faculty Mentor</h3>
          {student.mentorId ? (
            <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-950 border border-slate-800">
              <div className="w-12 h-12 rounded-xl bg-indigo-950 text-indigo-400 border border-indigo-800 flex items-center justify-center font-bold text-lg">
                {student.mentorName?.charAt(0)}
              </div>
              <div>
                <h4 className="font-bold text-white text-sm">{student.mentorName}</h4>
                <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                  <Mail className="w-3.5 h-3.5" /> {student.mentorEmail}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-xs text-amber-400">You are currently awaiting faculty mentor allocation.</p>
          )}
        </div>

        {/* AI Assistant Banner */}
        <div className="p-6 rounded-2xl bg-gradient-to-br from-indigo-950/80 via-slate-900 to-purple-950/80 border border-indigo-800/50 flex flex-col justify-between space-y-4">
          <div>
            <span className="px-2.5 py-0.5 text-[10px] font-bold bg-indigo-900/60 text-indigo-300 rounded-full border border-indigo-700">
              AI Voice Mentor Active
            </span>
            <h3 className="text-lg font-bold text-white mt-2">Need Instant Academic Guidance?</h3>
            <p className="text-xs text-slate-300 mt-1">
              Chat or speak with your 2D Animated AI Avatar Assistant for study schedules, project code ideas, and career prep.
            </p>
          </div>
          <button
            onClick={onOpenAIMentor}
            className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition-all text-center"
          >
            Launch AI Avatar Mentor
          </button>
        </div>
      </div>
    </div>
  );
};

