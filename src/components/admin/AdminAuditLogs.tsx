import React, { useState, useEffect } from 'react';
import { AdminAuditLog } from '../../types';
import { dbService } from '../../services/serviceFactory';
import { ShieldCheck, Search, Filter, Clock, FileText, User } from 'lucide-react';

export const AdminAuditLogs: React.FC = () => {
  const [logs, setLogs] = useState<AdminAuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');

  useEffect(() => {
    loadAuditLogs();
  }, []);

  const loadAuditLogs = async () => {
    setLoading(true);
    try {
      const data = await dbService.getAuditLogs(100);
      setLogs(data);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter((l) => {
    const matchesSearch =
      l.actorName.toLowerCase().includes(search.toLowerCase()) ||
      l.details?.toLowerCase().includes(search.toLowerCase()) ||
      l.targetId.toLowerCase().includes(search.toLowerCase());
    const matchesAction = !actionFilter || l.action === actionFilter;
    return matchesSearch && matchesAction;
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div>
        <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-indigo-400" />
          Institutional System Audit Logs
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Immutable audit trail recording administrative actions, safety alerts, and reallocations
        </p>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search actor name, details, or target ID..."
            className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2.5 pl-9 pr-3 text-xs text-white focus:outline-none focus:border-indigo-500"
          />
        </div>
        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="bg-slate-900 border border-slate-800 rounded-xl py-2.5 px-4 text-xs text-white focus:outline-none focus:border-indigo-500"
        >
          <option value="">All Action Types</option>
          <option value="CREATE_MENTOR">CREATE_MENTOR</option>
          <option value="CREATE_STUDENT">CREATE_STUDENT</option>
          <option value="IMPORT_STUDENTS">IMPORT_STUDENTS</option>
          <option value="REASSIGN_STUDENT">REASSIGN_STUDENT</option>
          <option value="UPDATE_STUDENT">UPDATE_STUDENT</option>
          <option value="UPLOAD_RESOURCE">UPLOAD_RESOURCE</option>
          <option value="VIEW_SAFETY_ALERT">VIEW_SAFETY_ALERT</option>
          <option value="UPDATE_SAFETY_ALERT">UPDATE_SAFETY_ALERT</option>
        </select>
      </div>

      {/* Table */}
      <div className="border border-slate-800 rounded-2xl bg-slate-900/80 overflow-hidden backdrop-blur-md">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400">Loading audit log events...</div>
        ) : (
          <div className="overflow-x-auto no-scrollbar">
            <table className="w-full text-left border-collapse text-xs min-w-[700px]">
              <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase font-bold text-[11px] tracking-wider">
                <tr>
                  <th className="p-4">Timestamp</th>
                  <th className="p-4">Actor</th>
                  <th className="p-4">Action</th>
                  <th className="p-4">Target Entity</th>
                  <th className="p-4">Event Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/40 font-mono">
                    <td className="p-4 text-slate-400 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="p-4 font-sans">
                      <p className="font-bold text-white text-xs">{log.actorName}</p>
                      <span className="text-[10px] text-indigo-400 uppercase font-mono">{log.actorRole}</span>
                    </td>
                    <td className="p-4">
                      <span className="px-2.5 py-0.5 rounded bg-indigo-950 border border-indigo-800/60 text-indigo-300 font-bold text-[10px]">
                        {log.action}
                      </span>
                    </td>
                    <td className="p-4 font-sans text-slate-300">
                      {log.targetType} ({log.targetId.substring(0, 12)})
                    </td>
                    <td className="p-4 font-sans text-slate-200">{log.details || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
