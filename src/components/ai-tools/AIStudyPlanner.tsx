import React, { useState, useEffect } from 'react';
import { StudyPlan, Student } from '../../types';
import { dbService } from '../../services/serviceFactory';
import { Calendar, Sparkles, Clock, CheckCircle2, RefreshCw, BookOpen, Save } from 'lucide-react';

interface AIStudyPlannerProps {
  student: Student;
}

export const AIStudyPlanner: React.FC<AIStudyPlannerProps> = ({ student }) => {
  const [studyPlan, setStudyPlan] = useState<StudyPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  // Input Form State
  const [examDate, setExamDate] = useState('2026-09-25');
  const [subjectsStr, setSubjectsStr] = useState('Computer Networks, Operating Systems, System Design');
  const [availableHours, setAvailableHours] = useState(4);
  const [targetScore, setTargetScore] = useState('Grade A+');

  useEffect(() => {
    loadStudyPlan();
  }, [student.id]);

  const loadStudyPlan = async () => {
    setLoading(true);
    try {
      const plan = await dbService.getStudyPlan(student.id);
      setStudyPlan(plan);
    } catch (err) {
      console.error('Failed to load study plan:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePlan = async () => {
    setGenerating(true);
    try {
      const subjects = subjectsStr.split(',').map((s) => s.trim()).filter(Boolean);

      // Deterministic AI Study Planner Engine
      const mockDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
      const planDays = mockDays.map((day, idx) => {
        const sub = subjects[idx % subjects.length] || 'Revision';
        return {
          day,
          schedule: [
            {
              timeSlot: '18:00 - 19:15',
              subject: sub,
              topic: `${sub} — Key Principles & Practice Problems`,
              completed: false,
            },
            {
              timeSlot: '19:30 - 20:30',
              subject: subjects[(idx + 1) % subjects.length] || 'General Revision',
              topic: 'Core Concept Revision & Quiz Prep',
              completed: false,
            },
          ],
        };
      });

      const newPlan = await dbService.saveStudyPlan({
        studentId: student.id,
        examDate,
        subjects,
        availableHoursPerDay: availableHours,
        targetScore,
        planDays,
      });

      setStudyPlan(newPlan);
    } catch (err) {
      console.error('Failed to generate study plan:', err);
    } finally {
      setGenerating(false);
    }
  };

  const toggleScheduleItem = async (dayIndex: number, itemIndex: number) => {
    if (!studyPlan) return;
    const updatedDays = [...studyPlan.planDays];
    const targetItem = updatedDays[dayIndex].schedule[itemIndex];
    targetItem.completed = !targetItem.completed;

    const updatedPlan = await dbService.saveStudyPlan({
      ...studyPlan,
      planDays: updatedDays,
    });
    setStudyPlan(updatedPlan);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="p-4 sm:p-6 rounded-2xl bg-gradient-to-r from-indigo-950 via-slate-900 to-purple-950 border border-indigo-800/80 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 sm:p-3 rounded-xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/40 shrink-0">
              <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 animate-pulse" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">AI Personalized Daily Study Planner</h2>
              <p className="text-xs text-slate-300">Generates optimal study routines tailored to your exam target and available hours</p>
            </div>
          </div>

          <button
            onClick={handleGeneratePlan}
            disabled={generating}
            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition-all self-start sm:self-auto shrink-0"
          >
            <RefreshCw className={`w-4 h-4 ${generating ? 'animate-spin' : ''}`} />
            {generating ? 'Generating AI Schedule...' : 'Generate New Study Plan'}
          </button>
        </div>

        {/* Input Parameters Form */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-800/80 text-xs">
          <div>
            <label className="block text-[11px] font-bold text-slate-400 mb-1">Target Exam Date</label>
            <input
              type="date"
              value={examDate}
              onChange={(e) => setExamDate(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-white"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-[11px] font-bold text-slate-400 mb-1">Target Subjects (Comma Separated)</label>
            <input
              type="text"
              value={subjectsStr}
              onChange={(e) => setSubjectsStr(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-white"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-400 mb-1">Available Hours / Day</label>
            <input
              type="number"
              min="1"
              max="12"
              value={availableHours}
              onChange={(e) => setAvailableHours(Number(e.target.value) || 4)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-white"
            />
          </div>
        </div>
      </div>

      {/* Generated Study Schedule Days */}
      {loading ? (
        <div className="p-8 text-center text-xs text-slate-400">Loading AI Study Plan...</div>
      ) : !studyPlan ? (
        <div className="p-8 text-center text-xs text-slate-400 bg-slate-900 border border-slate-800 rounded-2xl">
          Click "Generate New Study Plan" above to create your structured exam schedule.
        </div>
      ) : (
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Calendar className="w-4 h-4 text-indigo-400" /> Weekly AI Study Schedule (Target: {studyPlan.targetScore})
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {studyPlan.planDays.map((pd, dayIdx) => (
              <div key={dayIdx} className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
                <h4 className="font-bold text-indigo-300 text-xs border-b border-slate-800 pb-2 flex items-center justify-between">
                  <span>{pd.day} Schedule</span>
                  <span className="text-[10px] text-slate-500 font-normal">{pd.schedule.length} Sessions</span>
                </h4>

                <div className="space-y-2">
                  {pd.schedule.map((item, itemIdx) => (
                    <div
                      key={itemIdx}
                      onClick={() => toggleScheduleItem(dayIdx, itemIdx)}
                      className={`p-3 rounded-xl border text-xs cursor-pointer transition-all flex items-start gap-3 ${
                        item.completed
                          ? 'bg-emerald-950/30 border-emerald-800/60 opacity-80'
                          : 'bg-slate-950 border-slate-800/80 hover:border-slate-700'
                      }`}
                    >
                      <button className="mt-0.5 shrink-0">
                        <CheckCircle2 className={`w-4 h-4 ${item.completed ? 'text-emerald-400 fill-emerald-950' : 'text-slate-600'}`} />
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-white text-xs">{item.subject}</span>
                          <span className="text-[10px] text-slate-400 font-mono">{item.timeSlot}</span>
                        </div>
                        <p className={`text-[11px] mt-0.5 ${item.completed ? 'line-through text-slate-500' : 'text-slate-300'}`}>
                          {item.topic}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
