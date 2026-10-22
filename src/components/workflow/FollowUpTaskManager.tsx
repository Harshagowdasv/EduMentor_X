import React, { useState, useEffect } from 'react';
import { FollowUpTask, Student } from '../../types';
import { dbService } from '../../services/serviceFactory';
import { Modal } from '../common/Modal';
import { CheckSquare, Plus, Clock, AlertCircle, CheckCircle2, UserCheck } from 'lucide-react';

interface FollowUpTaskManagerProps {
  userRole: 'admin' | 'mentor' | 'student';
  userId: string;
  userName: string;
}

export const FollowUpTaskManager: React.FC<FollowUpTaskManagerProps> = ({ userRole, userId, userName }) => {
  const [tasks, setTasks] = useState<FollowUpTask[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState<'HIGH' | 'MEDIUM' | 'LOW'>('HIGH');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadTasks();
  }, [userId, userRole]);

  const loadTasks = async () => {
    setLoading(true);
    try {
      const filter = userRole === 'student' ? { studentId: userId } : userRole === 'mentor' ? { mentorId: userId } : {};
      const [tList, stRes] = await Promise.all([
        dbService.getFollowUpTasks(filter),
        userRole !== 'student' ? dbService.getStudents(1, 200) : Promise.resolve({ students: [] }),
      ]);
      setTasks(tList);
      setStudents(stRes.students);
    } catch (err) {
      console.error('Failed to load tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId || !title || !dueDate) return;
    setSaving(true);

    const st = students.find((s) => s.id === selectedStudentId);

    try {
      await dbService.createFollowUpTask(
        {
          studentId: selectedStudentId,
          studentName: st ? st.name : 'Student',
          mentorId: userId,
          mentorName: userName,
          title,
          description,
          dueDate,
          priority,
        },
        userId
      );
      setIsModalOpen(false);
      setTitle('');
      setDescription('');
      await loadTasks();
    } catch (err) {
      console.error('Failed to create task:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleStatusToggle = async (taskId: string, currentStatus: FollowUpTask['status']) => {
    const nextStatus = currentStatus === 'COMPLETED' ? 'IN_PROGRESS' : 'COMPLETED';
    await dbService.updateTaskStatus(taskId, nextStatus);
    await loadTasks();
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-indigo-400" />
            Student Action & Follow-Up Task Tracker
          </h2>
          <p className="text-xs text-slate-400 mt-1">Assign remedial tasks, practice problems, and track completion progress</p>
        </div>

        {userRole !== 'student' && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Create Follow-Up Task
          </button>
        )}
      </div>

      {/* Task Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {tasks.map((task) => (
          <div key={task.id} className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
            <div className="flex items-start justify-between">
              <span
                className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded ${
                  task.priority === 'HIGH' ? 'bg-rose-950 text-rose-400 border border-rose-800' : 'bg-slate-800 text-slate-300'
                }`}
              >
                {task.priority} Priority
              </span>
              <span
                className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded ${
                  task.status === 'COMPLETED'
                    ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                    : task.status === 'OVERDUE'
                    ? 'bg-rose-950 text-rose-400 border border-rose-800'
                    : 'bg-indigo-950 text-indigo-300 border border-indigo-800'
                }`}
              >
                {task.status}
              </span>
            </div>

            <div>
              <h4 className="font-bold text-white text-sm leading-snug">{task.title}</h4>
              {task.description && <p className="text-xs text-slate-400 mt-1">{task.description}</p>}
            </div>

            <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
              <span className="text-slate-400">Due: <strong className="text-white">{task.dueDate}</strong></span>
              <button
                onClick={() => handleStatusToggle(task.id, task.status)}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-[11px] font-bold flex items-center gap-1"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                {task.status === 'COMPLETED' ? 'Mark Pending' : 'Mark Completed'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Assign Follow-Up Task to Student">
        <form onSubmit={handleCreateTask} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-300 mb-1">Select Student</label>
            <select
              required
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white"
            >
              <option value="">Select Student...</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.usn})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-300 mb-1">Task Title</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Complete LeetCode Graph Theory Problem Set"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-300 mb-1">Description & Instructions</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide specific guidelines or problem links..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white h-20"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-300 mb-1">Due Date</label>
              <input
                type="date"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-300 mb-1">Priority</label>
              <select
                value={priority}
                onChange={(e: any) => setPriority(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white"
              >
                <option value="HIGH">High Priority</option>
                <option value="MEDIUM">Medium Priority</option>
                <option value="LOW">Low Priority</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold">
              {saving ? 'Creating...' : 'Assign Task'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
