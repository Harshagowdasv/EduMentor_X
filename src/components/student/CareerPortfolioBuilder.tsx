import React, { useState, useEffect } from 'react';
import { StudentPortfolio, Project, Certificate, Extracurricular } from '../../types';
import { dbService, storageService } from '../../services/serviceFactory';
import { ProfileCompletenessGauge } from './ProfileCompletenessGauge';
import { FolderGit2, Plus, Upload, ExternalLink, Award, Code, FileText, Trash2 } from 'lucide-react';
import { Modal } from '../common/Modal';

interface CareerPortfolioBuilderProps {
  studentId: string;
}

export const CareerPortfolioBuilder: React.FC<CareerPortfolioBuilderProps> = ({ studentId }) => {
  const [portfolio, setPortfolio] = useState<StudentPortfolio | null>(null);
  const [loading, setLoading] = useState(true);

  // Modals
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [isCertModalOpen, setIsCertModalOpen] = useState(false);

  // Project Form
  const [projTitle, setProjTitle] = useState('');
  const [projDesc, setProjDesc] = useState('');
  const [projTech, setProjTech] = useState('React, TypeScript, Node.js');
  const [projGithub, setProjGithub] = useState('');
  const [projLive, setProjLive] = useState('');

  // Certificate Form
  const [certTitle, setCertTitle] = useState('');
  const [certOrg, setCertOrg] = useState('');
  const [certDate, setCertDate] = useState('');
  const [certUrl, setCertUrl] = useState('');

  // Resume Upload
  const [uploadingResume, setUploadingResume] = useState(false);

  useEffect(() => {
    loadPortfolio();
  }, [studentId]);

  const loadPortfolio = async () => {
    setLoading(true);
    try {
      const port = await dbService.getStudentPortfolio(studentId);
      setPortfolio(port);
    } catch (err) {
      console.error('Failed to load portfolio:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!portfolio || !projTitle) return;

    const newProj: Project = {
      id: `proj_${Date.now()}`,
      title: projTitle,
      description: projDesc,
      technologies: projTech.split(',').map((t) => t.trim()),
      githubUrl: projGithub,
      liveUrl: projLive,
    };

    const updatedProjects = [...portfolio.projects, newProj];
    const updated = await dbService.updateStudentPortfolio(studentId, { projects: updatedProjects });
    setPortfolio(updated);

    setProjTitle('');
    setProjDesc('');
    setIsProjectModalOpen(false);
  };

  const handleAddCert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!portfolio || !certTitle) return;

    const newCert: Certificate = {
      id: `cert_${Date.now()}`,
      title: certTitle,
      organization: certOrg,
      date: certDate || new Date().toISOString().substring(0, 10),
      certificateUrl: certUrl || 'https://example.com/cert.pdf',
    };

    const updatedCerts = [...portfolio.certificates, newCert];
    const updated = await dbService.updateStudentPortfolio(studentId, { certificates: updatedCerts });
    setPortfolio(updated);

    setCertTitle('');
    setCertOrg('');
    setIsCertModalOpen(false);
  };

  const handleResumeUpload = async (file: File) => {
    if (!portfolio) return;
    setUploadingResume(true);
    try {
      const url = await storageService.uploadFile(`resumes/${studentId}_${file.name}`, file);
      const updated = await dbService.updateStudentPortfolio(studentId, {
        resumeUrl: url,
        resumeName: file.name,
      });
      setPortfolio(updated);
    } catch (err) {
      console.error('Resume upload error:', err);
    } finally {
      setUploadingResume(false);
    }
  };

  if (loading || !portfolio) {
    return <div className="p-8 text-center text-xs text-slate-400">Loading career portfolio...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white tracking-tight">Student Career Portfolio Builder</h2>
        <p className="text-xs text-slate-400 mt-1">Build your verified project highlights, coding profile handles, and resume</p>
      </div>

      {/* Completeness Gauge */}
      <ProfileCompletenessGauge completeness={portfolio.profileCompleteness} suggestions={portfolio.missingSuggestions} />

      {/* Resume Section */}
      <div className="p-4 sm:p-6 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 sm:p-3 rounded-xl bg-indigo-950 text-indigo-400 border border-indigo-800 shrink-0">
            <FileText className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <h3 className="font-bold text-white text-sm">Curriculum Vitae / Resume Document</h3>
            <p className="text-xs text-slate-400 truncate max-w-xs">{portfolio.resumeName || 'No resume uploaded yet'}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 w-full sm:w-auto">
          {portfolio.resumeUrl && (
            <a
              href={portfolio.resumeUrl}
              target="_blank"
              rel="noreferrer"
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 inline-flex items-center gap-1.5"
            >
              Preview / Download Resume <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
          <input
            type="file"
            accept=".pdf,.doc,.docx"
            id="resumeUploadInput"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleResumeUpload(e.target.files[0])}
          />
          <label
            htmlFor="resumeUploadInput"
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 cursor-pointer inline-flex items-center gap-1.5"
          >
            <Upload className="w-3.5 h-3.5" /> {uploadingResume ? 'Uploading...' : 'Upload New Resume'}
          </label>
        </div>
      </div>

      {/* Projects Section */}
      <div className="p-4 sm:p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-white text-sm uppercase tracking-wider flex items-center gap-2">
            <FolderGit2 className="w-4 h-4 text-indigo-400" /> Technical Projects ({portfolio.projects.length})
          </h3>
          <button
            onClick={() => setIsProjectModalOpen(true)}
            className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" /> Add Project
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {portfolio.projects.map((p) => (
            <div key={p.id} className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-2">
              <h4 className="font-bold text-white text-sm">{p.title}</h4>
              <p className="text-slate-400 leading-relaxed">{p.description}</p>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {p.technologies.map((t, idx) => (
                  <span key={idx} className="px-2 py-0.5 rounded bg-slate-900 text-indigo-300 font-mono text-[10px] border border-slate-800">
                    {t}
                  </span>
                ))}
              </div>
              <div className="flex items-center gap-3 pt-2">
                {p.githubUrl && (
                  <a href={p.githubUrl} target="_blank" rel="noreferrer" className="text-indigo-400 hover:underline inline-flex items-center gap-1 text-[11px]">
                    GitHub Repository <ExternalLink className="w-3 h-3" />
                  </a>
                )}
                {p.liveUrl && (
                  <a href={p.liveUrl} target="_blank" rel="noreferrer" className="text-emerald-400 hover:underline inline-flex items-center gap-1 text-[11px]">
                    Live Demo <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add Project Modal */}
      <Modal isOpen={isProjectModalOpen} onClose={() => setIsProjectModalOpen(false)} title="Add Technical Project">
        <form onSubmit={handleAddProject} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-300 mb-1">Project Title</label>
            <input
              type="text"
              required
              value={projTitle}
              onChange={(e) => setProjTitle(e.target.value)}
              placeholder="e.g. EduMentorX AI Web Application"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white"
            />
          </div>
          <div>
            <label className="block font-bold text-slate-300 mb-1">Description</label>
            <textarea
              value={projDesc}
              onChange={(e) => setProjDesc(e.target.value)}
              placeholder="Summarize architecture, key features, and performance achievements"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white h-20"
            />
          </div>
          <div>
            <label className="block font-bold text-slate-300 mb-1">Technologies (comma separated)</label>
            <input
              type="text"
              value={projTech}
              onChange={(e) => setProjTech(e.target.value)}
              placeholder="React, TypeScript, Tailwind CSS, Firebase"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white"
            />
          </div>
          <div>
            <label className="block font-bold text-slate-300 mb-1">GitHub Repository URL</label>
            <input
              type="url"
              value={projGithub}
              onChange={(e) => setProjGithub(e.target.value)}
              placeholder="https://github.com/..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setIsProjectModalOpen(false)} className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold">
              Cancel
            </button>
            <button type="submit" className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold">
              Save Project
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
