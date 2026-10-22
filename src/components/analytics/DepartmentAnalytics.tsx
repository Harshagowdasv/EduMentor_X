import React, { useState, useEffect } from 'react';
import Papa from 'papaparse';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';
import { dbService } from '../../services/serviceFactory';
import { Student, Mentor } from '../../types';
import { Building2, Download, BarChart3, Users, Award, TrendingUp } from 'lucide-react';

export const DepartmentAnalytics: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [mentors, setMentors] = useState<Mentor[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDept, setSelectedDept] = useState<string>('all');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [stRes, mList] = await Promise.all([
        dbService.getStudents(1, 1000),
        dbService.getMentors(),
      ]);
      setStudents(stRes.students);
      setMentors(mList);
    } catch (err) {
      console.error('Failed to load department analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  const departments = Array.from(new Set([...students.map((s) => s.department), ...mentors.map((m) => m.department)]));

  const deptMetrics = departments.map((dept) => {
    const deptStudents = students.filter((s) => s.department === dept);
    const deptMentors = mentors.filter((m) => m.department === dept);

    const avgCgpa = deptStudents.length ? deptStudents.reduce((acc, s) => acc + s.cgpa, 0) / deptStudents.length : 0;
    const avgAttendance = deptStudents.length ? deptStudents.reduce((acc, s) => acc + s.attendance, 0) / deptStudents.length : 0;
    const avgStudyHours = deptStudents.length ? deptStudents.reduce((acc, s) => acc + s.studyHours, 0) / deptStudents.length : 0;
    const highRiskCount = deptStudents.filter((s) => s.riskLevel === 'HIGH_PRIORITY').length;

    return {
      department: dept,
      shortName: dept.replace('Engineering', 'Eng').replace('Science', 'Sci'),
      studentCount: deptStudents.length,
      mentorCount: deptMentors.length,
      avgCgpa: Number(avgCgpa.toFixed(2)),
      avgAttendance: Math.round(avgAttendance),
      avgStudyHours: Math.round(avgStudyHours),
      highRiskCount,
    };
  });

  const exportDepartmentCSV = () => {
    const csvContent = Papa.unparse(deptMetrics);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `EduMentorX_Department_Analytics_Report_${Date.now()}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900 border border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Building2 className="w-5 h-5 text-indigo-400" />
            Institutional Department Analytics & Comparison
          </h2>
          <p className="text-xs text-slate-400 mt-1">Cross-department metrics on student performance, attendance, and faculty workload</p>
        </div>

        <button
          onClick={exportDepartmentCSV}
          className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-2"
        >
          <Download className="w-4 h-4" /> Export Department CSV
        </button>
      </div>

      {/* Comparison Chart */}
      <div className="p-4 sm:p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
        <h3 className="text-xs font-bold text-white uppercase tracking-wider">
          Average CGPA & Attendance Comparison by Department
        </h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={deptMetrics}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="shortName" stroke="#94a3b8" fontSize={11} />
              <YAxis stroke="#94a3b8" fontSize={11} />
              <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#fff' }} />
              <Legend />
              <Bar dataKey="avgCgpa" fill="#6366f1" radius={[6, 6, 0, 0]} name="Average CGPA (Scale 10)" />
              <Bar dataKey="avgAttendance" fill="#10b981" radius={[6, 6, 0, 0]} name="Average Attendance %" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Department Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-6">
        {deptMetrics.map((dm, idx) => (
          <div key={idx} className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
            <h4 className="font-bold text-white text-sm border-b border-slate-800 pb-2">{dm.department}</h4>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/80">
                <span className="text-slate-400 block text-[10px]">Students</span>
                <span className="font-bold text-white text-base">{dm.studentCount}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/80">
                <span className="text-slate-400 block text-[10px]">Mentors</span>
                <span className="font-bold text-white text-base">{dm.mentorCount}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/80">
                <span className="text-slate-400 block text-[10px]">Avg CGPA</span>
                <span className="font-bold text-indigo-300 text-base">{dm.avgCgpa}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/80">
                <span className="text-slate-400 block text-[10px]">Avg Attendance</span>
                <span className="font-bold text-emerald-400 text-base">{dm.avgAttendance}%</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
