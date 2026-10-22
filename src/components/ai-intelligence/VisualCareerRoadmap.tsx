import React, { useState } from 'react';
import { Compass, CheckCircle2, Circle, ArrowRight, BookOpen, Code } from 'lucide-react';

interface SkillItem {
  id: string;
  name: string;
  category: string;
  completed: boolean;
}

export const VisualCareerRoadmap: React.FC = () => {
  const [skills, setSkills] = useState<SkillItem[]>([
    { id: 's1', name: 'HTML5 / CSS3 Layouts & Tailwind CSS', category: 'Frontend Fundamentals', completed: true },
    { id: 's2', name: 'JavaScript ES6+ Async & DOM APIs', category: 'Frontend Fundamentals', completed: true },
    { id: 's3', name: 'React 18 & Custom Hooks State Architecture', category: 'Frontend Frameworks', completed: true },
    { id: 's4', name: 'TypeScript Strict Interfaces & Utility Types', category: 'Frontend Frameworks', completed: true },
    { id: 's5', name: 'Node.js Express REST API Architecture', category: 'Backend & Cloud', completed: false },
    { id: 's6', name: 'Cloud Firestore & IndexedDB Native Storage', category: 'Backend & Cloud', completed: false },
    { id: 's7', name: 'AWS Cloud Architect Services & Microservices', category: 'System Architecture', completed: false },
  ]);

  const toggleSkill = (id: string) => {
    setSkills((prev) =>
      prev.map((s) => (s.id === id ? { ...s, completed: !s.completed } : s))
    );
  };

  const completedCount = skills.filter((s) => s.completed).length;
  const progressPct = Math.round((completedCount / skills.length) * 100);

  return (
    <div className="p-4 sm:p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
            <Compass className="w-5 h-5 text-sky-400" />
            Visual Full-Stack & Cloud Career Roadmap
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">Target Role: Full-Stack Cloud Architect</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-xs font-bold text-white">Roadmap Progress</p>
            <p className="text-sm font-extrabold text-sky-400">{progressPct}% Complete</p>
          </div>
          <div className="w-12 h-12 rounded-full border-4 border-sky-500 bg-sky-950 flex items-center justify-center font-bold text-white text-xs">
            {completedCount}/{skills.length}
          </div>
        </div>
      </div>

      {/* Interactive Skill Checklist */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold text-white uppercase tracking-wider">Skill Mastery Checklist</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {skills.map((s) => (
            <div
              key={s.id}
              onClick={() => toggleSkill(s.id)}
              className={`p-3.5 rounded-xl border text-xs cursor-pointer transition-all flex items-center gap-3 ${
                s.completed
                  ? 'bg-emerald-950/30 border-emerald-800/60 text-white'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
            >
              <button className="shrink-0">
                {s.completed ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 fill-emerald-950" />
                ) : (
                  <Circle className="w-4 h-4 text-slate-600" />
                )}
              </button>
              <div className="flex-1 min-w-0">
                <p className={`font-bold text-xs ${s.completed ? 'text-white' : 'text-slate-300'}`}>{s.name}</p>
                <span className="text-[10px] text-slate-500 font-mono">{s.category}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
