import React, { useState, useEffect } from 'react';
import { Student } from '../../types';
import { dbService } from '../../services/serviceFactory';
import { Search, Eye, FileText, BookOpen, Share2, AlertTriangle, Plus, CheckCircle2 } from 'lucide-react';
import { Modal } from '../common/Modal';

interface MenteesListProps {
  mentorId: string;
  mentorName: string;
  onViewStudent360: (studentId: string) => void;
  actorId: string;
}

export const MenteesList: React.FC<MenteesListProps> = ({
  mentorId,
  mentorName,
  onViewStudent360,
  actorId,
}) => {
  const [mentees, setMentees] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [riskFilter, setRiskFilter] = useState('');

  // Course Assignment Modal
  const [selectedStudentForCourse, setSelectedStudentForCourse] = useState<Student | null>(null);
  const [courseTitle, setCourseTitle] = useState('');
  const [coursePlatform, setCoursePlatform] = useState('Coursera / EdX');
  const [courseUrl, setCourseUrl] = useState('');
  const [assigningCourse, setAssigningCourse] = useState(false);

  // Resource Share Modal
  const [selectedStudentForResource, setSelectedStudentForResource] = useState<Student | null>(null);
  const [resTitle, setResTitle] = useState('');
  const [resUrl, setResUrl] = useState('');
  const [resCategory, setResCategory] = useState<'Notes' | 'Assignment' | 'Syllabus' | 'Reference' | 'Other'>('Notes');
  const [sharingResource, setSharingResource] = useState(false);

  useEffect(() => {
    loadMentees();
  }, [mentorId]);

  const loadMentees = async () => {
    setLoading(true);
    try {
      const list = await dbService.getStudentsByMentorId(mentorId);
      setMentees(list);
    } catch (err) {
      console.error('Failed to load mentees:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAssignCourseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentForCourse || !courseTitle) return;
    setAssigningCourse(true);

    try {
      await dbService.assignCourse({
        studentId: selectedStudentForCourse.id,
        title: courseTitle,
        platform: coursePlatform,
        url: courseUrl || 'https://coursera.org',
        status: 'assigned',
        assignedByMentorId: mentorId,
        assignedByMentorName: mentorName,
      });
      setSelectedStudentForCourse(null);
      setCourseTitle('');
      setCourseUrl('');
    } catch (err) {
      console.error('Failed to assign course:', err);
    } finally {
      setAssigningCourse(false);
    }
  };

  const handleShareResourceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resTitle) return;
    setSharingResource(true);

    try {
      await dbService.shareResource(
        {
          studentId: selectedStudentForResource ? selectedStudentForResource.id : undefined,
          department: selectedStudentForResource ? selectedStudentForResource.department : undefined,
          title: resTitle,
          fileUrl: resUrl || 'https://example.com/notes.pdf',
          fileType: 'PDF',
          category: resCategory,
          sharedByMentorId: mentorId,
          sharedByMentorName: mentorName,
        },
        actorId
      );
      setSelectedStudentForResource(null);
      setResTitle('');
      setResUrl('');
    } catch (err) {
      console.error('Failed to share resource:', err);
    } finally {
      setSharingResource(false);
    }
  };

  const filteredMentees = mentees.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.usn.toLowerCase().includes(search.toLowerCase());
    const matchesRisk = !riskFilter || s.riskLevel === riskFilter;
    return matchesSearch && matchesRisk;
  });

  return (
    <div className="space-y-6">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">My Assigned Mentees Directory</h2>
          <p className="text-xs text-slate-400 mt-1">Monitor academic performance, assign courses, and log guidance notes</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search mentee name or USN..."
            className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2.5 pl-9 pr-3 text-xs text-white focus:outline-none focus:border-indigo-500"
          />
        </div>
        <select
          value={riskFilter}
          onChange={(e) => setRiskFilter(e.target.value)}
          className="bg-slate-900 border border-slate-800 rounded-xl py-2.5 px-4 text-xs text-white focus:outline-none focus:border-indigo-500"
        >
          <option value="">All Performance Statuses</option>
          <option value="GOOD_PERFORMANCE">Good Performance</option>
          <option value="NEEDS_MONITORING">Needs Monitoring</option>
          <option value="HIGH_PRIORITY">High Priority</option>
        </select>
      </div>

      {/* Mentees Directory Table */}
      <div className="border border-slate-800 rounded-2xl bg-slate-900/80 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400">Loading mentees list...</div>
        ) : (
          <div className="overflow-x-auto no-scrollbar">
            <table className="w-full text-left border-collapse text-xs min-w-[660px]">
              <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase font-bold text-[11px] tracking-wider">
                <tr>
                  <th className="p-4">USN</th>
                  <th className="p-4">Student Name</th>
                  <th className="p-4">CGPA</th>
                  <th className="p-4">Attendance</th>
                  <th className="p-4">Performance Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {filteredMentees.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-800/40">
                    <td className="p-4 font-mono font-bold text-indigo-400">{s.usn}</td>
                    <td className="p-4 font-bold text-white">{s.name}</td>
                    <td className="p-4 font-bold text-indigo-300">{s.cgpa.toFixed(2)}</td>
                    <td className="p-4 font-bold">{s.attendance}%</td>
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
                    <td className="p-4 text-right whitespace-nowrap space-x-1.5">
                      <button
                        onClick={() => onViewStudent360(s.id)}
                        className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-600/30 transition-all inline-flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" /> 360° View
                      </button>
                      <button
                        onClick={() => setSelectedStudentForCourse(s)}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold border border-slate-700 transition-all inline-flex items-center gap-1"
                      >
                        <BookOpen className="w-3.5 h-3.5" /> Assign Course
                      </button>
                      <button
                        onClick={() => setSelectedStudentForResource(s)}
                        className="px-2.5 py-1.5 rounded-lg bg-purple-950/60 hover:bg-purple-900/80 text-purple-200 font-bold border border-purple-800/50 transition-all inline-flex items-center gap-1"
                      >
                        <Share2 className="w-3.5 h-3.5" /> Share Resource
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Assign Course Modal */}
      {selectedStudentForCourse && (
        <Modal
          isOpen={Boolean(selectedStudentForCourse)}
          onClose={() => setSelectedStudentForCourse(null)}
          title={`Assign Course — ${selectedStudentForCourse.name}`}
          subtitle="Recommend online course modules into student's learning plan"
        >
          <form onSubmit={handleAssignCourseSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-slate-300 mb-1">Course Title</label>
              <input
                type="text"
                required
                value={courseTitle}
                onChange={(e) => setCourseTitle(e.target.value)}
                placeholder="e.g. Advanced Data Structures & Algorithms"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-300 mb-1">Platform / Source</label>
              <input
                type="text"
                value={coursePlatform}
                onChange={(e) => setCoursePlatform(e.target.value)}
                placeholder="Coursera / Udemy / NPTEL"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-300 mb-1">Course URL</label>
              <input
                type="url"
                value={courseUrl}
                onChange={(e) => setCourseUrl(e.target.value)}
                placeholder="https://coursera.org/learn/example"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white"
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSelectedStudentForCourse(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={assigningCourse}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold"
              >
                {assigningCourse ? 'Assigning...' : 'Assign Course'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Share Resource Modal */}
      {selectedStudentForResource && (
        <Modal
          isOpen={Boolean(selectedStudentForResource)}
          onClose={() => setSelectedStudentForResource(null)}
          title={`Share Study Resource — ${selectedStudentForResource.name}`}
          subtitle="Share syllabus notes, references, or lab guides"
        >
          <form onSubmit={handleShareResourceSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-slate-300 mb-1">Resource Title</label>
              <input
                type="text"
                required
                value={resTitle}
                onChange={(e) => setResTitle(e.target.value)}
                placeholder="e.g. Unit 3 Computer Networks Lecture PDF"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-300 mb-1">Resource URL / File Link</label>
              <input
                type="url"
                value={resUrl}
                onChange={(e) => setResUrl(e.target.value)}
                placeholder="https://drive.google.com/..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-300 mb-1">Category</label>
              <select
                value={resCategory}
                onChange={(e: any) => setResCategory(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white"
              >
                <option value="Notes">Notes</option>
                <option value="Assignment">Assignment</option>
                <option value="Syllabus">Syllabus</option>
                <option value="Reference">Reference</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSelectedStudentForResource(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={sharingResource}
                className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold"
              >
                {sharingResource ? 'Sharing...' : 'Share Resource'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
