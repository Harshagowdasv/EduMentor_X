import React, { useState, useEffect } from 'react';
import Papa from 'papaparse';
import { Student, Mentor } from '../../types';
import { dbService } from '../../services/serviceFactory';
import { Download, FileText, BarChart2, Filter, Users, ShieldAlert } from 'lucide-react';

export const SystemReports: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [mentors, setMentors] = useState<Mentor[]>([]);
  const [loading, setLoading] = useState(true);

  const [deptFilter, setDeptFilter] = useState('');
  const [riskFilter, setRiskFilter] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [stRes, mList] = await Promise.all([
        dbService.getStudents(1, 500),
        dbService.getMentors(),
      ]);
      setStudents(stRes.students);
      setMentors(mList);
    } catch (err) {
      console.error('Failed to load report data:', err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = students.filter((s) => {
    const matchesDept = !deptFilter || s.department === deptFilter;
    const matchesRisk = !riskFilter || s.riskLevel === riskFilter;
    return matchesDept && matchesRisk;
  });

  const exportStudentPerformanceCSV = () => {
    const csvData = filtered.map((s) => ({
      USN: s.usn,
      Name: s.name,
      Email: s.email,
      Department: s.department,
      MentorName: s.mentorName || 'Unallocated',
      AttendancePercent: s.attendance,
      CGPA: s.cgpa,
      ActiveBacklogs: s.previousYearBacklogs,
      WeeklyStudyHours: s.studyHours,
      FinancialScore: s.financialScore,
      RiskLevel: s.riskLevel,
      ExplainableReasons: s.riskReasons.join(' | '),
    }));

    const csvContent = Papa.unparse(csvData);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `EduMentorX_Student_Performance_Report_${Date.now()}.csv`;
    a.click();
  };

  const exportMentorWorkloadCSV = () => {
    const csvData = mentors.map((m) => {
      const mStudents = students.filter((s) => s.mentorId === m.id);
      return {
        StaffID: m.staffId,
        MentorName: m.name,
        Email: m.email,
        Department: m.department,
        ActiveMenteesCount: mStudents.length,
        GoodPerformanceCount: mStudents.filter((s) => s.riskLevel === 'GOOD_PERFORMANCE').length,
        NeedsMonitoringCount: mStudents.filter((s) => s.riskLevel === 'NEEDS_MONITORING').length,
        HighPriorityCount: mStudents.filter((s) => s.riskLevel === 'HIGH_PRIORITY').length,
      };
    });

    const csvContent = Papa.unparse(csvData);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `EduMentorX_Mentor_Workload_Report_${Date.now()}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
          <FileText className="w-5 h-5 text-indigo-400" />
          Institutional Reports & Analytics Export
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Generate and export official CSV reports for faculty reviews, accreditation, and department audits
        </p>
      </div>

      {/* Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 1: Student Performance Report */}
        <div className="p-4 sm:p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 sm:p-3 rounded-xl bg-indigo-950 text-indigo-400 border border-indigo-800 shrink-0">
              <BarChart2 className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white">Student Performance & Risk Matrix Report</h3>
              <p className="text-xs text-slate-400">Export student CGPA, attendance, backlogs, and risk reasons</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-white flex-1"
            >
              <option value="">All Departments</option>
              <option value="Computer Science & Engineering">Computer Science & Engineering</option>
              <option value="Information Science & Engineering">Information Science & Engineering</option>
              <option value="Electronics & Communication">Electronics & Communication</option>
            </select>
            <select
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-white flex-1"
            >
              <option value="">All Risk Tiers</option>
              <option value="GOOD_PERFORMANCE">Good Performance</option>
              <option value="NEEDS_MONITORING">Needs Monitoring</option>
              <option value="HIGH_PRIORITY">High Priority</option>
            </select>
          </div>

          <button
            onClick={exportStudentPerformanceCSV}
            className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" /> Download Performance CSV ({filtered.length} Students)
          </button>
        </div>

        {/* Card 2: Mentor Workload Report */}
        <div className="p-4 sm:p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 sm:p-3 rounded-xl bg-purple-950 text-purple-400 border border-purple-800 shrink-0">
              <Users className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white">Mentor Workload & Mentee Distribution</h3>
              <p className="text-xs text-slate-400">Export active mentee counts, department loads, and risk ratios per mentor</p>
            </div>
          </div>

          <p className="text-xs text-slate-400 pt-2">Includes total faculty mentors: {mentors.length}</p>

          <button
            onClick={exportMentorWorkloadCSV}
            className="w-full py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg shadow-purple-600/30 transition-all flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" /> Download Mentor Workload CSV ({mentors.length} Mentors)
          </button>
        </div>
      </div>
    </div>
  );
};
