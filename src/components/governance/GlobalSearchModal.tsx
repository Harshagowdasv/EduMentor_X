import React, { useState, useEffect } from 'react';
import { dbService } from '../../services/serviceFactory';
import { Student, Mentor, SharedResource, AssignedCourse, UserRole } from '../../types';
import { Search, X, Users, UserCheck, BookOpen, FileText, ArrowRight } from 'lucide-react';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  userRole: UserRole;
  onSelectStudent?: (studentId: string) => void;
  onSelectMentor?: (mentor: Mentor) => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  onClose,
  userRole,
  onSelectStudent,
  onSelectMentor,
}) => {
  const [query, setQuery] = useState('');
  const [students, setStudents] = useState<Student[]>([]);
  const [mentors, setMentors] = useState<Mentor[]>([]);
  const [resources, setResources] = useState<SharedResource[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && query.trim().length >= 2) {
      performSearch();
    } else {
      setStudents([]);
      setMentors([]);
      setResources([]);
    }
  }, [query, isOpen]);

  const performSearch = async () => {
    setLoading(true);
    try {
      const q = query.toLowerCase();
      const [stRes, mList, rList] = await Promise.all([
        dbService.getStudents(1, 100, { search: q }),
        userRole === 'admin' ? dbService.getMentors() : Promise.resolve([]),
        dbService.getSharedResources(),
      ]);

      setStudents(stRes.students);
      if (userRole === 'admin') {
        setMentors(mList.filter((m) => m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q) || m.department.toLowerCase().includes(q)));
      }
      setResources(rList.filter((r) => r.title.toLowerCase().includes(q) || (r.subject && r.subject.toLowerCase().includes(q))));
    } catch (err) {
      console.error('Failed to perform global search:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-6 sm:pt-20 px-3 sm:px-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[calc(100dvh-3rem)] sm:max-h-[80vh]">
        {/* Search Bar Input */}
        <div className="p-4 border-b border-slate-800 flex items-center gap-3 bg-slate-950">
          <Search className="w-5 h-5 text-indigo-400 shrink-0" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search students (USN/Name), faculty mentors, courses, resources..."
            className="w-full bg-transparent text-sm text-white focus:outline-none placeholder-slate-500"
          />
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Results Container */}
        <div className="p-4 overflow-y-auto space-y-6 flex-1 text-xs">
          {loading ? (
            <p className="text-center text-slate-400 py-6">Searching institutional database...</p>
          ) : query.trim().length < 2 ? (
            <p className="text-center text-slate-500 py-6">Type at least 2 characters to search across records.</p>
          ) : students.length === 0 && mentors.length === 0 && resources.length === 0 ? (
            <p className="text-center text-slate-400 py-6">No matching records found for "{query}".</p>
          ) : (
            <>
              {/* Students Results Group */}
              {students.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-indigo-400" /> Students ({students.length})
                  </h4>
                  <div className="space-y-1">
                    {students.map((s) => (
                      <div
                        key={s.id}
                        onClick={() => {
                          if (onSelectStudent) onSelectStudent(s.id);
                          onClose();
                        }}
                        className="p-3 rounded-xl bg-slate-950 hover:bg-slate-800/80 cursor-pointer transition-colors flex items-center justify-between"
                      >
                        <div>
                          <p className="font-bold text-white text-xs">{s.name} <span className="text-slate-400">({s.usn})</span></p>
                          <p className="text-[11px] text-slate-400">{s.department} • CGPA {s.cgpa}</p>
                        </div>
                        <ArrowRight className="w-4 h-4 text-indigo-400" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Mentors Results Group */}
              {mentors.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5 text-purple-400" /> Faculty Mentors ({mentors.length})
                  </h4>
                  <div className="space-y-1">
                    {mentors.map((m) => (
                      <div
                        key={m.id}
                        onClick={() => {
                          if (onSelectMentor) onSelectMentor(m);
                          onClose();
                        }}
                        className="p-3 rounded-xl bg-slate-950 hover:bg-slate-800/80 cursor-pointer transition-colors flex items-center justify-between"
                      >
                        <div>
                          <p className="font-bold text-white text-xs">{m.name}</p>
                          <p className="text-[11px] text-slate-400">{m.department} • Staff ID: {m.staffId}</p>
                        </div>
                        <ArrowRight className="w-4 h-4 text-purple-400" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Resources Results Group */}
              {resources.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-emerald-400" /> Study Resources ({resources.length})
                  </h4>
                  <div className="space-y-1">
                    {resources.map((r) => (
                      <a
                        key={r.id}
                        href={r.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="p-3 rounded-xl bg-slate-950 hover:bg-slate-800/80 cursor-pointer transition-colors flex items-center justify-between block"
                      >
                        <div>
                          <p className="font-bold text-white text-xs">{r.title}</p>
                          <p className="text-[11px] text-slate-400">{r.category} • Subject: {r.subject || 'General'}</p>
                        </div>
                        <ArrowRight className="w-4 h-4 text-emerald-400" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
