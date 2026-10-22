import React, { useState, useEffect } from 'react';
import { AISafetyAlert } from '../../types';
import { dbService } from '../../services/serviceFactory';
import { Modal } from '../common/Modal';
import { ShieldAlert, AlertTriangle, CheckCircle2, Clock, Eye, Lock, MessageSquare } from 'lucide-react';

interface AISafetyAlertsDashboardProps {
  mentorId?: string;
  actorId: string;
}

export const AISafetyAlertsDashboard: React.FC<AISafetyAlertsDashboardProps> = ({ mentorId, actorId }) => {
  const [alerts, setAlerts] = useState<AISafetyAlert[]>([]);
  const [loading, setLoading] = useState(true);

  // Review Modal State
  const [selectedAlert, setSelectedAlert] = useState<AISafetyAlert | null>(null);
  const [statusInput, setStatusInput] = useState<AISafetyAlert['status']>('REVIEWING');
  const [reviewerNotes, setReviewerNotes] = useState('');
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    loadAlerts();
  }, [mentorId]);

  const loadAlerts = async () => {
    setLoading(true);
    try {
      const list = await dbService.getAISafetyAlerts(mentorId);
      setAlerts(list);
    } catch (err) {
      console.error('Failed to load AI safety alerts:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAlert) return;
    setUpdating(true);

    try {
      await dbService.updateAISafetyAlertStatus(
        selectedAlert.id,
        statusInput,
        reviewerNotes,
        actorId
      );
      setSelectedAlert(null);
      setReviewerNotes('');
      await loadAlerts();
    } catch (err) {
      console.error('Failed to update alert status:', err);
    } finally {
      setUpdating(false);
    }
  };

  const newCount = alerts.filter((a) => a.status === 'NEW').length;

  return (
    <div className="space-y-6">
      {/* Confidential Warning Header */}
      <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-800/60 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-rose-950 text-rose-400 border border-rose-800">
            <ShieldAlert className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white">Confidential AI Safety Escalation Portal</h2>
              {newCount > 0 && (
                <span className="px-2 py-0.5 text-xs font-bold bg-rose-600 text-white rounded-full">
                  {newCount} New Alerts
                </span>
              )}
            </div>
            <p className="text-xs text-rose-200/80 mt-0.5">
              Restricted to authorized faculty mentors and administrators. Never exposed to student views.
            </p>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-1.5 text-xs text-rose-300 font-mono">
          <Lock className="w-4 h-4 text-rose-400" /> Immutable Audit Protocol
        </div>
      </div>

      {/* Alerts Table */}
      <div className="border border-slate-800 rounded-2xl bg-slate-900/80 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400">Loading safety escalation alerts...</div>
        ) : alerts.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">
            No confidential AI safety alerts logged for your assigned mentees.
          </div>
        ) : (
          <div className="overflow-x-auto no-scrollbar">
            <table className="w-full text-left border-collapse text-xs min-w-[650px]">
              <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase font-bold text-[11px] tracking-wider">
                <tr>
                  <th className="p-4">Timestamp</th>
                  <th className="p-4">Student</th>
                  <th className="p-4">Severity Triage</th>
                  <th className="p-4">Contextual Summary</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {alerts.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-800/40">
                    <td className="p-4 text-slate-400 font-mono">{new Date(a.timestamp).toLocaleString()}</td>
                    <td className="p-4">
                      <p className="font-bold text-white text-xs">{a.studentName}</p>
                      <p className="text-[10px] text-indigo-400 font-mono">{a.studentUsn}</p>
                    </td>
                    <td className="p-4">
                      <span
                        className={`px-2.5 py-0.5 rounded text-[10px] font-bold border ${
                          a.severity === 'IMMEDIATE_DANGER'
                            ? 'bg-rose-950 text-rose-300 border-rose-700/60 animate-pulse'
                            : 'bg-amber-950 text-amber-300 border-amber-700/60'
                        }`}
                      >
                        {a.severity}
                      </span>
                    </td>
                    <td className="p-4 max-w-xs truncate text-slate-300">{a.contextSummary}</td>
                    <td className="p-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          a.status === 'NEW'
                            ? 'bg-rose-600 text-white'
                            : a.status === 'REVIEWING'
                            ? 'bg-amber-600 text-white'
                            : a.status === 'CONTACTED'
                            ? 'bg-indigo-600 text-white'
                            : 'bg-emerald-600 text-white'
                        }`}
                      >
                        {a.status}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => {
                          setSelectedAlert(a);
                          setStatusInput(a.status);
                          setReviewerNotes(a.reviewerNotes || '');
                        }}
                        className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-600/30 transition-all inline-flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" /> Review Alert
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Review Modal */}
      {selectedAlert && (
        <Modal
          isOpen={Boolean(selectedAlert)}
          onClose={() => setSelectedAlert(null)}
          title={`Confidential Safety Review — ${selectedAlert.studentName}`}
          subtitle={`USN: ${selectedAlert.studentUsn} | Alert Severity: ${selectedAlert.severity}`}
          maxWidth="2xl"
        >
          <form onSubmit={handleUpdateStatus} className="space-y-4 text-xs">
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <p className="font-bold text-slate-300">Trigger Student Message Context:</p>
              <p className="text-white bg-slate-900 p-3 rounded-lg border border-slate-800 italic">
                "{selectedAlert.triggerMessage}"
              </p>
              <p className="text-slate-400 mt-2 font-bold">AI Engine Reasoning:</p>
              <p className="text-slate-300">{selectedAlert.confidenceReasoning}</p>
            </div>

            <div>
              <label className="block font-bold text-slate-300 mb-1">Update Intervention Status</label>
              <select
                value={statusInput}
                onChange={(e: any) => setStatusInput(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white"
              >
                <option value="NEW">NEW — Unreviewed</option>
                <option value="REVIEWING">REVIEWING — In Progress</option>
                <option value="CONTACTED">CONTACTED — Student Contacted Directly</option>
                <option value="RESOLVED">RESOLVED — Safety Plan Formulated</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-300 mb-1">Confidential Mentor Reviewer Notes</label>
              <textarea
                value={reviewerNotes}
                onChange={(e) => setReviewerNotes(e.target.value)}
                placeholder="Log details of outreach, student conversation outcome, or crisis intervention step..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white h-24 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSelectedAlert(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={updating}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold shadow-lg shadow-indigo-600/30"
              >
                {updating ? 'Saving Audit Record...' : 'Save & Log Audit Trail'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
