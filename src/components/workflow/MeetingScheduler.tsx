import React, { useState, useEffect } from 'react';
import { Meeting, Student, Mentor } from '../../types';
import { dbService } from '../../services/serviceFactory';
import { Modal } from '../common/Modal';
import { Calendar, Clock, Plus, CheckCircle2, XCircle, RefreshCw, UserCheck, FileText, User } from 'lucide-react';

interface MeetingSchedulerProps {
  userRole: 'admin' | 'mentor' | 'student';
  userId: string;
  userName: string;
}

export const MeetingScheduler: React.FC<MeetingSchedulerProps> = ({ userRole, userId, userName }) => {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [assignedMentor, setAssignedMentor] = useState<Mentor | null>(null);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('11:00');
  const [agenda, setAgenda] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadMeetings();
  }, [userId, userRole]);

  const loadMeetings = async () => {
    setLoading(true);
    try {
      const filter = userRole === 'student' ? { studentId: userId } : userRole === 'mentor' ? { mentorId: userId } : {};
      const [mList, stRes, studentSelf] = await Promise.all([
        dbService.getMeetings(filter),
        userRole !== 'student' ? dbService.getStudents(1, 200) : Promise.resolve({ students: [] }),
        userRole === 'student' ? dbService.getStudentById(userId) : Promise.resolve(null),
      ]);
      setMeetings(mList);
      setStudents(stRes.students);

      if (studentSelf && studentSelf.mentorId) {
        const mentors = await dbService.getMentors();
        const m = mentors.find((x) => x.id === studentSelf.mentorId || x.userId === studentSelf.mentorId);
        if (m) {
          setAssignedMentor(m);
        } else if (studentSelf.mentorName) {
          setAssignedMentor({
            id: studentSelf.mentorId,
            userId: studentSelf.mentorId,
            name: studentSelf.mentorName,
            email: studentSelf.mentorEmail || '',
            phone: '',
            department: studentSelf.department || '',
            staffId: '',
            activeMenteesCount: 1,
            status: 'active',
            createdAt: new Date().toISOString(),
          });
        }
      }
    } catch (err) {
      console.error('Failed to load meetings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !date) return;
    setSaving(true);

    try {
      if (userRole === 'student') {
        await dbService.createMeeting(
          {
            studentId: userId,
            studentName: userName,
            mentorId: assignedMentor ? assignedMentor.id : 'm4',
            mentorName: assignedMentor ? assignedMentor.name : 'Faculty Mentor',
            title,
            date,
            time,
            agenda,
          },
          userId
        );
      } else {
        if (!selectedStudentId) return;
        const st = students.find((s) => s.id === selectedStudentId);
        await dbService.createMeeting(
          {
            studentId: selectedStudentId,
            studentName: st ? st.name : 'Student',
            mentorId: userId,
            mentorName: userName,
            title,
            date,
            time,
            agenda,
          },
          userId
        );
      }
      setIsModalOpen(false);
      setTitle('');
      setAgenda('');
      await loadMeetings();
    } catch (err) {
      console.error('Failed to create meeting:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateStatus = async (meetingId: string, status: Meeting['status']) => {
    await dbService.updateMeetingStatus(meetingId, status);
    await loadMeetings();
  };

  const todayStr = new Date().toISOString().substring(0, 10);
  const upcomingMeetings = meetings.filter((m) => m.status === 'upcoming');
  const todayMeetings = meetings.filter((m) => m.date === todayStr && m.status === 'upcoming');
  const completedMeetings = meetings.filter((m) => m.status === 'completed');

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Calendar className="w-5 h-5 text-indigo-400" />
            Mentor-Student Meeting Scheduler
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {userRole === 'student'
              ? 'View upcoming sessions and schedule guidance appointments with your mentor'
              : 'Schedule, review, and track guidance sessions with your mentees'}
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:opacity-95 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 shrink-0"
        >
          <Plus className="w-4 h-4" />
          {userRole === 'student' ? 'Request Meeting with Mentor' : 'Schedule New Meeting'}
        </button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <p className="text-xs text-slate-400">Upcoming Meetings</p>
          <p className="text-2xl font-bold text-white mt-1">{upcomingMeetings.length}</p>
        </div>
        <div className="p-4 rounded-xl bg-indigo-950/60 border border-indigo-800/60">
          <p className="text-xs text-indigo-300 font-semibold">Today's Sessions</p>
          <p className="text-2xl font-bold text-white mt-1">{todayMeetings.length}</p>
        </div>
        <div className="p-4 rounded-xl bg-emerald-950/60 border border-emerald-800/60">
          <p className="text-xs text-emerald-400 font-semibold">Completed Meetings</p>
          <p className="text-2xl font-bold text-white mt-1">{completedMeetings.length}</p>
        </div>
        <div className="p-4 rounded-xl bg-amber-950/60 border border-amber-800/60">
          <p className="text-xs text-amber-400 font-semibold">Total Sessions</p>
          <p className="text-2xl font-bold text-white mt-1">{meetings.length}</p>
        </div>
      </div>

      {/* Meetings List */}
      <div className="border border-slate-800 rounded-2xl bg-slate-900/80 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400">Loading meetings...</div>
        ) : meetings.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">No scheduled meetings found.</div>
        ) : (
          <div className="divide-y divide-slate-800/60">
            {meetings.map((m) => (
              <div key={m.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-800/40">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-xl bg-indigo-950 text-indigo-400 border border-indigo-800/60 shrink-0">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-3">
                      <h4 className="font-bold text-white text-sm">{m.title}</h4>
                      <span
                        className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded ${
                          m.status === 'completed'
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                            : 'bg-indigo-950 text-indigo-300 border border-indigo-800'
                        }`}
                      >
                        {m.status}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400 mt-1">
                      <span className="flex items-center gap-1 font-mono">
                        <Clock className="w-3.5 h-3.5 text-indigo-400" />
                        {m.date} at {m.time}
                      </span>
                      <span>•</span>
                      <span>
                        Student: <strong className="text-white">{m.studentName}</strong>
                      </span>
                      <span>•</span>
                      <span>
                        Mentor: <strong className="text-white">{m.mentorName}</strong>
                      </span>
                    </div>

                    {m.agenda && (
                      <p className="text-xs text-slate-300 mt-2 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80">
                        {m.agenda}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                  {m.status === 'upcoming' && (
                    <button
                      onClick={() => handleUpdateStatus(m.id, 'completed')}
                      className="px-3 py-1.5 rounded-lg bg-emerald-950 hover:bg-emerald-900 border border-emerald-800 text-emerald-300 text-xs font-bold flex items-center gap-1.5 transition-all"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" /> Mark Completed
                    </button>
                  )}
                  {m.status === 'completed' && (
                    <button
                      onClick={() => handleUpdateStatus(m.id, 'upcoming')}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold flex items-center gap-1.5 transition-all"
                    >
                      <RefreshCw className="w-3.5 h-3.5" /> Re-open
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal: Schedule Meeting */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={userRole === 'student' ? 'Request Mentorship Session' : 'Schedule Mentorship Session'}>
        <form onSubmit={handleCreateMeeting} className="space-y-4 text-xs">
          {userRole !== 'student' ? (
            <div>
              <label className="block font-bold text-slate-300 mb-1">Select Mentee</label>
              <select
                required
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white"
              >
                <option value="">Select Student...</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.usn}) — CGPA {s.cgpa}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-3">
              <UserCheck className="w-5 h-5 text-indigo-400 shrink-0" />
              <div>
                <p className="text-slate-400 text-[11px]">Scheduling Session with Mentor:</p>
                <p className="text-white font-bold text-xs">{assignedMentor ? assignedMentor.name : 'Faculty Mentor'}</p>
              </div>
            </div>
          )}

          <div>
            <label className="block font-bold text-slate-300 mb-1">Meeting Title</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Semester Progress & Research Paper Review"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-300 mb-1">Date</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-300 mb-1">Time</label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-300 mb-1">Agenda & Notes</label>
            <textarea
              value={agenda}
              onChange={(e) => setAgenda(e.target.value)}
              placeholder="Topics to cover during the guidance session..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white h-20"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold">
              {saving ? 'Scheduling...' : 'Confirm Meeting'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
