import React, { useState, useEffect } from 'react';
import { AcademicYear, Semester } from '../../types';
import { dbService } from '../../services/serviceFactory';
import { Modal } from '../common/Modal';
import {
  Building2,
  Plus,
  CheckCircle2,
  Archive,
  Calendar,
  Edit2,
  Clock,
  Layers,
  ArrowRight
} from 'lucide-react';

interface AcademicCalendarManagerProps {
  userRole?: string;
  userId?: string;
  department?: string;
}

export const AcademicCalendarManager: React.FC<AcademicCalendarManagerProps> = () => {
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [isAddYearOpen, setIsAddYearOpen] = useState(false);
  const [isAddSemOpen, setIsAddSemOpen] = useState(false);
  const [editingYear, setEditingYear] = useState<AcademicYear | null>(null);
  const [editingSem, setEditingSem] = useState<Semester | null>(null);

  // Form states
  const [yearName, setYearName] = useState('2026-2027');
  const [yearStart, setYearStart] = useState('2026-08-01');
  const [yearEnd, setYearEnd] = useState('2027-06-30');
  const [yearIsActive, setYearIsActive] = useState(true);

  const [semYearId, setSemYearId] = useState('');
  const [semName, setSemName] = useState('Semester 6');
  const [semNumber, setSemNumber] = useState(6);
  const [semStart, setSemStart] = useState('2027-01-15');
  const [semEnd, setSemEnd] = useState('2027-05-30');
  const [semIsActive, setSemIsActive] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [yearsList, semList] = await Promise.all([
        dbService.getAcademicYears(),
        dbService.getSemesters(),
      ]);
      setAcademicYears(yearsList);
      setSemesters(semList);
      if (yearsList.length > 0 && !semYearId) {
        setSemYearId(yearsList[0].id);
      }
    } catch (err) {
      console.error('Failed to load academic structure:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveYear = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingYear) {
        await dbService.updateAcademicYear(editingYear.id, {
          yearName,
          startDate: yearStart,
          endDate: yearEnd,
          isActive: yearIsActive,
        });
      } else {
        await dbService.createAcademicYear({
          yearName,
          startDate: yearStart,
          endDate: yearEnd,
          isActive: yearIsActive,
        });
      }
      setIsAddYearOpen(false);
      setEditingYear(null);
      await loadData();
    } catch (err) {
      console.error('Failed to save academic year:', err);
    }
  };

  const handleSaveSemester = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let createdOrUpdatedSemId = '';
      if (editingSem) {
        await dbService.updateSemester(editingSem.id, {
          academicYearId: semYearId,
          name: semName,
          number: semNumber,
          startDate: semStart,
          endDate: semEnd,
          isActive: semIsActive,
        });
        createdOrUpdatedSemId = editingSem.id;
      } else {
        const newSem = await dbService.createSemester({
          academicYearId: semYearId,
          name: semName,
          number: semNumber,
          startDate: semStart,
          endDate: semEnd,
          isActive: semIsActive,
        });
        createdOrUpdatedSemId = newSem.id;
      }

      if (semIsActive) {
        await dbService.setActiveSemester(createdOrUpdatedSemId);
      }

      setIsAddSemOpen(false);
      setEditingSem(null);
      await loadData();
    } catch (err) {
      console.error('Failed to save semester:', err);
    }
  };

  const handleSetActiveSem = async (semId: string) => {
    try {
      await dbService.setActiveSemester(semId);
      await loadData();
    } catch (err) {
      console.error('Failed to set active semester:', err);
    }
  };

  const handleArchiveSem = async (semId: string) => {
    try {
      await dbService.archiveSemester(semId);
      await loadData();
    } catch (err) {
      console.error('Failed to archive semester:', err);
    }
  };

  return (
    <div className="space-y-6 text-xs">
      {/* Header Banner */}
      <div className="p-4 sm:p-6 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Building2 className="w-5 h-5 text-indigo-400 shrink-0" />
            Institutional Academic Calendar & Semester Management
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Configure dynamic institutional academic years, term dates, and active term windows. Database is the source of truth.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
          <button
            onClick={() => {
              setEditingYear(null);
              setYearName('2026-2027');
              setIsAddYearOpen(true);
            }}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 font-semibold text-slate-200 flex items-center gap-2"
          >
            <Plus className="w-4 h-4 text-indigo-400" /> Add Academic Year
          </button>
          <button
            onClick={() => {
              setEditingSem(null);
              if (academicYears.length > 0) setSemYearId(academicYears[0].id);
              setIsAddSemOpen(true);
            }}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-bold text-white flex items-center gap-2 shadow-lg shadow-indigo-600/30"
          >
            <Plus className="w-4 h-4" /> Add Semester
          </button>
        </div>
      </div>

      {/* Grid of Academic Years & Semesters */}
      {loading ? (
        <div className="p-8 text-center text-slate-400">Loading Academic Calendar...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {academicYears.map((ay) => {
            const yearSemesters = semesters.filter((s) => s.academicYearId === ay.id);
            return (
              <div key={ay.id} className="p-4 sm:p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div>
                    <h3 className="font-bold text-white text-base flex items-center gap-2">
                      {ay.yearName} Academic Year
                      {ay.isActive && (
                        <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-800 rounded-md">
                          Active Year
                        </span>
                      )}
                    </h3>
                    <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                      <Calendar className="w-3 h-3 text-slate-500" /> {ay.startDate} to {ay.endDate}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setEditingYear(ay);
                      setYearName(ay.yearName);
                      setYearStart(ay.startDate);
                      setYearEnd(ay.endDate);
                      setYearIsActive(ay.isActive);
                      setIsAddYearOpen(true);
                    }}
                    className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
                    title="Edit Academic Year"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                    <Layers className="w-3.5 h-3.5 text-indigo-400" /> Semesters ({yearSemesters.length})
                  </h4>

                  {yearSemesters.length === 0 ? (
                    <p className="text-[11px] text-slate-500 italic p-3 rounded-xl bg-slate-950 border border-slate-800">
                      No semesters added under this academic year yet.
                    </p>
                  ) : (
                    yearSemesters.map((sem) => (
                      <div
                        key={sem.id}
                        className={`p-3 rounded-xl border flex items-center justify-between transition ${
                          sem.isActive
                            ? 'bg-indigo-950/40 border-indigo-500/50 shadow-md shadow-indigo-950/30'
                            : 'bg-slate-950 border-slate-800'
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-white text-xs">{sem.name}</p>
                            {sem.isActive ? (
                              <span className="px-2 py-0.5 text-[9px] font-extrabold bg-indigo-600 text-white rounded">
                                ACTIVE SEMESTER
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 text-[9px] font-bold bg-slate-900 text-slate-500 rounded flex items-center gap-1">
                                <Archive className="w-3 h-3" /> Archived
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            {sem.startDate} — {sem.endDate}
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          {!sem.isActive ? (
                            <button
                              onClick={() => handleSetActiveSem(sem.id)}
                              className="px-2.5 py-1 rounded-md text-[10px] font-bold bg-slate-800 text-indigo-300 hover:bg-indigo-600 hover:text-white transition"
                              title="Set as institution active semester"
                            >
                              Make Active
                            </button>
                          ) : (
                            <button
                              onClick={() => handleArchiveSem(sem.id)}
                              className="px-2.5 py-1 rounded-md text-[10px] font-bold bg-slate-800 text-amber-300 hover:bg-amber-600 hover:text-white transition"
                              title="Archive semester"
                            >
                              Archive
                            </button>
                          )}
                          <button
                            onClick={() => {
                              setEditingSem(sem);
                              setSemYearId(sem.academicYearId);
                              setSemName(sem.name);
                              setSemNumber(sem.number);
                              setSemStart(sem.startDate);
                              setSemEnd(sem.endDate);
                              setSemIsActive(sem.isActive);
                              setIsAddSemOpen(true);
                            }}
                            className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Academic Year Modal */}
      <Modal
        isOpen={isAddYearOpen}
        onClose={() => setIsAddYearOpen(false)}
        title={editingYear ? 'Edit Academic Year' : 'Create Academic Year'}
        maxWidth="md"
      >
        <form onSubmit={handleSaveYear} className="space-y-4 text-xs">
          <div>
            <label className="block font-medium text-slate-300 mb-1">Academic Year Name</label>
            <input
              type="text"
              required
              value={yearName}
              onChange={(e) => setYearName(e.target.value)}
              placeholder="e.g. 2026-2027"
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-medium text-slate-300 mb-1">Start Date</label>
              <input
                type="date"
                required
                value={yearStart}
                onChange={(e) => setYearStart(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-300 mb-1">End Date</label>
              <input
                type="date"
                required
                value={yearEnd}
                onChange={(e) => setYearEnd(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="yearActiveCheck"
              checked={yearIsActive}
              onChange={(e) => setYearIsActive(e.target.checked)}
              className="rounded bg-slate-900 border-slate-700 text-indigo-600 focus:ring-indigo-500"
            />
            <label htmlFor="yearActiveCheck" className="text-slate-300 font-medium">
              Set as current active academic year
            </label>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsAddYearOpen(false)}
              className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-lg bg-indigo-600 font-bold text-white shadow-lg shadow-indigo-600/30"
            >
              {editingYear ? 'Update Academic Year' : 'Create Academic Year'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Add / Edit Semester Modal */}
      <Modal
        isOpen={isAddSemOpen}
        onClose={() => setIsAddSemOpen(false)}
        title={editingSem ? 'Edit Semester' : 'Create Semester'}
        maxWidth="md"
      >
        <form onSubmit={handleSaveSemester} className="space-y-4 text-xs">
          <div>
            <label className="block font-medium text-slate-300 mb-1">Parent Academic Year</label>
            <select
              value={semYearId}
              onChange={(e) => setSemYearId(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white"
            >
              {academicYears.map((ay) => (
                <option key={ay.id} value={ay.id}>
                  {ay.yearName} Academic Year
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-medium text-slate-300 mb-1">Semester Name</label>
              <input
                type="text"
                required
                value={semName}
                onChange={(e) => setSemName(e.target.value)}
                placeholder="e.g. Semester 6"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-300 mb-1">Semester Number</label>
              <input
                type="number"
                required
                min={1}
                max={10}
                value={semNumber}
                onChange={(e) => setSemNumber(parseInt(e.target.value, 10) || 1)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-medium text-slate-300 mb-1">Term Start Date</label>
              <input
                type="date"
                required
                value={semStart}
                onChange={(e) => setSemStart(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-300 mb-1">Term End Date</label>
              <input
                type="date"
                required
                value={semEnd}
                onChange={(e) => setSemEnd(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="semActiveCheck"
              checked={semIsActive}
              onChange={(e) => setSemIsActive(e.target.checked)}
              className="rounded bg-slate-900 border-slate-700 text-indigo-600 focus:ring-indigo-500"
            />
            <label htmlFor="semActiveCheck" className="text-slate-300 font-medium">
              Set as institution-wide ACTIVE semester
            </label>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsAddSemOpen(false)}
              className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-lg bg-indigo-600 font-bold text-white shadow-lg shadow-indigo-600/30"
            >
              {editingSem ? 'Update Semester' : 'Create Semester'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
