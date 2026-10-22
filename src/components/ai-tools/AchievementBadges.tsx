import React, { useState, useEffect } from 'react';
import { Achievement } from '../../types';
import { dbService } from '../../services/serviceFactory';
import { Award, Flame, CheckCircle2, ShieldCheck } from 'lucide-react';

interface AchievementBadgesProps {
  studentId: string;
}

export const AchievementBadges: React.FC<AchievementBadgesProps> = ({ studentId }) => {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAchievements();
  }, [studentId]);

  const loadAchievements = async () => {
    setLoading(true);
    try {
      const list = await dbService.getStudentAchievements(studentId);
      setAchievements(list);
    } catch (err) {
      console.error('Failed to load achievements:', err);
    } finally {
      setLoading(false);
    }
  };

  const allBadgeCatalog = [
    { key: 'portfolio_complete', title: '🏆 Portfolio Master', desc: '80%+ Portfolio Completeness' },
    { key: 'study_streak', title: '🔥 30-Day Study Streak', desc: '12+ Weekly Study Hours' },
    { key: 'course_completed', title: '📚 Course Completed', desc: 'Finished Assigned Course' },
    { key: 'coding_100', title: '💻 100 Coding Problems', desc: 'Solved 100+ LeetCode Tasks' },
    { key: 'goal_completed', title: '🎯 Goal Achieved', desc: 'Completed Personal Academic Goal' },
    { key: 'certificate_added', title: '📜 Verified Certification', desc: 'Uploaded External Certificate' },
  ];

  return (
    <div className="p-4 sm:p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-400 shrink-0" />
            Student Professional Achievements & Study Streaks
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">Verified milestone achievements and active learning consistency</p>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-950/60 border border-amber-800/60 text-amber-300 text-xs font-bold self-start sm:self-auto shrink-0">
          <Flame className="w-4 h-4 text-amber-400 animate-pulse" /> 30-Day Active Streak
        </div>
      </div>

      {loading ? (
        <div className="p-4 text-center text-xs text-slate-400">Loading achievements...</div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          {allBadgeCatalog.map((cat) => {
            const isUnlocked = achievements.some((a) => a.badgeKey === cat.key);
            return (
              <div
                key={cat.key}
                className={`p-3.5 rounded-xl border text-center space-y-2 transition-all ${
                  isUnlocked
                    ? 'bg-gradient-to-b from-indigo-950/40 to-slate-950 border-indigo-700/80 shadow-md'
                    : 'bg-slate-950/40 border-slate-800/60 opacity-40 grayscale'
                }`}
              >
                <div className="text-2xl">{cat.title.split(' ')[0]}</div>
                <div>
                  <h4 className="font-bold text-white text-[11px] leading-tight">{cat.title.substring(2)}</h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">{cat.desc}</p>
                </div>
                {isUnlocked ? (
                  <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-400 uppercase">
                    <CheckCircle2 className="w-3 h-3" /> Unlocked
                  </span>
                ) : (
                  <span className="text-[9px] text-slate-500 uppercase">Locked</span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
