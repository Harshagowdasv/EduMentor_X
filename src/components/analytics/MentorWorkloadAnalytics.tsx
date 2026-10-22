import React, { useState, useEffect } from 'react';
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
import { Mentor, Student, AISafetyAlert } from '../../types';
import { UserCheck, AlertTriangle, ShieldAlert, CheckCircle2, Users } from 'lucide-react';

export const MentorWorkloadAnalytics: React.FC = () => {
  const [mentors, setMentors] = useState<Mentor[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [alerts, setAlerts] = useState<AISafetyAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [threshold, setThreshold] = useState<number>(10);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [mList, stRes, aList] = await Promise.all([
        dbService.getMentors(),
        dbService.getStudents(1, 1000),
        dbService.getAISafetyAlerts(),
      ]);
      setMentors(mList);
      setStudents(stRes.students);
      setAlerts(aList);
    } catch (err) {
      console.error('Failed to load mentor workload data:', err);
    } finally {
      setLoading(false);
    }
  };

  const workloadData = mentors.map((m) => {
    const mStudents = students.filter((s) => s.mentorId === m.id);
    const highPriorityCount = mStudents.filter((s) => s.riskLevel === 'HIGH_PRIORITY').length;
    const unresolvedAlertsCount = alerts.filter((a) => a.mentorId === m.id && a.status === 'NEW').length;

    return {
      name: m.name.split(' ')[1] || m.name,
      fullName: m.name,
      department: m.department,
      assignedCount: mStudents.length,
      highPriorityCount,
      unresolvedAlertsCount,
      isOverloaded: mStudents.length > threshold,
    };
  });

  return (
    <div className="space-y-6">
      {/* Top Header & Config Threshold */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900 border border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-indigo-400" />
            Faculty Mentor Workload & Distribution Analytics
          </h2>
          <p className="text-xs text-slate-400 mt-1">Monitor mentee allocations, high-priority counts, and workload overload warnings</p>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-300 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
          <span>Max Workload Threshold:</span>
          <input
            type="number"
            value={threshold}
            onChange={(e) => setThreshold(Number(e.target.value) || 10)}
            className="w-12 bg-slate-900 border border-slate-700 rounded px-2 py-0.5 text-center text-white font-bold"
          />
          <span>Mentees</span>
        </div>
      </div>

      {/* Workload Comparison Bar Chart */}
      <div className="p-4 sm:p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
        <h3 className="text-xs font-bold text-white uppercase tracking-wider">
          Mentee Allocation Comparison per Faculty Mentor
        </h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={workloadData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
              <YAxis stroke="#94a3b8" fontSize={11} />
              <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#fff' }} />
              <Legend />
              <Bar dataKey="assignedCount" fill="#6366f1" radius={[6, 6, 0, 0]} name="Assigned Mentees" />
              <Bar dataKey="highPriorityCount" fill="#f43f5e" radius={[6, 6, 0, 0]} name="High Priority Mentees" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Mentor Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-6">
        {workloadData.map((m, idx) => (
          <div
            key={idx}
            className={`p-4 sm:p-5 rounded-2xl border space-y-3 transition-all ${
              m.isOverloaded ? 'bg-rose-950/20 border-rose-800/80' : 'bg-slate-900 border-slate-800'
            }`}
          >
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-white text-sm">{m.fullName}</h4>
              {m.isOverloaded && (
                <span className="px-2 py-0.5 text-[10px] font-bold bg-rose-600 text-white rounded-md flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> Overloaded
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400">{m.department}</p>
            <div className="grid grid-cols-3 gap-2 text-xs pt-2">
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-center">
                <span className="text-slate-400 block text-[10px]">Mentees</span>
                <span className="font-bold text-white text-sm">{m.assignedCount}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-rose-950/60 border border-rose-800/60 text-center">
                <span className="text-rose-300 block text-[10px]">High Priority</span>
                <span className="font-bold text-white text-sm">{m.highPriorityCount}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-amber-950/60 border border-amber-800/60 text-center">
                <span className="text-amber-300 block text-[10px]">New Alerts</span>
                <span className="font-bold text-white text-sm">{m.unresolvedAlertsCount}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
