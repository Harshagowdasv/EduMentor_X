import React, { useState } from 'react';
import Papa from 'papaparse';
import { dbService } from '../../services/serviceFactory';
import { Download, Database, RefreshCw, Upload, ShieldCheck } from 'lucide-react';

export const DataBackupExportManager: React.FC = () => {
  const [exporting, setExporting] = useState(false);

  const exportDataset = async (datasetName: 'students' | 'mentors' | 'allocations' | 'interventions' | 'meetings') => {
    setExporting(true);
    try {
      let data: any[] = [];
      if (datasetName === 'students') {
        const res = await dbService.getStudents(1, 10000);
        data = res.students.map((s) => ({
          usn: s.usn,
          name: s.name,
          email: s.email,
          department: s.department,
          mentorName: s.mentorName || 'Unallocated',
          cgpa: s.cgpa,
          attendance: s.attendance,
          riskLevel: s.riskLevel,
        }));
      } else if (datasetName === 'mentors') {
        const list = await dbService.getMentors();
        data = list.map((m) => ({
          staffId: m.staffId,
          name: m.name,
          email: m.email,
          department: m.department,
          activeMenteesCount: m.activeMenteesCount,
          status: m.status,
        }));
      } else if (datasetName === 'allocations') {
        data = await dbService.getAllocationHistory();
      } else if (datasetName === 'interventions') {
        data = await dbService.getInterventions();
      } else if (datasetName === 'meetings') {
        data = await dbService.getMeetings();
      }

      const csvContent = Papa.unparse(data);
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `EduMentorX_${datasetName}_Export_${Date.now()}.csv`;
      a.click();
    } catch (err) {
      console.error('Failed to export dataset:', err);
    } finally {
      setExporting(false);
    }
  };

  const handleResetDemo = async () => {
    if (confirm('Are you sure you want to reset all demo data back to default seed records?')) {
      await dbService.resetDemoData?.();
      window.location.reload();
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="p-4 sm:p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <Database className="w-5 h-5 text-indigo-400 shrink-0" />
              Institutional Data Export & Backup Manager
            </h2>
            <p className="text-xs text-slate-400 mt-1">Export institutional datasets to CSV and manage offline IndexedDB backups</p>
          </div>
        </div>
      </div>

      {/* Export Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
          <h4 className="font-bold text-white text-sm">Export Student Records</h4>
          <p className="text-slate-400 text-xs">Export student academic details, CGPA, attendance, and risk standing.</p>
          <button
            onClick={() => exportDataset('students')}
            disabled={exporting}
            className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" /> Export Students CSV
          </button>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
          <h4 className="font-bold text-white text-sm">Export Faculty Mentors</h4>
          <p className="text-slate-400 text-xs">Export faculty mentor directory, active mentee counts, and status.</p>
          <button
            onClick={() => exportDataset('mentors')}
            disabled={exporting}
            className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" /> Export Mentors CSV
          </button>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
          <h4 className="font-bold text-white text-sm">Export Interventions</h4>
          <p className="text-slate-400 text-xs">Export student intervention records and outcome metrics.</p>
          <button
            onClick={() => exportDataset('interventions')}
            disabled={exporting}
            className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" /> Export Interventions CSV
          </button>
        </div>
      </div>

      {/* Demo Controls */}
      <div className="p-4 sm:p-6 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div>
          <h4 className="font-bold text-white">IndexedDB Demo Storage Controls</h4>
          <p className="text-slate-400 mt-0.5">Reset demo database to fresh default institutional seed data.</p>
        </div>
        <button
          onClick={handleResetDemo}
          className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold flex items-center gap-1.5"
        >
          <RefreshCw className="w-4 h-4" /> Reset Demo Seed Data
        </button>
      </div>
    </div>
  );
};
