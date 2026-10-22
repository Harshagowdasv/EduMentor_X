import React, { useState, useEffect } from 'react';
import { Student } from '../../types';
import { dbService } from '../../services/serviceFactory';
import { AlertTriangle, Clock, ArrowRight, UserCheck, Flame } from 'lucide-react';

interface SmartMentorRecommendationsProps {
  mentorId: string;
  onViewStudent360: (studentId: string) => void;
}

export const SmartMentorRecommendations: React.FC<SmartMentorRecommendationsProps> = ({
  mentorId,
  onViewStudent360,
}) => {
  const [needingAttention, setNeedingAttention] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRecommendations();
  }, [mentorId]);

  const loadRecommendations = async () => {
    setLoading(true);
    try {
      const students = await dbService.getStudentsByMentorId(mentorId);
      // Filter & Rank students needing attention (High Priority or Needs Monitoring)
      const ranked = students
        .filter((s) => s.riskLevel === 'HIGH_PRIORITY' || s.riskLevel === 'NEEDS_MONITORING' || s.attendance < 75 || s.previousYearBacklogs > 0)
        .sort((a, b) => (a.riskLevel === 'HIGH_PRIORITY' ? -1 : 1));

      setNeedingAttention(ranked);
    } catch (err) {
      console.error('Failed to load recommendations:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
            <Flame className="w-5 h-5 text-amber-400 shrink-0" />
            Students Needing Urgent Mentor Attention
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">Ranked using transparent explainable risk indicators and interaction recency</p>
        </div>
      </div>

      {loading ? (
        <div className="p-4 text-center text-xs text-slate-400">Evaluating mentee portfolio...</div>
      ) : needingAttention.length === 0 ? (
        <p className="p-4 text-center text-xs text-emerald-400 font-semibold bg-emerald-950/20 rounded-xl border border-emerald-900/40">
          ✓ All mentees are performing in Good Standing with zero active risk warnings.
        </p>
      ) : (
        <div className="space-y-3">
          {needingAttention.map((st, idx) => (
            <div
              key={st.id}
              className="p-3.5 sm:p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-slate-700 transition-colors"
            >
              <div className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-slate-800 text-indigo-400 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                  {idx + 1}
                </span>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="font-bold text-white text-sm">{st.name}</h4>
                    <span className="text-xs text-slate-400">({st.usn})</span>
                    <span
                      className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded ${
                        st.riskLevel === 'HIGH_PRIORITY'
                          ? 'bg-rose-950 text-rose-400 border border-rose-800'
                          : 'bg-amber-950 text-amber-400 border border-amber-800'
                      }`}
                    >
                      {st.riskLevel === 'HIGH_PRIORITY' ? '🔴 High Priority' : '🟠 Needs Monitoring'}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2 mt-2">
                    {st.riskReasons.map((r, rIdx) => (
                      <span key={rIdx} className="text-[11px] px-2 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-800">
                        • {r}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <button
                onClick={() => onViewStudent360(st.id)}
                className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1 shrink-0 self-end sm:self-center"
              >
                Inspect 360° <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
