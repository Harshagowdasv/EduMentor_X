import React, { useState, useEffect } from 'react';
import { StudentGoal } from '../../types';
import { dbService } from '../../services/serviceFactory';
import { Modal } from '../common/Modal';
import { Target, Plus, CheckCircle2, Award, Calendar, TrendingUp } from 'lucide-react';

interface StudentGoalTrackerProps {
  studentId: string;
  userRole: 'admin' | 'mentor' | 'student';
}

export const StudentGoalTracker: React.FC<StudentGoalTrackerProps> = ({ studentId, userRole }) => {
  const [goals, setGoals] = useState<StudentGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [title, setTitle] = useState('');
  const [type, setType] = useState<StudentGoal['type']>('academic');
  const [targetValue, setTargetValue] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadGoals();
  }, [studentId]);

  const loadGoals = async () => {
    setLoading(true);
    try {
      const list = await dbService.getStudentGoals(studentId);
      setGoals(list);
    } catch (err) {
      console.error('Failed to load student goals:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !targetValue || !targetDate) return;
    setSaving(true);

    try {
      await dbService.createStudentGoal({
        studentId,
        title,
        type,
        targetValue,
        targetDate,
        currentProgress: 10,
        status: 'active',
      });
      setIsModalOpen(false);
      setTitle('');
      setTargetValue('');
      await loadGoals();
    } catch (err) {
      console.error('Failed to create goal:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateProgress = async (goalId: string, currentProgress: number) => {
    await dbService.updateStudentGoal(goalId, { currentProgress });
    await loadGoals();
  };

  return (
    <div className="p-4 sm:p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
            <Target className="w-5 h-5 text-indigo-400 shrink-0" />
            Academic, Career & Coding Goal Tracker
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">Set milestones, monitor progress, and get faculty mentor feedback</p>
        </div>

        {userRole === 'student' && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-indigo-600/30 self-start sm:self-auto shrink-0"
          >
            <Plus className="w-4 h-4" /> Add New Goal
          </button>
        )}
      </div>

      {loading ? (
        <div className="p-4 text-center text-xs text-slate-400">Loading goals...</div>
      ) : goals.length === 0 ? (
        <div className="p-6 text-center text-xs text-slate-400">No personal goals recorded yet.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {goals.map((g) => (
            <div key={g.id} className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
              <div className="flex items-start justify-between">
                <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-indigo-950 text-indigo-300 border border-indigo-800">
                  {g.type}
                </span>
                <span className="text-xs font-bold text-slate-400">Target: <strong className="text-white">{g.targetValue}</strong></span>
              </div>

              <div>
                <h4 className="font-bold text-white text-sm">{g.title}</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">Target Date: {g.targetDate}</p>
              </div>

              {/* Progress Bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-400">Progress</span>
                  <span className="font-bold text-indigo-300">{g.currentProgress}%</span>
                </div>
                <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800">
                  <div
                    className="bg-gradient-to-r from-indigo-500 to-purple-500 h-full rounded-full transition-all duration-300"
                    style={{ width: `${g.currentProgress}%` }}
                  />
                </div>
              </div>

              {g.mentorRecommendation && (
                <p className="text-[11px] text-indigo-300 bg-indigo-950/40 p-2 rounded-lg border border-indigo-900/60">
                  Mentor Advice: "{g.mentorRecommendation}"
                </p>
              )}

              {userRole === 'student' && g.status === 'active' && (
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={g.currentProgress}
                    onChange={(e) => handleUpdateProgress(g.id, Number(e.target.value))}
                    className="w-full accent-indigo-500"
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Add Personal Goal">
        <form onSubmit={handleCreateGoal} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-300 mb-1">Goal Type</label>
            <select
              value={type}
              onChange={(e: any) => setType(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white"
            >
              <option value="academic">Academic (CGPA / Grades)</option>
              <option value="career">Career (Internship / Certification)</option>
              <option value="coding">Coding (LeetCode / GitHub)</option>
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-300 mb-1">Goal Title</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Achieve CGPA 9.0+ in Semester 6"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-300 mb-1">Target Benchmark</label>
              <input
                type="text"
                required
                value={targetValue}
                onChange={(e) => setTargetValue(e.target.value)}
                placeholder="e.g. CGPA 9.0+ or 150 Problems"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-300 mb-1">Target Completion Date</label>
              <input
                type="date"
                required
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold">
              {saving ? 'Saving...' : 'Create Goal'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
