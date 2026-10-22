import React, { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { dbService } from '../../services/serviceFactory';
import { logLoginStage } from '../../utils/loginPerfLogger';
import { Student, Mentor } from '../../types';
import { Users, UserCheck, UserX, Building2, AlertTriangle, TrendingUp, ShieldAlert, Award } from 'lucide-react';

export const AdminDashboardOverview: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [mentors, setMentors] = useState<Mentor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const tStart = performance.now();
    setLoading(true);
    try {
      const [stRes, mList] = await Promise.all([
        dbService.getStudents(1, 1000),
        dbService.getMentors(),
      ]);
      setStudents(stRes.students);
      setMentors(mList);
      logLoginStage('7_dashboardFirstRenderAndQueries', performance.now() - tStart, 'SUCCESS', 'admin-overview');
    } catch (err) {
      logLoginStage('7_dashboardFirstRenderAndQueries', performance.now() - tStart, 'FAILURE', 'admin-overview');
      console.error('Failed to load admin overview data:', err);
    } finally {
      setLoading(false);
    }
  };

  const totalStudents = students.length;
  const totalMentors = mentors.length;
  const allocatedStudents = students.filter((s) => Boolean(s.mentorId)).length;
  const unallocatedStudents = totalStudents - allocatedStudents;

  const goodCount = students.filter((s) => s.riskLevel === 'GOOD_PERFORMANCE').length;
  const moderateCount = students.filter((s) => s.riskLevel === 'NEEDS_MONITORING').length;
  const highCount = students.filter((s) => s.riskLevel === 'HIGH_PRIORITY').length;

  // Chart 1: Risk Distribution Data
  const riskData = [
    { name: 'Good Performance', value: goodCount, color: '#10b981' },
    { name: 'Needs Monitoring', value: moderateCount, color: '#f59e0b' },
    { name: 'High Priority', value: highCount, color: '#ef4444' },
  ];

  // Chart 2: Students by Department
  const deptMap: Record<string, number> = {};
  students.forEach((s) => {
    const dept = s.department || 'Other';
    deptMap[dept] = (deptMap[dept] || 0) + 1;
  });
  const deptData = Object.keys(deptMap).map((k) => ({
    name: k.replace('Engineering', 'Eng').replace('Science', 'Sci'),
    students: deptMap[k],
  }));

  // Chart 3: CGPA Distribution
  const cgpaBuckets = [
    { range: '9.0 - 10.0', count: students.filter((s) => s.cgpa >= 9.0).length },
    { range: '8.0 - 8.9', count: students.filter((s) => s.cgpa >= 8.0 && s.cgpa < 9.0).length },
    { range: '7.0 - 7.9', count: students.filter((s) => s.cgpa >= 7.0 && s.cgpa < 8.0).length },
    { range: '6.0 - 6.9', count: students.filter((s) => s.cgpa >= 6.0 && s.cgpa < 7.0).length },
    { range: '< 6.0', count: students.filter((s) => s.cgpa < 6.0).length },
  ];

  return (
    <div className="space-y-6">
      {/* Overview Top Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-slate-800 flex items-start gap-3.5 sm:gap-4">
          <div className="p-2.5 sm:p-3 rounded-xl bg-indigo-950 text-indigo-400 border border-indigo-800/50 shrink-0">
            <UserCheck className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-400">Total Mentors</p>
            <p className="text-xl sm:text-2xl font-bold text-white mt-0.5 sm:mt-1">{totalMentors}</p>
            <span className="text-[11px] text-emerald-400 font-semibold">Active Faculty</span>
          </div>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-slate-800 flex items-start gap-3.5 sm:gap-4">
          <div className="p-2.5 sm:p-3 rounded-xl bg-purple-950 text-purple-400 border border-purple-800/50 shrink-0">
            <Users className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-400">Total Students</p>
            <p className="text-xl sm:text-2xl font-bold text-white mt-0.5 sm:mt-1">{totalStudents}</p>
            <span className="text-[11px] text-indigo-300 font-semibold">{allocatedStudents} Allocated</span>
          </div>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-slate-800 flex items-start gap-3.5 sm:gap-4">
          <div className="p-2.5 sm:p-3 rounded-xl bg-amber-950 text-amber-400 border border-amber-800/50 shrink-0">
            <UserX className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-400">Unallocated Students</p>
            <p className="text-xl sm:text-2xl font-bold text-white mt-0.5 sm:mt-1">{unallocatedStudents}</p>
            <span className="text-[11px] text-amber-400 font-semibold">Requires Assignment</span>
          </div>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-slate-800 flex items-start gap-3.5 sm:gap-4">
          <div className="p-2.5 sm:p-3 rounded-xl bg-rose-950 text-rose-400 border border-rose-800/50 shrink-0">
            <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-400">High Priority Students</p>
            <p className="text-xl sm:text-2xl font-bold text-white mt-0.5 sm:mt-1">{highCount}</p>
            <span className="text-[11px] text-rose-400 font-semibold">{moderateCount} Needs Monitoring</span>
          </div>
        </div>
      </div>

      {/* Analytics Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Risk Level Spread */}
        <div className="p-4 sm:p-6 rounded-2xl bg-slate-900 border border-slate-800">
          <h3 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider mb-4">
            Institutional Risk Distribution
          </h3>
          <div className="h-64 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={riskData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={5} dataKey="value">
                  {riskData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#fff' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap justify-center gap-2 sm:gap-6 text-xs mt-2">
            <span className="flex items-center gap-1.5 text-emerald-400 font-bold">● Good ({goodCount})</span>
            <span className="flex items-center gap-1.5 text-amber-400 font-bold">● Moderate ({moderateCount})</span>
            <span className="flex items-center gap-1.5 text-rose-400 font-bold">● High Priority ({highCount})</span>
          </div>
        </div>

        {/* CGPA Distribution Bar Chart */}
        <div className="p-4 sm:p-6 rounded-2xl bg-slate-900 border border-slate-800">
          <h3 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider mb-4">
            CGPA Grade Spread Breakdown
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={cgpaBuckets}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="range" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#fff' }} />
                <Bar dataKey="count" fill="#6366f1" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
