import React, { useState, useEffect } from 'react';
import Papa from 'papaparse';
import { Modal } from '../common/Modal';
import { CSVImportResult, Mentor } from '../../types';
import { dbService } from '../../services/serviceFactory';
import { CANONICAL_CSV_HEADERS, validateAndMapCSVRow } from '../../utils/csvNormalizer';
import { Upload, FileSpreadsheet, AlertCircle, Download, CheckCircle2, RefreshCw, AlertTriangle, ShieldCheck } from 'lucide-react';

interface CSVImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  actorId: string;
}

export const CSVImportModal: React.FC<CSVImportModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  actorId,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [rawParsedData, setRawParsedData] = useState<Record<string, any>[]>([]);
  const [mentors, setMentors] = useState<Mentor[]>([]);
  const [duplicateStrategy, setDuplicateStrategy] = useState<'skip' | 'update' | 'cancel'>('skip');
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<CSVImportResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  useEffect(() => {
    if (isOpen) {
      dbService.getMentors().then(setMentors);
    }
  }, [isOpen]);

  const handleFileChange = (selectedFile: File) => {
    setFile(selectedFile);
    setResult(null);
    setErrorMessage(null);

    Papa.parse<Record<string, any>>(selectedFile, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        setRawParsedData(results.data);
      },
      error: (err) => {
        console.error('CSV Parse Error:', err);
        setErrorMessage(`Failed to parse CSV file: ${err.message}`);
      },
    });
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const downloadCanonicalTemplate = () => {
    const sampleRow: Record<string, string> = {
      USN: '1CS23CS101',
      Name: 'Aarav Sharma',
      Email: 'aarav.sharma@example.edu',
      'Phone Number': '9876543210',
      'Parent Phone Number': '9876543211',
      'Date of Birth': '2003-05-15',
      Gender: 'Male',
      'Blood Group': 'O+',
      Address: '123 Tech Park Road',
      City: 'Bengaluru',
      State: 'Karnataka',
      Pincode: '560001',
      'Emergency Contact Name': 'Rajesh Sharma',
      'Emergency Contact Phone': '9876543211',
      'Emergency Contact Relationship': 'Father',
      Department: 'Computer Science & Engineering',
      Program: 'B.Tech',
      Year: '3rd Year',
      Semester: 'Semester 6',
      Section: 'A',
      'Admission Year': '2023',
      'Mentor Email': mentors[0]?.email || 'sarah.jenkins@edumentorx.edu',
      'Mentor Name': mentors[0]?.name || 'Dr. Sarah Jenkins',
      CGPA: '8.75',
      Attendance: '92',
      'Financial Score': '8',
      'Study Hours': '18',
      'Previous Year Backlogs': '0',
      'Current Backlogs': '0',
      'Academic Status': 'Active',
      'Career Goal': 'Full-Stack Cloud Architect',
      Skills: 'React, TypeScript, Node.js, AWS',
      GitHub: 'https://github.com/aaravsharma',
      LeetCode: 'https://leetcode.com/aaravsharma',
      HackerRank: 'https://hackerrank.com/aaravsharma',
      CodeChef: 'https://codechef.com/users/aaravsharma',
      LinkedIn: 'https://linkedin.com/in/aaravsharma',
      'Resume URL': 'https://example.edu/resumes/aaravsharma.pdf',
    };

    const csvContent = Papa.unparse({
      fields: CANONICAL_CSV_HEADERS,
      data: [sampleRow],
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'EduMentorX_Institutional_Student_Import_Template.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleProcessImport = async () => {
    if (rawParsedData.length === 0) return;
    setImporting(true);
    setErrorMessage(null);
    try {
      const importResult = await dbService.importStudentsCSV(rawParsedData, actorId, duplicateStrategy);
      setResult(importResult);
      if (importResult.successfulCount > 0 || importResult.updatedCount > 0) {
        onSuccess();
      }
    } catch (err: any) {
      console.error('CSV import execution error:', err);
      setErrorMessage(err?.message || 'Failed to import student CSV records. Please check the file formatting and retry.');
    } finally {
      setImporting(false);
    }
  };

  const downloadErrorReport = () => {
    if (!result || result.errors.length === 0) return;
    const csvContent = Papa.unparse(
      result.errors.map((e) => ({
        'Row Number': e.rowNumber,
        USN: e.usn || 'N/A',
        Name: e.name || 'N/A',
        'Error Type': e.errorType || 'VALIDATION_ERROR',
        'Error Message': e.reason,
        SuggestedFix: e.suggestedFix || 'Check row formatting',
      }))
    );
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `EduMentorX_CSV_Import_Error_Report_${Date.now()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Institutional Student CSV Bulk Import" subtitle="Upload student records with automatic header normalization and database persistence" maxWidth="4xl">
      <div className="space-y-6">
        {/* Download Template Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs">
          <div>
            <p className="font-bold text-white">Canonical Institutional CSV Template</p>
            <p className="text-slate-400">Supports full student biodata (38 columns) and legacy 8-column format</p>
          </div>
          <button
            onClick={downloadCanonicalTemplate}
            className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-indigo-300 font-bold flex items-center gap-2 shrink-0"
          >
            <Download className="w-4 h-4 text-indigo-400" /> Download Canonical Template CSV
          </button>
        </div>

        {/* Error Banner */}
        {errorMessage && (
          <div className="p-4 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Drag & Drop Box */}
        {!result && (
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`p-8 rounded-2xl border-2 border-dashed text-center transition-all cursor-pointer ${
              dragActive
                ? 'border-indigo-500 bg-indigo-950/30'
                : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'
            }`}
          >
            <Upload className="w-10 h-10 text-indigo-400 mx-auto mb-3 animate-bounce" />
            <h4 className="text-sm font-bold text-white mb-1">Drag and drop your student CSV file here</h4>
            <p className="text-xs text-slate-400 mb-4">Or click browse to select a file from your device</p>
            <input
              type="file"
              accept=".csv"
              id="csvFileInput"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFileChange(e.target.files[0])}
            />
            <label
              htmlFor="csvFileInput"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs cursor-pointer shadow-lg shadow-indigo-600/30 transition-all"
            >
              <FileSpreadsheet className="w-4 h-4" /> Browse CSV File
            </label>
            {file && <p className="text-xs text-emerald-400 font-semibold mt-3">Selected File: {file.name} ({rawParsedData.length} rows parsed)</p>}
          </div>
        )}

        {/* Strategy Selector & Preview */}
        {!result && rawParsedData.length > 0 && (
          <div className="space-y-4">
            <div className="p-3.5 rounded-xl bg-indigo-950/40 border border-indigo-800/60 text-indigo-300 text-xs flex items-center gap-2.5">
              <ShieldCheck className="w-4 h-4 text-indigo-400 shrink-0" />
              <span>New students can initially sign in using their registered email address and phone number as their temporary password.</span>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs">
              <div>
                <label className="font-bold text-slate-300 block mb-1">Duplicate USN Handling Strategy</label>
                <div className="flex items-center gap-4">
                  {(['skip', 'update', 'cancel'] as const).map((strat) => (
                    <label key={strat} className="flex items-center gap-1.5 cursor-pointer text-slate-300 capitalize font-medium">
                      <input
                        type="radio"
                        name="dupStrat"
                        checked={duplicateStrategy === strat}
                        onChange={() => setDuplicateStrategy(strat)}
                        className="accent-indigo-500"
                      />
                      <span>{strat} existing</span>
                    </label>
                  ))}
                </div>
              </div>

              <button
                onClick={handleProcessImport}
                disabled={importing}
                className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 flex items-center gap-2 shrink-0"
              >
                {importing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                {importing ? 'Processing & Writing to Database...' : `Confirm Import (${rawParsedData.length} Records)`}
              </button>
            </div>

            {/* Preview Table */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Row Validation Preview (First 5 Records)
              </h4>
              <div className="overflow-x-auto rounded-xl border border-slate-800">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950 text-slate-400 font-bold uppercase text-[10px] border-b border-slate-800">
                    <tr>
                      <th className="p-3">#</th>
                      <th className="p-3">USN</th>
                      <th className="p-3">Name</th>
                      <th className="p-3">Email</th>
                      <th className="p-3">Department</th>
                      <th className="p-3">Mentor Email</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 bg-slate-900/60">
                    {rawParsedData.slice(0, 5).map((row, idx) => (
                      <tr key={idx}>
                        <td className="p-3 font-mono text-slate-500">{idx + 1}</td>
                        <td className="p-3 font-bold text-white font-mono">{row.USN || row.usn || '—'}</td>
                        <td className="p-3 font-semibold text-slate-200">{row.Name || row.name || '—'}</td>
                        <td className="p-3 text-slate-400">{row.Email || row.email || '—'}</td>
                        <td className="p-3 text-slate-400">{row.Department || row.department || 'CSE'}</td>
                        <td className="p-3 text-indigo-300 font-mono text-[11px]">{row['Mentor Email'] || row.mentorEmail || row.mentor_email || 'Unallocated'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Results Screen */}
        {result && (
          <div className="space-y-4">
            <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-emerald-950 text-emerald-400 border border-emerald-800">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-white">Database Import Completed</h4>
                  <p className="text-xs text-slate-400">Student records have been saved persistently to the active database service provider</p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-center">
                  <span className="text-slate-400 block text-[10px]">Total Rows</span>
                  <span className="font-extrabold text-white text-base">{result.totalRows}</span>
                </div>
                <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-800/60 text-center">
                  <span className="text-emerald-300 block text-[10px]">Imported New</span>
                  <span className="font-extrabold text-emerald-400 text-base">{result.successfulCount}</span>
                </div>
                <div className="p-3 rounded-xl bg-indigo-950/40 border border-indigo-800/60 text-center">
                  <span className="text-indigo-300 block text-[10px]">Updated</span>
                  <span className="font-extrabold text-indigo-400 text-base">{result.updatedCount}</span>
                </div>
                <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-800/60 text-center">
                  <span className="text-amber-300 block text-[10px]">Skipped</span>
                  <span className="font-extrabold text-amber-400 text-base">{result.skippedCount}</span>
                </div>
                <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800/60 text-center">
                  <span className="text-rose-300 block text-[10px]">Errors</span>
                  <span className="font-extrabold text-rose-400 text-base">{result.failedCount}</span>
                </div>
              </div>

              {result.errors.length > 0 && (
                <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                  <p className="text-xs text-rose-400 font-semibold">{result.errors.length} records had validation issues.</p>
                  <button
                    onClick={downloadErrorReport}
                    className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" /> Download Error CSV Report
                  </button>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => {
                  setResult(null);
                  setRawParsedData([]);
                  setFile(null);
                }}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs"
              >
                Import Another File
              </button>
              <button
                onClick={onClose}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
