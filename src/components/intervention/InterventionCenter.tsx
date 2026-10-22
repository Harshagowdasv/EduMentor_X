import React, { useState, useEffect } from 'react';
import {
  InterventionRecord,
  Student,
  InterventionStatus,
  InterventionCategory,
  RiskLevel,
  FollowUpTask,
  Meeting
} from '../../types';
import { dbService } from '../../services/serviceFactory';
import { Modal } from '../common/Modal';
import {
  ShieldAlert,
  Plus,
  CheckCircle2,
  ArrowRight,
  Clock,
  AlertTriangle,
  Users,
  Calendar,
  CheckSquare,
  FileText,
  MessageSquare,
  XCircle,
  Tag
} from 'lucide-react';

interface InterventionCenterProps {
  mentorId: string;
  mentorName: string;
  onViewStudent360: (studentId: string) => void;
  actorId: string;
}

export const InterventionCenter: React.FC<InterventionCenterProps> = ({
  mentorId,
  mentorName,
  onViewStudent360,
  actorId,
}) => {
  const [interventions, setInterventions] = useState<InterventionRecord[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [followUpTasks, setFollowUpTasks] = useState<FollowUpTask[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [isInitiateModalOpen, setIsInitiateModalOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isMeetingModalOpen, setIsMeetingModalOpen] = useState(false);
  const [isResolveModalOpen, setIsResolveModalOpen] = useState(false);

  const [activeIntervention, setActiveIntervention] = useState<InterventionRecord | null>(null);

  // Form State: Initiate Intervention
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [category, setCategory] = useState<InterventionCategory>('Academic');
  const [priority, setPriority] = useState<RiskLevel>('HIGH_PRIORITY');
  const [description, setDescription] = useState('');
  const [triggerReasons, setTriggerReasons] = useState('Attendance deficit observed, CGPA decline recorded.');
  const [followUpDate, setFollowUpDate] = useState(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10)
  );

  // Form State: Create Task
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskDueDate, setTaskDueDate] = useState(
    new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10)
  );
  const [taskPriority, setTaskPriority] = useState<'HIGH' | 'MEDIUM' | 'LOW'>('HIGH');

  // Form State: Record Meeting/Contact
  const [meetingDate, setMeetingDate] = useState(new Date().toISOString().substring(0, 10));
  const [contactMethod, setContactMethod] = useState<'In-Person' | 'Online Video' | 'Phone Call' | 'Email / Message'>('In-Person');
  const [meetingNotes, setMeetingNotes] = useState('');
  const [meetingOutcome, setMeetingOutcome] = useState('');

  // Form State: Resolution
  const [outcomeNotes, setOutcomeNotes] = useState('');
  const [outcomeCgpa, setOutcomeCgpa] = useState<number | undefined>(undefined);
  const [outcomeAttendance, setOutcomeAttendance] = useState<number | undefined>(undefined);

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, [mentorId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [iList, stList, tList, mList] = await Promise.all([
        dbService.getInterventions({ mentorId }),
        dbService.getStudentsByMentorId(mentorId),
        dbService.getFollowUpTasks({ mentorId }),
        dbService.getMeetings({ mentorId }),
      ]);
      setInterventions(iList);
      setStudents(stList);
      setFollowUpTasks(tList);
      setMeetings(mList);
    } catch (err) {
      console.error('Failed to load intervention center data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Handler: Initiate New Intervention
  const handleInitiateIntervention = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId) return;
    setSaving(true);

    const st = students.find((s) => s.id === selectedStudentId);
    if (!st) return;

    try {
      await dbService.createIntervention(
        {
          studentId: st.id,
          studentName: st.name,
          studentUsn: st.usn,
          mentorId,
          mentorName,
          category,
          description,
          priority,
          triggerReasons: triggerReasons.split('\n').filter(Boolean),
          followUpDate,
          status: 'IDENTIFIED',
          actionsTaken: [`Initiated ${category} intervention workflow`],
          followUpTaskIds: [],
          baselineCgpa: st.cgpa,
          baselineAttendance: st.attendance,
        },
        actorId
      );
      setIsInitiateModalOpen(false);
      resetInitiateForm();
      await loadData();
    } catch (err) {
      console.error('Failed to initiate intervention:', err);
    } finally {
      setSaving(false);
    }
  };

  const resetInitiateForm = () => {
    setSelectedStudentId('');
    setCategory('Academic');
    setPriority('HIGH_PRIORITY');
    setDescription('');
    setTriggerReasons('Attendance deficit observed, CGPA decline recorded.');
  };

  // Handler: Advance Lifecycle Status
  const handleAdvanceStatus = async (interventionId: string, currentStatus: InterventionStatus) => {
    const statusOrder: InterventionStatus[] = [
      'IDENTIFIED',
      'CONTACT_PENDING',
      'MEETING_SCHEDULED',
      'IN_PROGRESS',
      'MONITORING',
      'RESOLVED',
      'CLOSED'
    ];
    const currentIdx = statusOrder.indexOf(currentStatus);
    if (currentIdx < statusOrder.length - 1) {
      const nextStatus = statusOrder[currentIdx + 1];
      await dbService.updateInterventionStatus(interventionId, nextStatus, undefined, undefined, undefined, actorId);
      await loadData();
    }
  };

  // Handler: Create Linked Follow-up Task
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeIntervention) return;
    setSaving(true);

    try {
      const newTask = await dbService.createFollowUpTask(
        {
          studentId: activeIntervention.studentId,
          studentName: activeIntervention.studentName,
          mentorId,
          mentorName,
          title: taskTitle,
          description: taskDesc,
          dueDate: taskDueDate,
          priority: taskPriority,
          interventionId: activeIntervention.id,
        },
        actorId
      );

      // Append task ID to intervention
      const updatedTaskIds = [...(activeIntervention.followUpTaskIds || []), newTask.id];
      await dbService.updateInterventionStatus(
        activeIntervention.id,
        activeIntervention.status,
        [...(activeIntervention.actionsTaken || []), `Created follow-up task: ${taskTitle}`],
        undefined,
        undefined,
        actorId
      );

      setIsTaskModalOpen(false);
      setTaskTitle('');
      setTaskDesc('');
      await loadData();
    } catch (err) {
      console.error('Failed to create follow-up task:', err);
    } finally {
      setSaving(false);
    }
  };

  // Handler: Record Meeting / Contact
  const handleRecordMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeIntervention) return;
    setSaving(true);

    try {
      const newMeeting = await dbService.createMeeting(
        {
          studentId: activeIntervention.studentId,
          studentName: activeIntervention.studentName,
          mentorId,
          mentorName,
          title: `Intervention Session (${contactMethod})`,
          date: meetingDate,
          time: '10:00 AM',
          agenda: `Intervention Contact: ${activeIntervention.category || 'Academic'}`,
          notes: meetingNotes,
        },
        actorId
      );

      // Update intervention status to MEETING_SCHEDULED or IN_PROGRESS
      const nextStatus =
        activeIntervention.status === 'IDENTIFIED' || activeIntervention.status === 'CONTACT_PENDING'
          ? 'MEETING_SCHEDULED'
          : activeIntervention.status;

      await dbService.updateInterventionStatus(
        activeIntervention.id,
        nextStatus,
        [...(activeIntervention.actionsTaken || []), `Recorded ${contactMethod} contact. Outcome: ${meetingOutcome}`],
        undefined,
        undefined,
        actorId
      );

      setIsMeetingModalOpen(false);
      setMeetingNotes('');
      setMeetingOutcome('');
      await loadData();
    } catch (err) {
      console.error('Failed to record meeting:', err);
    } finally {
      setSaving(false);
    }
  };

  // Handler: Resolve / Close Intervention
  const handleResolveIntervention = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeIntervention) return;
    setSaving(true);

    try {
      await dbService.updateInterventionStatus(
        activeIntervention.id,
        'RESOLVED',
        [...(activeIntervention.actionsTaken || []), `Resolved intervention. Outcome: ${outcomeNotes}`],
        outcomeCgpa,
        outcomeAttendance,
        actorId
      );

      setIsResolveModalOpen(false);
      setOutcomeNotes('');
      await loadData();
    } catch (err) {
      console.error('Failed to resolve intervention:', err);
    } finally {
      setSaving(false);
    }
  };

  // Handler: Toggle Task Status
  const handleToggleTaskStatus = async (taskId: string, currentStatus: FollowUpTask['status']) => {
    const nextStatus = currentStatus === 'COMPLETED' ? 'TODO' : 'COMPLETED';
    await dbService.updateTaskStatus(taskId, nextStatus);
    await loadData();
  };

  return (
    <div className="space-y-6 text-xs">
      {/* Top Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-6 rounded-2xl bg-gradient-to-r from-rose-950 via-slate-900 to-indigo-950 border border-rose-800/80 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-rose-600 text-white shadow-lg shadow-rose-600/40 shrink-0">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">Faculty Mentorship Intervention Center</h2>
            <p className="text-xs text-slate-300">
              End-to-end student risk detection, structured intervention lifecycles, and follow-up tracking
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsInitiateModalOpen(true)}
          className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-lg shadow-rose-600/30 flex items-center gap-2 self-start sm:self-auto shrink-0"
        >
          <Plus className="w-4 h-4" /> Initiate Student Intervention
        </button>
      </div>

      {/* Intervention Board Grid */}
      {loading ? (
        <div className="p-8 text-center text-xs text-slate-400">Loading intervention records...</div>
      ) : interventions.length === 0 ? (
        <div className="p-8 text-center text-xs text-slate-400 bg-slate-900 border border-slate-800 rounded-2xl">
          No active student interventions logged. All mentees are performing in Good Standing.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {interventions.map((interv) => {
            const linkedTasks = followUpTasks.filter((t) => t.interventionId === interv.id || t.studentId === interv.studentId);
            const isResolvedOrClosed = interv.status === 'RESOLVED' || interv.status === 'CLOSED';

            return (
              <div
                key={interv.id}
                className={`p-5 rounded-2xl bg-slate-900 border space-y-4 transition-colors ${
                  interv.status === 'RESOLVED'
                    ? 'border-emerald-800/60'
                    : interv.status === 'CLOSED'
                    ? 'border-slate-800'
                    : 'border-rose-800/80 shadow-rose-950/20'
                }`}
              >
                {/* Header info */}
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-bold text-white text-base flex items-center gap-2">
                      {interv.studentName} <span className="text-slate-400 text-xs font-mono">({interv.studentUsn})</span>
                    </h4>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-indigo-950 text-indigo-300 border border-indigo-800/80 flex items-center gap-1">
                        <Tag className="w-3 h-3" /> {interv.category || 'Academic'}
                      </span>
                      <span className="text-[10px] text-slate-400">Created: {interv.createdAt.substring(0, 10)}</span>
                    </div>
                  </div>

                  <span
                    className={`px-2.5 py-1 text-[10px] font-extrabold uppercase rounded-lg border ${
                      interv.status === 'RESOLVED'
                        ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                        : interv.status === 'CLOSED'
                        ? 'bg-slate-950 text-slate-400 border-slate-800'
                        : 'bg-rose-950 text-rose-300 border-rose-800'
                    }`}
                  >
                    {interv.status.replace('_', ' ')}
                  </span>
                </div>

                {/* Baseline Metrics vs Outcome */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="text-slate-400 block text-[10px]">Baseline CGPA</span>
                    <div className="flex items-baseline gap-2">
                      <span className="font-bold text-indigo-300 text-sm">{interv.baselineCgpa}</span>
                      {interv.outcomeCgpa && (
                        <span className="text-[10px] font-bold text-emerald-400">→ Outcome: {interv.outcomeCgpa}</span>
                      )}
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="text-slate-400 block text-[10px]">Baseline Attendance</span>
                    <div className="flex items-baseline gap-2">
                      <span className="font-bold text-rose-400 text-sm">{interv.baselineAttendance}%</span>
                      {interv.outcomeAttendance && (
                        <span className="text-[10px] font-bold text-emerald-400">→ Outcome: {interv.outcomeAttendance}%</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Trigger Reasons */}
                <div className="space-y-1">
                  <h5 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Trigger Reasons & Notes</h5>
                  {interv.description && (
                    <p className="text-xs text-white bg-slate-950 p-2.5 rounded-lg border border-slate-800">{interv.description}</p>
                  )}
                  {interv.triggerReasons &&
                    interv.triggerReasons.map((r, idx) => (
                      <p key={idx} className="text-xs text-slate-300 bg-slate-950 p-2 rounded-lg border border-slate-800/80">
                        • {r}
                      </p>
                    ))}
                </div>

                {/* Follow-up Tasks Section */}
                {linkedTasks.length > 0 && (
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                    <h5 className="text-[10px] font-bold uppercase text-slate-400 flex items-center justify-between">
                      <span>Linked Follow-up Tasks ({linkedTasks.length})</span>
                    </h5>
                    <div className="space-y-1.5">
                      {linkedTasks.map((t) => {
                        const isOverdue = t.status !== 'COMPLETED' && new Date(t.dueDate) < new Date();
                        return (
                          <div
                            key={t.id}
                            className="flex items-center justify-between p-2 rounded-lg bg-slate-900 border border-slate-800/80"
                          >
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={t.status === 'COMPLETED'}
                                onChange={() => handleToggleTaskStatus(t.id, t.status)}
                                className="rounded text-indigo-600 focus:ring-0"
                              />
                              <span className={`text-xs ${t.status === 'COMPLETED' ? 'line-through text-slate-500' : 'text-slate-200 font-bold'}`}>
                                {t.title}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-slate-400 font-mono">Due: {t.dueDate}</span>
                              {isOverdue && (
                                <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase rounded bg-rose-950 text-rose-300 border border-rose-800">
                                  OVERDUE
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Action Buttons & Lifecycle Advancement */}
                <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onViewStudent360(interv.studentId)}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs"
                    >
                      Inspect 360°
                    </button>

                    {!isResolvedOrClosed && (
                      <>
                        <button
                          onClick={() => {
                            setActiveIntervention(interv);
                            setIsTaskModalOpen(true);
                          }}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-indigo-300 font-bold text-xs flex items-center gap-1"
                        >
                          <Plus className="w-3.5 h-3.5" /> Task
                        </button>

                        <button
                          onClick={() => {
                            setActiveIntervention(interv);
                            setIsMeetingModalOpen(true);
                          }}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-purple-300 font-bold text-xs flex items-center gap-1"
                        >
                          <Calendar className="w-3.5 h-3.5" /> Contact/Meeting
                        </button>
                      </>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {!isResolvedOrClosed ? (
                      <>
                        <button
                          onClick={() => handleAdvanceStatus(interv.id, interv.status)}
                          className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1 shadow-md"
                        >
                          Advance Status <ArrowRight className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => {
                            setActiveIntervention(interv);
                            setIsResolveModalOpen(true);
                          }}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1 shadow-md"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" /> Resolve
                        </button>
                      </>
                    ) : (
                      <span className="text-[10px] text-emerald-400 font-bold uppercase flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4" /> Intervention Resolved
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL 1: INITIATE INTERVENTION */}
      <Modal isOpen={isInitiateModalOpen} onClose={() => setIsInitiateModalOpen(false)} title="Initiate Student Intervention Workflow">
        <form onSubmit={handleInitiateIntervention} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-300 mb-1">Select Student</label>
            <select
              required
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white"
            >
              <option value="">Select Mentee...</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.usn}) — CGPA {s.cgpa}, Attendance {s.attendance}%
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-300 mb-1">Intervention Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as InterventionCategory)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white"
              >
                <option value="Academic">Academic Performance</option>
                <option value="Attendance">Attendance Deficit</option>
                <option value="Backlog">Backlog Clearing Strategy</option>
                <option value="Study Discipline">Study Discipline / Hours</option>
                <option value="Financial">Financial Assistance Need</option>
                <option value="Career">Career / Placement Readiness</option>
                <option value="General Support">General Support</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-300 mb-1">Priority Level</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as RiskLevel)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white"
              >
                <option value="HIGH_PRIORITY">High Priority</option>
                <option value="NEEDS_MONITORING">Needs Monitoring</option>
                <option value="GOOD_PERFORMANCE">Good Standing</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-300 mb-1">Detailed Description & Context</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide context on why this intervention is being initiated..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white h-20"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-300 mb-1">Trigger Reasons (One per line)</label>
            <textarea
              required
              value={triggerReasons}
              onChange={(e) => setTriggerReasons(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white h-20"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-300 mb-1">Target Follow-Up Date</label>
            <input
              type="date"
              required
              value={followUpDate}
              onChange={(e) => setFollowUpDate(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsInitiateModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold"
            >
              {saving ? 'Initiating...' : 'Initiate Intervention'}
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: CREATE FOLLOW-UP TASK */}
      <Modal isOpen={isTaskModalOpen} onClose={() => setIsTaskModalOpen(false)} title="Create Follow-up Action Task">
        <form onSubmit={handleCreateTask} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-300 mb-1">Task Title</label>
            <input
              type="text"
              required
              placeholder="e.g. Schedule remedial math tutoring session"
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-300 mb-1">Description / Instructions</label>
            <textarea
              value={taskDesc}
              onChange={(e) => setTaskDesc(e.target.value)}
              placeholder="Action details and instructions for mentee..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white h-20"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-300 mb-1">Due Date</label>
              <input
                type="date"
                required
                value={taskDueDate}
                onChange={(e) => setTaskDueDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-300 mb-1">Task Priority</label>
              <select
                value={taskPriority}
                onChange={(e) => setTaskPriority(e.target.value as 'HIGH' | 'MEDIUM' | 'LOW')}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white"
              >
                <option value="HIGH">High Priority</option>
                <option value="MEDIUM">Medium Priority</option>
                <option value="LOW">Low Priority</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsTaskModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold"
            >
              Cancel
            </button>
            <button type="submit" disabled={saving} className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold">
              {saving ? 'Creating...' : 'Create Follow-up Task'}
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL 3: RECORD MEETING / CONTACT */}
      <Modal isOpen={isMeetingModalOpen} onClose={() => setIsMeetingModalOpen(false)} title="Record Mentor Contact / Meeting">
        <form onSubmit={handleRecordMeeting} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-300 mb-1">Contact Date</label>
              <input
                type="date"
                required
                value={meetingDate}
                onChange={(e) => setMeetingDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-300 mb-1">Contact Method</label>
              <select
                value={contactMethod}
                onChange={(e) =>
                  setContactMethod(e.target.value as 'In-Person' | 'Online Video' | 'Phone Call' | 'Email / Message')
                }
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white"
              >
                <option value="In-Person">In-Person Meeting</option>
                <option value="Online Video">Online Video Session</option>
                <option value="Phone Call">Phone Call</option>
                <option value="Email / Message">Email / Official Messaging</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-300 mb-1">Meeting Notes & Discussion Summary</label>
            <textarea
              required
              value={meetingNotes}
              onChange={(e) => setMeetingNotes(e.target.value)}
              placeholder="Record key items discussed during the mentorship session..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white h-24"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-300 mb-1">Agreed Outcome / Next Steps</label>
            <input
              type="text"
              value={meetingOutcome}
              onChange={(e) => setMeetingOutcome(e.target.value)}
              placeholder="e.g. Student committed to 12h weekly study schedule"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsMeetingModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold"
            >
              Cancel
            </button>
            <button type="submit" disabled={saving} className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold">
              {saving ? 'Recording...' : 'Record Contact'}
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL 4: RESOLVE INTERVENTION */}
      <Modal isOpen={isResolveModalOpen} onClose={() => setIsResolveModalOpen(false)} title="Resolve Student Intervention">
        <form onSubmit={handleResolveIntervention} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-300 mb-1">Resolution & Outcome Notes</label>
            <textarea
              required
              value={outcomeNotes}
              onChange={(e) => setOutcomeNotes(e.target.value)}
              placeholder="Record overall outcome and progress achieved..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white h-24"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-300 mb-1">Final Outcome CGPA (Optional)</label>
              <input
                type="number"
                step="0.01"
                placeholder={activeIntervention ? String(activeIntervention.baselineCgpa) : '8.0'}
                value={outcomeCgpa || ''}
                onChange={(e) => setOutcomeCgpa(e.target.value ? Number(e.target.value) : undefined)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-300 mb-1">Final Outcome Attendance % (Optional)</label>
              <input
                type="number"
                placeholder={activeIntervention ? String(activeIntervention.baselineAttendance) : '85'}
                value={outcomeAttendance || ''}
                onChange={(e) => setOutcomeAttendance(e.target.value ? Number(e.target.value) : undefined)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsResolveModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold"
            >
              Cancel
            </button>
            <button type="submit" disabled={saving} className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold">
              {saving ? 'Resolving...' : 'Mark Resolved'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
