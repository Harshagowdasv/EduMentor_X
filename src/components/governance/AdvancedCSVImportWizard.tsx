import React, { useState, useEffect } from 'react';
import Papa from 'papaparse';
import { CSVStudentRow, CSVImportResult, CSVImportHistoryRecord } from '../../types';
import { dbService } from '../../services/serviceFactory';
import { CANONICAL_CSV_HEADERS } from '../../utils/csvNormalizer';
import { Download, Upload, CheckCircle2, AlertTriangle, FileText, History, RefreshCw } from 'lucide-react';

interface AdvancedCSVImportWizardProps {
  actorId: string;
}

export const AdvancedCSVImportWizard: React.FC<AdvancedCSVImportWizardProps> = ({ actorId }) => {
  const [activeTab, setActiveTab] = useState<'import' | 'history'>('import');
  const [csvRows, setCsvRows] = useState<CSVStudentRow[]>([]);
  const [importHistory, setImportHistory] = useState<CSVImportHistoryRecord[]>([]);
  const [duplicateStrategy, setDuplicateStrategy] = useState<'skip' | 'update' | 'cancel'>('skip');
  const [isProcessing, setIsProcessing] = useState(false);
  const [importResult, setImportResult] = useState<CSVImportResult | null>(null);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const hist = await dbService.getCSVImportHistory();
      setImportHistory(hist);
    } catch (err) {
      console.error('Failed to load CSV history:', err);
    }
  };

  const handleDownloadTemplate = () => {
    const templateData = [
      {
        USN: '1CS21CS099',
        Name: 'John Doe',
        Email: 'john.doe@student.edu',
        'Phone Number': '+15550001111',
        'Parent Phone Number': '+15550002222',
        'Date of Birth': '2003-01-01',
        Gender: 'Male',
        'Blood Group': 'A+',
        Address: '45 University Ave',
        City: 'Bengaluru',
        State: 'Karnataka',
        Pincode: '560001',
        'Emergency Contact Name': 'Jane Doe',
        'Emergency Contact Phone': '+15550002222',
        'Emergency Contact Relationship': 'Mother',
        Department: 'Computer Science & Engineering',
        Program: 'B.Tech',
        Year: '3rd Year',
        Semester: 'Semester 6',
        Section: 'A',
        'Admission Year': '2023',
        'Mentor Email': 'mentor.sarah@edumentorx.edu',
        'Mentor Name': 'Dr. Sarah Jenkins',
        CGPA: '8.2',
        Attendance: '88',
        'Financial Score': '8',
        'Study Hours': '14',
        'Previous Year Backlogs': '0',
        'Current Backlogs': '0',
        'Academic Status': 'Active',
        'Career Goal': 'Full-Stack Developer',
        Skills: 'React, TypeScript',
      },
    ];

    const csvContent = Papa.unparse({
      fields: CANONICAL_CSV_HEADERS,
      data: templateData,
    });
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'EduMentorX_Canonical_Student_Import_Template.csv';
    a.click();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse<CSVStudentRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        setCsvRows(results.data);
        setImportResult(null);
      },
    });
  };

  const handleExecuteImport = async () => {
    if (csvRows.length === 0) return;
    setIsProcessing(true);

    try {
      const result = await dbService.importStudentsCSV(csvRows, actorId, duplicateStrategy);
      setImportResult(result);
      await loadHistory();
    } catch (err) {
      console.error('CSV Import Execution Error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('import')}
          className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 ${
            activeTab === 'import' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Upload className="w-4 h-4" /> Batch CSV Import Wizard
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 ${
            activeTab === 'history' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
          }`}
        >
          <History className="w-4 h-4" /> Import History Log
        </button>
      </div>

      {activeTab === 'import' ? (
        <div className="space-y-6">
          {/* Top Actions */}
          <div className="p-4 sm:p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-white tracking-tight">Institutional Student Data Import</h3>
                <p className="text-xs text-slate-400 mt-0.5">Upload CSV files to batch import students and auto-allocate faculty mentors</p>
                <p className="text-xs text-indigo-400 mt-1 font-medium">New students can initially sign in using their registered email address and phone number as their temporary password.</p>
              </div>

              <button
                onClick={handleDownloadTemplate}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center gap-1.5 border border-slate-700 shrink-0 self-start sm:self-auto"
              >
                <Download className="w-4 h-4 text-indigo-400" /> Download Canonical CSV Template
              </button>
            </div>

            {/* File Upload Box */}
            <div className="p-6 border-2 border-dashed border-slate-800 hover:border-indigo-600 rounded-2xl bg-slate-950/60 text-center space-y-2 transition-colors">
              <Upload className="w-8 h-8 text-indigo-400 mx-auto" />
              <p className="text-xs font-bold text-white">Choose CSV File to Import</p>
              <input type="file" accept=".csv" onChange={handleFileUpload} className="text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-indigo-600 file:text-white hover:file:bg-indigo-500 cursor-pointer max-w-full" />
            </div>

            {/* Config duplicate strategy */}
            {csvRows.length > 0 && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs">
                <span className="text-slate-300 font-bold">Duplicate USN Strategy:</span>
                <select
                  value={duplicateStrategy}
                  onChange={(e: any) => setDuplicateStrategy(e.target.value)}
                  className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-1 text-xs text-white"
                >
                  <option value="skip">Skip Duplicate USNs</option>
                  <option value="update">Update Existing Records</option>
                  <option value="cancel">Cancel Import if Duplicate Found</option>
                </select>
              </div>
            )}
          </div>

          {/* Confirm Button */}
          {csvRows.length > 0 && !importResult && (
            <div className="flex justify-end">
              <button
                onClick={handleExecuteImport}
                disabled={isProcessing}
                className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 flex items-center gap-2"
              >
                {isProcessing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                {isProcessing ? 'Processing & Persisting Records...' : `Process & Save ${csvRows.length} Student Records`}
              </button>
            </div>
          )}

          {/* Result Card */}
          {importResult && (
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-950 text-emerald-400 border border-emerald-800">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-white text-sm">Batch Import Execution Completed</h4>
                  <p className="text-xs text-slate-400">Records processed and persisted into active database provider</p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-center">
                  <span className="text-slate-400 block text-[10px]">Total Parsed</span>
                  <span className="font-extrabold text-white text-sm">{importResult.totalRows}</span>
                </div>
                <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-800 text-center">
                  <span className="text-emerald-300 block text-[10px]">New Created</span>
                  <span className="font-extrabold text-emerald-400 text-sm">{importResult.successfulCount}</span>
                </div>
                <div className="p-3 rounded-xl bg-indigo-950/40 border border-indigo-800 text-center">
                  <span className="text-indigo-300 block text-[10px]">Updated</span>
                  <span className="font-extrabold text-indigo-400 text-sm">{importResult.updatedCount}</span>
                </div>
                <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-800 text-center">
                  <span className="text-amber-300 block text-[10px]">Skipped</span>
                  <span className="font-extrabold text-amber-400 text-sm">{importResult.skippedCount}</span>
                </div>
                <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800 text-center">
                  <span className="text-rose-300 block text-[10px]">Failed</span>
                  <span className="font-extrabold text-rose-400 text-sm">{importResult.failedCount}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <h3 className="font-bold text-white text-sm">Audit History Log of Previous CSV Imports</h3>
          <div className="space-y-2">
            {importHistory.length === 0 ? (
              <p className="text-xs text-slate-400 p-4 text-center">No previous CSV import sessions recorded.</p>
            ) : (
              importHistory.map((h) => (
                <div key={h.id} className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
                  <div>
                    <p className="font-bold text-white">{h.filename}</p>
                    <p className="text-slate-400 text-[11px]">Uploaded by {h.uploadedBy} on {new Date(h.timestamp).toLocaleString()}</p>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-emerald-400">{h.successfulCount} Created</span>
                    <span className="text-slate-400 font-mono ml-2">({h.totalRecords} Rows)</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
