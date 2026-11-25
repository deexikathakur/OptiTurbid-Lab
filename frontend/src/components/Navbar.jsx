import React from 'react';
import {
  Activity,
  BarChart3,
  BookOpen,
  Database,
  Microscope,
  SlidersHorizontal,
} from 'lucide-react';

const NAV_ITEMS = [
  { id: 'landing', label: 'Project Overview', icon: BookOpen },
  { id: 'analyze', label: 'Detection Dashboard', icon: Microscope },
  { id: 'compare', label: 'Sample Graphs', icon: BarChart3 },
  { id: 'calibration', label: 'Calibration (NTU)', icon: SlidersHorizontal },
  { id: 'history', label: 'Saved Results', icon: Database },
];

export default function Navbar({ activeTab, setActiveTab, calibrated, backendOnline }) {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <button
          type="button"
          onClick={() => setActiveTab('landing')}
          className="flex items-center gap-3 text-left"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-cyan-400 shadow-sm">
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold tracking-tight text-slate-900 sm:text-base">
                OptiTurbid Lab
              </span>
              <span className="hidden rounded-full border border-cyan-200 bg-cyan-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-cyan-700 sm:inline-block">
                Proof of Concept
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Laser Illumination &amp; Image Analysis System
            </p>
          </div>
        </button>

        <nav className="flex flex-wrap items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${
                  active
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-white hover:text-slate-900'
                }`}
              >
                <Icon className={`h-3.5 w-3.5 ${active ? 'text-cyan-400' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${
              calibrated
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                : 'border-amber-200 bg-amber-50 text-amber-800'
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                calibrated ? 'bg-emerald-500' : 'bg-amber-500'
              }`}
            />
            {calibrated ? 'NTU Calibrated' : 'Uncalibrated (Raw Optical)'}
          </span>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${
              backendOnline
                ? 'border-cyan-200 bg-cyan-50 text-cyan-800'
                : 'border-rose-200 bg-rose-50 text-rose-700'
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                backendOnline ? 'bg-cyan-500' : 'bg-rose-500'
              }`}
            />
            {backendOnline ? 'OpenCV API Ready' : 'API Offline'}
          </span>
        </div>
      </div>
    </header>
  );
}
