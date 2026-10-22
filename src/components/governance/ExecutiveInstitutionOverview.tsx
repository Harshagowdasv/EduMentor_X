import React, { useState, useEffect } from 'react';
import { dbService } from '../../services/serviceFactory';
import { Student, Mentor, InterventionRecord } from '../../types';
import { Building2, Users, UserCheck, ShieldAlert, Award, TrendingUp, Star } from 'lucide-react';

export const ExecutiveInstitutionOverview: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [mentors, setMentors] = useState<Mentor[]>([]);
  const [interventions, setInterventions] = useState<InterventionRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [stRes, mList, iList] = await Promise.all([
        dbService.getStudents(1, 1000),
        dbService.getMentors(),
        dbService.getInterventions(),
      ]);
      setStudents(stRes.students);
      setMentors(mList);
      setInterventions(iList);
    } catch (err) {
      console.error('Failed to load executive overview:', err);
    } finally {
      setLoading(false);
    }
  };

  const totalStudents = students.length;
  const totalMentors = mentors.length;
  const allocatedCount = students.filter((s) => s.mentorId).length;
  const unallocatedCount = totalStudents - allocatedCount;
  const highPriorityCount = students.filter((s) => s.riskLevel === 'HIGH_PRIORITY').length;
  const activeInterventionsCount = interventions.filter((i) => i.status !== 'RESOLVED').length;

  const avgCgpa = totalStudents ? (students.reduce((acc, s) => acc + s.cgpa, 0) / totalStudents).toFixed(2) : '0';
  const avgAttendance = totalStudents ? Math.round(students.reduce((acc, s) => acc + s.attendance, 0) / totalStudents) : 0;

  return (
    <div className="space-y-6">
      {/* Executive Header Banner */}
      <div className="p-4 sm:p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <Building2 className="w-5 h-5 text-indigo-400" />
              Institutional Executive Command Dashboard
            </h2>
            <p className="text-xs text-slate-300 mt-1">High-level institutional statistics, risk escalation index, and mentorship performance metrics</p>
          </div>
          <span className="px-3 py-1 rounded-xl bg-indigo-950 text-indigo-300 border border-indigo-800 text-xs font-bold font-mono self-start sm:self-auto">
            Semester 6 Active Term
          </span>
        </div>

        {/* Top KPI Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5 sm:gap-3 pt-2">
          <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-center">
            <span className="text-[10px] text-slate-400 block">Total Students</span>
            <span className="font-extrabold text-white text-lg">{totalStudents}</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-center">
            <span className="text-[10px] text-slate-400 block">Faculty Mentors</span>
            <span className="font-extrabold text-white text-lg">{totalMentors}</span>
          </div>
          <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-800/60 text-center">
            <span className="text-[10px] text-emerald-300 block">Allocated</span>
            <span className="font-extrabold text-white text-lg">{allocatedCount}</span>
          </div>
          <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-800/60 text-center">
            <span className="text-[10px] text-amber-300 block">Unallocated</span>
            <span className="font-extrabold text-white text-lg">{unallocatedCount}</span>
          </div>
          <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800/60 text-center">
            <span className="text-[10px] text-rose-300 block">High Priority</span>
            <span className="font-extrabold text-white text-lg">{highPriorityCount}</span>
          </div>
          <div className="p-3 rounded-xl bg-purple-950/40 border border-purple-800/60 text-center">
            <span className="text-[10px] text-purple-300 block">Interventions</span>
            <span className="font-extrabold text-white text-lg">{activeInterventionsCount}</span>
          </div>
          <div className="p-3 rounded-xl bg-indigo-950/40 border border-indigo-800/60 text-center">
            <span className="text-[10px] text-indigo-300 block">Average CGPA</span>
            <span className="font-extrabold text-white text-lg">{avgCgpa}</span>
          </div>
          <div className="p-3 rounded-xl bg-sky-950/40 border border-sky-800/60 text-center">
            <span className="text-[10px] text-sky-300 block">Avg Attendance</span>
            <span className="font-extrabold text-white text-lg">{avgAttendance}%</span>
          </div>
        </div>
      </div>

      {/* Semester Comparison Matrix */}
      <div className="p-4 sm:p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
        <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-emerald-400" /> Semester Performance Delta Comparison (Sem 5 vs Sem 6)
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
            <p className="text-slate-400 text-[11px]">Average CGPA Growth</p>
            <p className="text-lg font-bold text-emerald-400">7.20 → 7.62 <span className="text-xs text-emerald-300 font-normal">(+0.42)</span></p>
          </div>
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
            <p className="text-slate-400 text-[11px]">Attendance Rate</p>
            <p className="text-lg font-bold text-emerald-400">78% → 84.3% <span className="text-xs text-emerald-300 font-normal">(+6.3%)</span></p>
          </div>
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
            <p className="text-slate-400 text-[11px]">Active Backlogs Reduction</p>
            <p className="text-lg font-bold text-emerald-400">142 → 97 <span className="text-xs text-emerald-300 font-normal">(-45 Backlogs)</span></p>
          </div>
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
            <p className="text-slate-400 text-[11px]">High Priority Students</p>
            <p className="text-lg font-bold text-emerald-400">86 → 61 <span className="text-xs text-emerald-300 font-normal">(-25 At Risk)</span></p>
          </div>
        </div>
      </div>
    </div>
  );
};
