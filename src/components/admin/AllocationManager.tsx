import React, { useState, useEffect } from 'react';
import { Student, Mentor, AllocationHistory } from '../../types';
import { dbService } from '../../services/serviceFactory';
import { Modal } from '../common/Modal';
import { IAMarksImportWizard } from './IAMarksImportWizard';
import { EditStudentModal } from './EditStudentModal';
import { DeleteStudentModal } from './DeleteStudentModal';
import {
  UserCheck,
  RefreshCw,
  History,
  Search,
  Filter,
  ShieldCheck,
  CheckCircle2,
  Users,
  UserX,
  CheckSquare,
  Square,
  AlertTriangle,
  ArrowRight,
  FileSpreadsheet,
  Edit2,
  Trash2
} from 'lucide-react';

interface AllocationManagerProps {
  actorId: string;
  onViewStudent360: (studentId: string) => void;
}

export const AllocationManager: React.FC<AllocationManagerProps> = ({ actorId, onViewStudent360 }) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [mentors, setMentors] = useState<Mentor[]>([]);
  const [history, setHistory] = useState<AllocationHistory[]>([]);
  const [loading, setLoading] = useState(true);

  // New Admin Enhancement Modals
  const [isIAMarksModalOpen, setIsIAMarksModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [deletingStudent, setDeletingStudent] = useState<Student | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [progFilter, setProgFilter] = useState('');
  const [yearFilter, setYearFilter] = useState('');
  const [semFilter, setSemFilter] = useState('');
  const [secFilter, setSecFilter] = useState('');
  const [mentorFilter, setMentorFilter] = useState('');
  const [riskFilter, setRiskFilter] = useState('');
  const [allocStatusFilter, setAllocStatusFilter] = useState<'all' | 'allocated' | 'unallocated'>('all');

  // Checkbox Selection State
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());

  // Modal Allocation Workflow State
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [mentorSearchQuery, setMentorSearchQuery] = useState('');
  const [selectedMentor, setSelectedMentor] = useState<Mentor | null>(null);
  const [reassignAll, setReassignAll] = useState(true);
  const [reassignReason, setReassignReason] = useState('Administrative mentee mapping');
  const [allocating, setAllocating] = useState(false);

  // Result Summary Modal State
  const [allocationResult, setAllocationResult] = useState<{
    allocatedCount: number;
    skippedCount: number;
    failedCount: number;
    mentorName: string;
  } | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [stRes, mList, hList] = await Promise.all([
        dbService.getStudents(1, 1000),
        dbService.getMentors(),
        dbService.getAllocationHistory(),
      ]);
      setStudents(stRes.students);
      setMentors(mList);
      setHistory(hList);
    } catch (err) {
      console.error('Failed to load allocation manager data:', err);
    } finally {
      setLoading(false);
    }
  };

  const totalStudents = students.length;
  const allocatedStudentsCount = students.filter((s) => Boolean(s.mentorId)).length;
  const unallocatedStudentsCount = totalStudents - allocatedStudentsCount;

  // Filtered Students Calculation
  const filteredStudents = students.filter((s) => {
    const q = search.toLowerCase().trim();
    const matchesSearch =
      !q ||
      s.name.toLowerCase().includes(q) ||
      s.usn.toLowerCase().includes(q) ||
      s.email.toLowerCase().includes(q) ||
      (s.phone && s.phone.toLowerCase().includes(q));

    const matchesDept = !deptFilter || s.department === deptFilter;
    const matchesProg = !progFilter || s.program === progFilter;
    const matchesYear = !yearFilter || String(s.year) === yearFilter;
    const matchesSem = !semFilter || String(s.semester) === semFilter;
    const matchesSec = !secFilter || s.section === secFilter;
    const matchesMentor = !mentorFilter || s.mentorId === mentorFilter;
    const matchesRisk = !riskFilter || s.riskLevel === riskFilter;
    const matchesAlloc =
      allocStatusFilter === 'all'
        ? true
        : allocStatusFilter === 'allocated'
        ? Boolean(s.mentorId)
        : !s.mentorId;

    return (
      matchesSearch &&
      matchesDept &&
      matchesProg &&
      matchesYear &&
      matchesSem &&
      matchesSec &&
      matchesMentor &&
      matchesRisk &&
      matchesAlloc
    );
  });

  // Checkbox Selection Logic
  const handleToggleSelectAllVisible = () => {
    if (selectedStudentIds.size === filteredStudents.length && filteredStudents.length > 0) {
      setSelectedStudentIds(new Set());
    } else {
      setSelectedStudentIds(new Set(filteredStudents.map((s) => s.id)));
    }
  };

  const handleToggleSelectStudent = (id: string) => {
    const next = new Set(selectedStudentIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedStudentIds(next);
  };

  const handleSelectFirstN = (count: number) => {
    const firstN = filteredStudents.slice(0, count).map((s) => s.id);
    setSelectedStudentIds(new Set(firstN));
  };

  const handleSelectNextN = (count: number) => {
    const currentArray = Array.from(selectedStudentIds);
    const lastIdx = filteredStudents.findIndex((s) => s.id === currentArray[currentArray.length - 1]);
    const start = lastIdx >= 0 ? lastIdx + 1 : 0;
    const nextN = filteredStudents.slice(start, start + count).map((s) => s.id);
    setSelectedStudentIds(new Set([...currentArray, ...nextN]));
  };

  const handleSelectAllUnallocated = () => {
    const unalloc = filteredStudents.filter((s) => !s.mentorId).map((s) => s.id);
    setSelectedStudentIds(new Set(unalloc));
  };

  // Mentor Search Filter
  const filteredMentors = mentors.filter((m) => {
    const q = mentorSearchQuery.toLowerCase().trim();
    return (
      !q ||
      m.name.toLowerCase().includes(q) ||
      m.email.toLowerCase().includes(q) ||
      m.department.toLowerCase().includes(q) ||
      m.staffId.toLowerCase().includes(q)
    );
  });

  // Execute Allocation
  const handleConfirmMapping = async () => {
    if (!selectedMentor || selectedStudentIds.size === 0) return;
    setAllocating(true);

    try {
      const idsArray = Array.from(selectedStudentIds);
      const res = await dbService.bulkAllocateStudents(idsArray, selectedMentor.id, actorId, {
        reassignAll,
        reason: reassignReason,
      });

      setIsMapModalOpen(false);
      setAllocationResult({
        allocatedCount: res.allocatedCount,
        skippedCount: res.skippedCount,
        failedCount: res.failedCount,
        mentorName: selectedMentor.name,
      });

      setSelectedStudentIds(new Set());
      setSelectedMentor(null);
      await loadData();
    } catch (err) {
      console.error('Bulk allocation failed:', err);
    } finally {
      setAllocating(false);
    }
  };

  const selectedStudentsList = students.filter((s) => selectedStudentIds.has(s.id));
  const unallocatedSelectedCount = selectedStudentsList.filter((s) => !s.mentorId).length;
  const alreadyAllocatedSelectedCount = selectedStudentsList.length - unallocatedSelectedCount;

  return (
    <div className="space-y-6 text-xs">
      {/* Top Header Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-400" />
              All Students & Dynamic Mentor Allocation Hub
            </h2>
            <p className="text-xs text-slate-300 mt-1">Master student inventory with checkbox range selection and dynamic mentor mapping</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsIAMarksModalOpen(true)}
              className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-indigo-600/30 transition"
            >
              <FileSpreadsheet className="w-4 h-4" /> Import IA Marks
            </button>
            <span className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-bold font-mono">
              Total: {totalStudents}
            </span>
          </div>
        </div>

        {/* Counter Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-slate-400 block">Total Students Master</span>
              <span className="font-extrabold text-white text-lg">{totalStudents}</span>
            </div>
            <Users className="w-6 h-6 text-indigo-400" />
          </div>

          <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-800/60 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-emerald-300 block">Allocated Students</span>
              <span className="font-extrabold text-emerald-400 text-lg">{allocatedStudentsCount}</span>
            </div>
            <UserCheck className="w-6 h-6 text-emerald-400" />
          </div>

          <div
            onClick={() => setAllocStatusFilter('unallocated')}
            className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-800/60 flex items-center justify-between cursor-pointer hover:border-amber-700 transition-colors"
          >
            <div>
              <span className="text-[10px] text-amber-300 block">Unallocated Students</span>
              <span className="font-extrabold text-amber-400 text-lg">{unallocatedStudentsCount}</span>
            </div>
            <UserX className="w-6 h-6 text-amber-400" />
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div className="relative col-span-1 sm:col-span-2">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search USN, Name, Email, or Phone..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 pl-9 pr-3 text-xs text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-white"
          >
            <option value="">All Departments</option>
            <option value="Computer Science & Engineering">Computer Science & Engineering</option>
            <option value="Information Science & Engineering">Information Science & Engineering</option>
            <option value="Electronics & Communication">Electronics & Communication</option>
          </select>

          <select
            value={allocStatusFilter}
            onChange={(e: any) => setAllocStatusFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-white font-bold"
          >
            <option value="all">All Allocation Statuses</option>
            <option value="allocated">Allocated Only</option>
            <option value="unallocated">Unallocated Only</option>
          </select>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1 border-t border-slate-800/80">
          <select
            value={yearFilter}
            onChange={(e) => setYearFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-white"
          >
            <option value="">All Years</option>
            <option value="1st Year">1st Year</option>
            <option value="2nd Year">2nd Year</option>
            <option value="3rd Year">3rd Year</option>
            <option value="4th Year">4th Year</option>
          </select>

          <select
            value={riskFilter}
            onChange={(e) => setRiskFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-white"
          >
            <option value="">All Risk Levels</option>
            <option value="GOOD_PERFORMANCE">Good Performance</option>
            <option value="NEEDS_MONITORING">Needs Monitoring</option>
            <option value="HIGH_PRIORITY">High Priority</option>
          </select>

          <select
            value={mentorFilter}
            onChange={(e) => setMentorFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-white"
          >
            <option value="">All Mentors</option>
            {mentors.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} ({m.activeMenteesCount} Mentees)
              </option>
            ))}
          </select>

          <button
            onClick={() => {
              setSearch('');
              setDeptFilter('');
              setYearFilter('');
              setRiskFilter('');
              setMentorFilter('');
              setAllocStatusFilter('all');
            }}
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold"
          >
            Reset Filters
          </button>
        </div>
      </div>

      {/* Bulk Action & Range Selection Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-indigo-950/40 border border-indigo-800/80">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-bold text-white text-xs mr-2">
            Selected: <span className="text-indigo-400 font-mono font-extrabold">{selectedStudentIds.size}</span> students
          </span>

          <button
            onClick={() => handleSelectFirstN(10)}
            className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 font-semibold"
          >
            Select First 10
          </button>
          <button
            onClick={() => handleSelectNextN(10)}
            className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 font-semibold"
          >
            Select Next 10
          </button>
          <button
            onClick={handleSelectAllUnallocated}
            className="px-2.5 py-1 rounded-lg bg-amber-950/80 hover:bg-amber-900 border border-amber-800 text-amber-300 font-bold"
          >
            Select Unallocated
          </button>
          <button
            onClick={handleToggleSelectAllVisible}
            className="px-2.5 py-1 rounded-lg bg-indigo-900 hover:bg-indigo-800 border border-indigo-700 text-indigo-200 font-bold"
          >
            Select All Visible ({filteredStudents.length})
          </button>
          {selectedStudentIds.size > 0 && (
            <button
              onClick={() => setSelectedStudentIds(new Set())}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
            >
              Clear Selection
            </button>
          )}
        </div>

        <button
          onClick={() => setIsMapModalOpen(true)}
          disabled={selectedStudentIds.size === 0}
          className={`px-5 py-2.5 rounded-xl font-bold text-xs shadow-lg flex items-center justify-center gap-2 transition-all shrink-0 ${
            selectedStudentIds.size > 0
              ? 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:opacity-95 text-white shadow-indigo-600/40 cursor-pointer'
              : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
          }`}
        >
          <UserCheck className="w-4 h-4" /> Map Selected Students to Mentor ({selectedStudentIds.size})
        </button>
      </div>

      {/* Main Student Master Data Table */}
      <div className="border border-slate-800 rounded-2xl bg-slate-900/80 overflow-hidden shadow-xl">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400">Loading student database...</div>
        ) : (
          <div className="overflow-x-auto no-scrollbar">
            <table className="w-full text-left border-collapse text-xs min-w-[850px]">
              <thead className="bg-slate-950 text-slate-400 uppercase font-bold text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="p-4 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={selectedStudentIds.size === filteredStudents.length && filteredStudents.length > 0}
                      onChange={handleToggleSelectAllVisible}
                      className="accent-indigo-500 rounded cursor-pointer"
                    />
                  </th>
                  <th className="p-4">USN</th>
                  <th className="p-4">Student Name</th>
                  <th className="p-4">Department</th>
                  <th className="p-4">Year</th>
                  <th className="p-4">CGPA</th>
                  <th className="p-4">Attendance</th>
                  <th className="p-4">Mentor</th>
                  <th className="p-4">Risk Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {filteredStudents.map((s) => {
                  const isSelected = selectedStudentIds.has(s.id);
                  return (
                    <tr
                      key={s.id}
                      className={`transition-colors ${
                        isSelected ? 'bg-indigo-950/30' : 'hover:bg-slate-800/40'
                      }`}
                    >
                      <td className="p-4 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelectStudent(s.id)}
                          className="accent-indigo-500 rounded cursor-pointer"
                        />
                      </td>
                      <td className="p-4 font-mono font-bold text-indigo-300">{s.usn}</td>
                      <td className="p-4 font-bold text-white">{s.name}</td>
                      <td className="p-4 text-slate-400">{s.department}</td>
                      <td className="p-4 text-slate-400">{s.year || '3rd Year'}</td>
                      <td className="p-4 font-bold text-indigo-300">{s.cgpa}</td>
                      <td className="p-4 font-bold text-emerald-400">{s.attendance}%</td>
                      <td className="p-4">
                        {s.mentorId ? (
                          <span className="font-bold text-indigo-300 flex items-center gap-1">
                            <UserCheck className="w-3.5 h-3.5 text-indigo-400" /> {s.mentorName}
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-md bg-amber-950/80 border border-amber-800/60 text-amber-300 font-bold">
                            Unallocated
                          </span>
                        )}
                      </td>
                      <td className="p-4">
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
                      <td className="p-4 text-right space-x-1.5 flex items-center justify-end">
                        <button
                          onClick={() => onViewStudent360(s.id)}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold border border-slate-700 transition-all text-xs"
                          title="View Student 360° Profile"
                        >
                          360° Profile
                        </button>
                        <button
                          onClick={() => setEditingStudent(s)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-indigo-600 text-slate-400 hover:text-white border border-slate-700 transition-all"
                          title="Edit Student Profile"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeletingStudent(s)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-600 text-slate-400 hover:text-white border border-slate-700 transition-all"
                          title="Deactivate / Delete Student"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* DYNAMIC MENTOR SEARCH & MAPPING MODAL */}
      <Modal
        isOpen={isMapModalOpen}
        onClose={() => setIsMapModalOpen(false)}
        title="Map Selected Mentees to Faculty Mentor"
        subtitle={`Select a mentor to allocate ${selectedStudentIds.size} selected student records`}
        maxWidth="4xl"
      >
        <div className="space-y-6 text-xs">
          {/* Step 1: Selected Students Breakdown */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 grid grid-cols-3 gap-3 text-center">
            <div>
              <span className="text-[10px] text-slate-400 block">Selected Mentees</span>
              <span className="font-extrabold text-white text-base">{selectedStudentIds.size}</span>
            </div>
            <div>
              <span className="text-[10px] text-amber-300 block">Currently Unallocated</span>
              <span className="font-extrabold text-amber-400 text-base">{unallocatedSelectedCount}</span>
            </div>
            <div>
              <span className="text-[10px] text-indigo-300 block">Already Assigned</span>
              <span className="font-extrabold text-indigo-300 text-base">{alreadyAllocatedSelectedCount}</span>
            </div>
          </div>

          {/* Step 2: Dynamic Mentor Search Box */}
          <div className="space-y-3">
            <label className="block font-bold text-slate-300">Search Faculty Mentor (by Name, Email, Department, or Staff ID)</label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              <input
                type="text"
                value={mentorSearchQuery}
                onChange={(e) => setMentorSearchQuery(e.target.value)}
                placeholder="e.g. Sarah Jenkins or mentor.sarah@edumentorx.edu..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 pl-9 pr-3 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Mentors Selection Grid */}
            <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
              {mentors
                .filter((m) => m.status === 'active' || (m as any).status !== 'inactive')
                .filter((m) => {
                  const q = mentorSearchQuery.toLowerCase().trim();
                  if (!q) return true;
                  return (
                    m.name.toLowerCase().includes(q) ||
                    m.email.toLowerCase().includes(q) ||
                    m.department.toLowerCase().includes(q) ||
                    (m.staffId && m.staffId.toLowerCase().includes(q))
                  );
                })
                .map((m) => {
                const isSelected = selectedMentor?.id === m.id;
                return (
                  <div
                    key={m.id}
                    onClick={() => setSelectedMentor(m)}
                    className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                      isSelected
                        ? 'bg-indigo-950 border-indigo-600 text-white shadow-md'
                        : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <p className="font-bold text-xs text-white">{m.name}</p>
                      <p className="text-[11px] text-slate-400 font-mono">{m.email} • Dept: {m.department}</p>
                    </div>
                    <div className="text-right">
                      <span className="px-2.5 py-1 text-[10px] font-bold rounded-lg bg-slate-900 border border-slate-800 text-indigo-300">
                        {m.activeMenteesCount} Mentees
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Step 3: Reassignment Options */}
          {alreadyAllocatedSelectedCount > 0 && (
            <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-800/60 space-y-2">
              <h5 className="font-bold text-amber-300 text-xs flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-400" /> Reassignment Strategy Notice
              </h5>
              <p className="text-slate-300 text-xs">
                {alreadyAllocatedSelectedCount} of the selected students are already assigned to other faculty mentors.
              </p>
              <div className="flex items-center gap-4 pt-1">
                <label className="flex items-center gap-1.5 cursor-pointer text-white">
                  <input
                    type="radio"
                    name="reassignChoice"
                    checked={reassignAll}
                    onChange={() => setReassignAll(true)}
                    className="accent-indigo-500"
                  />
                  <span>Reassign all selected students to {selectedMentor ? selectedMentor.name : 'new mentor'}</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer text-white">
                  <input
                    type="radio"
                    name="reassignChoice"
                    checked={!reassignAll}
                    onChange={() => setReassignAll(false)}
                    className="accent-indigo-500"
                  />
                  <span>Skip already allocated students</span>
                </label>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsMapModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmMapping}
              disabled={!selectedMentor || allocating}
              className="px-6 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:opacity-95 text-white font-bold shadow-lg shadow-indigo-600/30 flex items-center gap-2"
            >
              {allocating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              {allocating ? 'Mapping Mentees...' : `Confirm Mapping (${selectedStudentIds.size} Students)`}
            </button>
          </div>
        </div>
      </Modal>

      {/* ALLOCATION RESULT SUMMARY MODAL */}
      {allocationResult && (
        <Modal isOpen={Boolean(allocationResult)} onClose={() => setAllocationResult(null)} title="Mentor Mapping Completed">
          <div className="space-y-4 text-xs">
            <div className="p-4 rounded-xl bg-emerald-950 border border-emerald-800 flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-emerald-400" />
              <div>
                <h4 className="font-bold text-white text-sm">Successfully Allocated Mentees</h4>
                <p className="text-slate-300">Mapped to Faculty Mentor: <strong>{allocationResult.mentorName}</strong></p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-400 block">Successfully Mapped</span>
                <span className="font-extrabold text-emerald-400 text-lg">{allocationResult.allocatedCount}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-400 block">Skipped</span>
                <span className="font-extrabold text-amber-400 text-lg">{allocationResult.skippedCount}</span>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setAllocationResult(null)}
                className="px-5 py-2 rounded-xl bg-indigo-600 text-white font-bold"
              >
                Done
              </button>
            </div>
          </div>
        </Modal>
      )}

      <IAMarksImportWizard
        isOpen={isIAMarksModalOpen}
        onClose={() => setIsIAMarksModalOpen(false)}
        actorId={actorId}
        onSuccess={loadData}
      />

      <EditStudentModal
        isOpen={Boolean(editingStudent)}
        onClose={() => setEditingStudent(null)}
        student={editingStudent}
        actorId={actorId}
        onSuccess={loadData}
      />

      <DeleteStudentModal
        isOpen={Boolean(deletingStudent)}
        onClose={() => setDeletingStudent(null)}
        student={deletingStudent}
        actorId={actorId}
        onSuccess={loadData}
      />
    </div>
  );
};
