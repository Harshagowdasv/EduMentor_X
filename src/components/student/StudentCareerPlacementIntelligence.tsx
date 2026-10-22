import React, { useState, useEffect } from 'react';
import { Student, StudentPortfolio, CareerGuidance, StudentGoal } from '../../types';
import { dbService } from '../../services/serviceFactory';
import {
  analyzeSkillGaps,
  calculatePlacementReadiness,
  ROLE_BENCHMARKS
} from '../../utils/careerIntelligenceEngine';
import {
  Compass,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Lightbulb,
  Award,
  BookOpen,
  Code,
  FileCheck,
  Target,
  Plus,
  Github,
  Linkedin,
  FileText
} from 'lucide-react';

interface StudentCareerPlacementIntelligenceProps {
  student: Student;
}

export const StudentCareerPlacementIntelligence: React.FC<StudentCareerPlacementIntelligenceProps> = ({ student }) => {
  const [targetRole, setTargetRole] = useState(student.careerGoal || 'Full-Stack Developer');
  const [targetDomain, setTargetDomain] = useState('Software & Web Engineering');
  const [portfolio, setPortfolio] = useState<StudentPortfolio | null>(null);
  const [guidance, setGuidance] = useState<CareerGuidance | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [addedGoalId, setAddedGoalId] = useState<string | null>(null);

  useEffect(() => {
    loadCareerData();
  }, [student.id]);

  const loadCareerData = async () => {
    setLoading(true);
    try {
      const [portRes, guidRes] = await Promise.all([
        dbService.getStudentPortfolio(student.id).catch(() => null),
        dbService.getCareerGuidance(student.id).catch(() => null),
      ]);

      setPortfolio(portRes);

      if (guidRes && guidRes.targetRole) {
        setTargetRole(guidRes.targetRole);
        if (guidRes.targetDomain) setTargetDomain(guidRes.targetDomain);
        setGuidance(guidRes);
      } else {
        // Auto-run initial evaluation
        runCareerAnalysis(student.careerGoal || 'Full-Stack Developer', portRes);
      }
    } catch (err) {
      console.error('Failed to load career data:', err);
    } finally {
      setLoading(false);
    }
  };

  const runCareerAnalysis = async (selectedRole: string, currentPortfolio = portfolio) => {
    setSaving(true);
    try {
      const benchmark = ROLE_BENCHMARKS[selectedRole] || ROLE_BENCHMARKS['Software Engineer (General)'];
      const currentSkills = student.skills || [];
      const gapEval = analyzeSkillGaps(currentSkills, selectedRole);
      const readinessEval = calculatePlacementReadiness(student, currentPortfolio, selectedRole);

      // Save student target career goal update if changed
      if (student.careerGoal !== selectedRole) {
        await dbService.updateStudent(student.id, { careerGoal: selectedRole }, student.id).catch(() => null);
      }

      const newGuidance: Omit<CareerGuidance, 'id' | 'generatedAt'> = {
        studentId: student.id,
        targetRole: selectedRole,
        targetDomain: benchmark.domain,
        suggestedPaths: [selectedRole, benchmark.domain, 'Senior ' + selectedRole],
        skillGaps: gapEval.missingSkills,
        skillDetails: gapEval.skillDetails,
        recommendedTopics: benchmark.recommendedTopics,
        projectIdeas: benchmark.projectIdeas,
        certificationsToAcquire: benchmark.recommendedCertifications,
        readinessScore: readinessEval.score,
        readinessStatus: readinessEval.status,
        readinessReasons: readinessEval.reasons,
      };

      const saved = await dbService.saveCareerGuidance(newGuidance);
      setGuidance(saved);
      setTargetDomain(benchmark.domain);
    } catch (err) {
      console.error('Failed to run career analysis:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleAddGoal = async (title: string, type: 'career' | 'academic' | 'coding' = 'career') => {
    try {
      await dbService.createStudentGoal({
        studentId: student.id,
        title: `Career Prep: ${title}`,
        type,
        targetValue: 'Complete',
        targetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10),
        currentProgress: 10,
        status: 'active',
      });
      setAddedGoalId(title);
      setTimeout(() => setAddedGoalId(null), 3000);
    } catch (err) {
      console.error('Failed to add goal:', err);
    }
  };

  // Current readiness evaluation derived for dynamic view
  const currentReadiness = calculatePlacementReadiness(student, portfolio, targetRole);
  const gapAnalysis = analyzeSkillGaps(student.skills || [], targetRole);

  return (
    <div className="space-y-6 text-xs">
      {/* MODULE HEADER BANNER */}
      <div className="p-4 sm:p-6 rounded-2xl bg-gradient-to-r from-sky-950 via-slate-900 to-indigo-950 border border-sky-800/80 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-sky-600 text-white shadow-lg shadow-sky-600/40">
              <Compass className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">Student Career & Placement Intelligence</h2>
              <p className="text-xs text-slate-300">
                Where am I now, where do I want to go, and what should I do next?
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`px-3.5 py-1.5 text-xs font-extrabold uppercase rounded-xl border ${
                currentReadiness.status === 'PLACEMENT_READY'
                  ? 'bg-emerald-950 text-emerald-300 border-emerald-800 shadow-emerald-950/40'
                  : currentReadiness.status === 'INTERMEDIATE'
                  ? 'bg-amber-950 text-amber-300 border-amber-800 shadow-amber-950/40'
                  : currentReadiness.status === 'EARLY_STAGE'
                  ? 'bg-rose-950 text-rose-300 border-rose-800'
                  : 'bg-slate-900 text-slate-400 border-slate-800'
              }`}
            >
              {currentReadiness.status.replace('_', ' ')}
            </span>
          </div>
        </div>

        {/* Target Role Selector Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3 border-t border-sky-800/40">
          <div className="flex items-center gap-2 flex-1">
            <span className="text-xs font-bold text-slate-300 whitespace-nowrap">Target Career Role:</span>
            <select
              value={targetRole}
              onChange={(e) => {
                setTargetRole(e.target.value);
                runCareerAnalysis(e.target.value);
              }}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500 flex-1 max-w-xs font-bold"
            >
              {Object.keys(ROLE_BENCHMARKS).map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => runCareerAnalysis(targetRole)}
            disabled={saving}
            className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs shadow-md shadow-sky-600/30 flex items-center justify-center gap-2 transition-all"
          >
            <Sparkles className={`w-4 h-4 ${saving ? 'animate-spin' : ''}`} />
            {saving ? 'Analyzing Profile...' : 'Re-Analyze Career Plan'}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="p-8 text-center text-xs text-slate-400">Evaluating career & placement intelligence...</div>
      ) : (
        <>
          {/* SECTION 1: EXPLAINABLE PLACEMENT READINESS SCORE & FACTORS */}
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Target className="w-4 h-4 text-sky-400" /> Explainable Placement Readiness Assessment
                </h3>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  EduMentorX assessment indicator based on CGPA, skills, projects, and portfolio links. (Not a guaranteed job placement outcome).
                </p>
              </div>

              {currentReadiness.status !== 'INSUFFICIENT_DATA' && (
                <div className="flex items-center gap-3 bg-slate-950 px-4 py-2 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Readiness Score:</span>
                  <span className="text-2xl font-extrabold text-sky-400 font-mono">{currentReadiness.score} / 100</span>
                </div>
              )}
            </div>

            {/* Assessment Contributing Factors */}
            <div className="space-y-2">
              <h4 className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">Contributing Assessment Factors:</h4>
              <div className="space-y-1.5">
                {currentReadiness.reasons.map((reason, idx) => (
                  <div key={idx} className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                    <span>{reason}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* SECTION 2: DETERMINISTIC SKILL GAP MATRIX */}
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
            <div className="border-b border-slate-800 pb-3">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-amber-400" /> Skill Gap Matrix for {targetRole}
              </h3>
              <p className="text-[10px] text-slate-400 mt-0.5">
                Compares your current skills against industry benchmark requirements
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Strong Skills */}
              <div className="p-4 rounded-xl bg-slate-950 border border-emerald-900/60 space-y-2">
                <h4 className="font-bold text-emerald-400 text-xs uppercase flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" /> Strong Skills ({gapAnalysis.strongSkills.length})
                </h4>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {gapAnalysis.strongSkills.length > 0 ? (
                    gapAnalysis.strongSkills.map((s, idx) => (
                      <span key={idx} className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-emerald-950 text-emerald-300 border border-emerald-800">
                        ✓ {s}
                      </span>
                    ))
                  ) : (
                    <span className="text-slate-500 text-xs">No matching strong skills yet.</span>
                  )}
                </div>
              </div>

              {/* Skills Needing Improvement */}
              <div className="p-4 rounded-xl bg-slate-950 border border-purple-900/60 space-y-2">
                <h4 className="font-bold text-purple-400 text-xs uppercase flex items-center gap-1.5">
                  <Code className="w-4 h-4" /> Recommended Skills ({gapAnalysis.improvingSkills.length})
                </h4>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {gapAnalysis.improvingSkills.length > 0 ? (
                    gapAnalysis.improvingSkills.map((s, idx) => (
                      <span key={idx} className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-purple-950 text-purple-300 border border-purple-800">
                        ★ {s}
                      </span>
                    ))
                  ) : (
                    <span className="text-slate-500 text-xs">Add skills to build specialization.</span>
                  )}
                </div>
              </div>

              {/* Missing Skills */}
              <div className="p-4 rounded-xl bg-slate-950 border border-rose-900/60 space-y-2">
                <h4 className="font-bold text-rose-400 text-xs uppercase flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4" /> Missing Gap Skills ({gapAnalysis.missingSkills.length})
                </h4>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {gapAnalysis.missingSkills.length > 0 ? (
                    gapAnalysis.missingSkills.map((s, idx) => (
                      <span key={idx} className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-rose-950 text-rose-300 border border-rose-800 flex items-center gap-1">
                        ⚠ {s}
                      </span>
                    ))
                  ) : (
                    <span className="text-emerald-400 text-xs font-bold">All essential skills matched!</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 3: ACTIONABLE RECOMMENDATIONS & "ADD TO GOALS" */}
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
            <div className="border-b border-slate-800 pb-3">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-indigo-400" /> Actionable Preparation Roadmap
              </h3>
              <p className="text-[10px] text-slate-400 mt-0.5">
                Recommended learning topics, coding goals, projects, and certifications
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Recommended Topics */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <h4 className="font-bold text-indigo-300 text-xs uppercase">📚 Topics to Master</h4>
                <div className="space-y-1.5">
                  {(guidance?.recommendedTopics || gapAnalysis.benchmark.recommendedTopics).map((t, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-slate-900 border border-slate-800">
                      <span className="text-xs text-slate-200">{t}</span>
                      <button
                        onClick={() => handleAddGoal(`Master ${t}`, 'academic')}
                        className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[10px] flex items-center gap-1 shrink-0"
                      >
                        <Plus className="w-3 h-3" /> {addedGoalId === `Master ${t}` ? 'Added!' : 'Add Goal'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recommended Projects */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <h4 className="font-bold text-purple-300 text-xs uppercase">🛠️ Projects to Build</h4>
                <div className="space-y-1.5">
                  {(guidance?.projectIdeas || gapAnalysis.benchmark.projectIdeas).map((p, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-slate-900 border border-slate-800">
                      <span className="text-xs text-slate-200">{p}</span>
                      <button
                        onClick={() => handleAddGoal(`Build ${p}`, 'coding')}
                        className="px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-[10px] flex items-center gap-1 shrink-0"
                      >
                        <Plus className="w-3 h-3" /> {addedGoalId === `Build ${p}` ? 'Added!' : 'Add Goal'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 4: PORTFOLIO STRENGTH AUDIT */}
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
            <div className="border-b border-slate-800 pb-3">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-emerald-400" /> Portfolio Strength & Verification Audit
              </h3>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-400 block">Technical Projects</span>
                <span className="font-extrabold text-sm text-indigo-300">{portfolio?.projects?.length || 0} Added</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-400 block">Certifications</span>
                <span className="font-extrabold text-sm text-purple-300">{portfolio?.certificates?.length || 0} Verified</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-400 block">GitHub Profile</span>
                <span className={`font-extrabold text-sm ${student.github ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {student.github ? 'Linked ✓' : 'Missing ⚠'}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-400 block">Uploaded Resume</span>
                <span className={`font-extrabold text-sm ${portfolio?.resumeUrl || portfolio?.resumeName ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {portfolio?.resumeUrl || portfolio?.resumeName ? 'Uploaded ✓' : 'Missing ⚠'}
                </span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
