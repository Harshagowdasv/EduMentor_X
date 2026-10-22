import React, { useState, useEffect } from 'react';
import { Mentor, Student } from '../../types';
import { dbService } from '../../services/serviceFactory';
import { ArrowLeft, UserCheck, Mail, Phone, Building2, Eye, UserMinus, RefreshCw } from 'lucide-react';

interface MentorDetailPageProps {
  mentor: Mentor;
  onBack: () => void;
  onViewStudent360: (studentId: string) => void;
  onReassignStudent: (student: Student) => void;
  actorId: string;
}

export const MentorDetailPage: React.FC<MentorDetailPageProps> = ({
  mentor,
  onBack,
  onViewStudent360,
  onReassignStudent,
  actorId,
}) => {
  const [mentees, setMentees] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMentees();
  }, [mentor.id]);

  const loadMentees = async () => {
    setLoading(true);
    try {
      const list = await dbService.getStudentsByMentorId(mentor.id);
      setMentees(list);
    } catch (err) {
      console.error('Failed to load mentees:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveAllocation = async (student: Student) => {
    if (confirm(`Remove allocation for ${student.name}? Student will become unallocated.`)) {
      await dbService.allocateStudent(student.id, '', actorId, 'Allocation removed by admin');
      await loadMentees();
    }
  };

  const goodCount = mentees.filter((s) => s.riskLevel === 'GOOD_PERFORMANCE').length;
  const moderateCount = mentees.filter((s) => s.riskLevel === 'NEEDS_MONITORING').length;
  const highCount = mentees.filter((s) => s.riskLevel === 'HIGH_PRIORITY').length;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Back Navigation */}
      <button
        onClick={onBack}
        className="px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 font-bold text-xs inline-flex items-center gap-2 transition-all"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Mentor Directory
      </button>

      {/* Mentor Profile Summary Card */}
      <div className="p-4 sm:p-6 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-2xl font-bold text-white shadow-lg">
            {mentor.name.charAt(0)}
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold text-white">{mentor.name}</h2>
              <span className="px-2.5 py-0.5 text-xs font-mono font-bold bg-indigo-950 text-indigo-300 border border-indigo-800 rounded-md">
                {mentor.staffId}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1 flex items-center gap-3">
              <Building2 className="w-3.5 h-3.5" /> {mentor.department}
              <span>•</span>
              <Mail className="w-3.5 h-3.5" /> {mentor.email}
              <span>•</span>
              <Phone className="w-3.5 h-3.5" /> {mentor.phone}
            </p>
          </div>
        </div>

        {/* Breakdown KPI Cards */}
        <div className="grid grid-cols-4 gap-3 w-full md:w-auto">
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-center">
            <p className="text-[10px] text-slate-400 font-bold uppercase">Total Mentees</p>
            <p className="text-xl font-extrabold text-white mt-0.5">{mentees.length}</p>
          </div>
          <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-800/60 text-center">
            <p className="text-[10px] text-emerald-400 font-bold uppercase">Good Standing</p>
            <p className="text-xl font-extrabold text-white mt-0.5">{goodCount}</p>
          </div>
          <div className="p-3 rounded-xl bg-amber-950/60 border border-amber-800/60 text-center">
            <p className="text-[10px] text-amber-400 font-bold uppercase">Monitoring</p>
            <p className="text-xl font-extrabold text-white mt-0.5">{moderateCount}</p>
          </div>
          <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800/60 text-center">
            <p className="text-[10px] text-rose-400 font-bold uppercase">High Priority</p>
            <p className="text-xl font-extrabold text-white mt-0.5">{highCount}</p>
          </div>
        </div>
      </div>

      {/* Mentees Table */}
      <div className="border border-slate-800 rounded-2xl bg-slate-900/80 overflow-hidden">
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">
            Assigned Student Mentees List ({mentees.length})
          </h3>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400">Loading mentees...</div>
        ) : mentees.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">No students currently allocated to this mentor.</div>
        ) : (
          <div className="overflow-x-auto no-scrollbar">
            <table className="w-full text-left border-collapse text-xs min-w-[650px]">
              <thead className="bg-slate-950/60 border-b border-slate-800 text-slate-400 uppercase font-bold text-[11px] tracking-wider">
                <tr>
                  <th className="p-3.5">USN</th>
                  <th className="p-3.5">Name</th>
                  <th className="p-3.5">Contact</th>
                  <th className="p-3.5">Attendance</th>
                  <th className="p-3.5">CGPA</th>
                  <th className="p-3.5">Risk Level</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {mentees.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-800/40">
                    <td className="p-3.5 font-mono font-bold text-indigo-400">{s.usn}</td>
                    <td className="p-3.5 font-bold text-white">{s.name}</td>
                    <td className="p-3.5 text-slate-400">{s.email}</td>
                    <td className="p-3.5 font-bold">{s.attendance}%</td>
                    <td className="p-3.5 font-bold text-indigo-300">{s.cgpa.toFixed(2)}</td>
                    <td className="p-3.5">
                      <span
                        className={`px-2.5 py-0.5 text-[10px] font-bold rounded-md border ${
                          s.riskLevel === 'GOOD_PERFORMANCE'
                            ? 'bg-emerald-950 text-emerald-300 border-emerald-700/60'
                            : s.riskLevel === 'NEEDS_MONITORING'
                            ? 'bg-amber-950 text-amber-300 border-amber-700/60'
                            : 'bg-rose-950 text-rose-300 border-rose-700/60'
                        }`}
                      >
                        {s.riskLevel.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="p-3.5 text-right space-x-1.5">
                      <button
                        onClick={() => onViewStudent360(s.id)}
                        className="px-2.5 py-1 rounded-lg bg-indigo-600/20 text-indigo-300 font-bold border border-indigo-500/30 hover:bg-indigo-600/40 transition-all inline-flex items-center gap-1"
                      >
                        <Eye className="w-3 h-3" /> 360° Profile
                      </button>
                      <button
                        onClick={() => onReassignStudent(s)}
                        className="px-2.5 py-1 rounded-lg bg-purple-600/20 text-purple-300 font-bold border border-purple-500/30 hover:bg-purple-600/40 transition-all inline-flex items-center gap-1"
                      >
                        <RefreshCw className="w-3 h-3" /> Reassign
                      </button>
                      <button
                        onClick={() => handleRemoveAllocation(s)}
                        className="px-2 py-1 rounded-lg bg-rose-950/40 text-rose-300 font-bold border border-rose-800/40 hover:bg-rose-900/60 transition-all"
                      >
                        <UserMinus className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
