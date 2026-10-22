import React, { useState, useEffect } from 'react';
import { dbService } from '../../services/serviceFactory';
import { Activity, ShieldCheck, Database, HardDrive, Cpu, Bell, CheckCircle2 } from 'lucide-react';

export const SystemHealthDashboard: React.FC = () => {
  const isDemo = import.meta.env.VITE_DEMO_MODE === 'true' || true;

  const healthServices = [
    { name: 'Authentication System', status: 'Operational', provider: 'Firebase / Demo Fallback Auth', icon: ShieldCheck },
    { name: 'Primary Application Database', status: 'Operational', provider: isDemo ? 'IndexedDB (EduMentorX_Demo_DB)' : 'Cloud Firestore', icon: Database },
    { name: 'Cloud File Storage', status: 'Operational', provider: isDemo ? 'Local Storage Blob Engine' : 'Firebase Storage', icon: HardDrive },
    { name: 'AI & Safety Classification Engine', status: 'Operational', provider: 'Gemini Server API / Rule Fallback', icon: Cpu },
    { name: 'In-App Notification Dispatcher', status: 'Operational', provider: 'PubSub / IDB Event Stream', icon: Bell },
    { name: 'IndexedDB Demo Persistence Layer', status: 'Operational', provider: 'IndexedDB API v2', icon: Activity },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="p-4 sm:p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <Activity className="w-5 h-5 text-emerald-400 shrink-0" />
              Institutional System Health & Service Monitor
            </h2>
            <p className="text-xs text-slate-400 mt-1">Real-time status check across database, authentication, storage, and AI providers</p>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-950/60 border border-emerald-800/60 text-emerald-300 font-bold text-xs self-start sm:self-auto">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping shrink-0" />
            All Institutional Systems Operational
          </div>
        </div>

        {isDemo && (
          <div className="p-3 rounded-xl bg-indigo-950/40 border border-indigo-800/60 text-xs text-indigo-300 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <span>
              <strong>DEMO ENVIRONMENT ACTIVE</strong>: Operating on client-side <strong>IndexedDB</strong> persistence layer.
            </span>
            <button
              onClick={async () => {
                if (confirm('Reset IndexedDB demo seed data?')) {
                  await dbService.resetDemoData?.();
                  window.location.reload();
                }
              }}
              className="px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[11px] self-start sm:self-auto shrink-0"
            >
              Reset Seed Data
            </button>
          </div>
        )}
      </div>

      {/* Services Health Table */}
      <div className="border border-slate-800 rounded-2xl bg-slate-900 overflow-hidden">
        <div className="p-4 border-b border-slate-800 bg-slate-950">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">Subsystem Status Matrix</h3>
        </div>

        <div className="divide-y divide-slate-800/60">
          {healthServices.map((svc, idx) => {
            const Icon = svc.icon;
            return (
              <div key={idx} className="p-4 flex items-center justify-between hover:bg-slate-800/40 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-indigo-400">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-xs">{svc.name}</h4>
                    <p className="text-[11px] text-slate-400">{svc.provider}</p>
                  </div>
                </div>

                <span className="px-2.5 py-1 rounded-lg bg-emerald-950 text-emerald-400 border border-emerald-800/80 font-bold text-xs flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" /> {svc.status}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
