import React from 'react';

export default function OpticalDiagram() {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-cyan-700">
            Experimental Optical Bench Schematic
          </span>
          <h3 className="text-base font-bold text-slate-900">
            Laser Transmission &amp; Screen Spot Acquisition Path
          </h3>
        </div>
        <div className="flex flex-wrap gap-2 text-xs text-slate-600">
          <span className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 font-mono">
            Laser–Detector Distance: 68 cm
          </span>
          <span className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 font-mono">
            Cuvette: 1.5 cm space · 0.4 cm border
          </span>
        </div>
      </div>

      <svg
        viewBox="0 0 920 250"
        className="w-full h-auto"
        role="img"
        aria-label="Optical turbidity measurement setup showing red laser, water cuvette, white projection screen, camera, and OpenCV analysis"
      >
        <defs>
          <linearGradient id="beamGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ef4444" stopOpacity="0.95" />
            <stop offset="55%" stopColor="#ef4444" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#f87171" stopOpacity="0.65" />
          </linearGradient>
          <radialGradient id="spotGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#dc2626" stopOpacity="0.95" />
            <stop offset="55%" stopColor="#ef4444" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Optical rail */}
        <rect x="35" y="182" width="850" height="10" rx="5" fill="#0f172a" />
        <line x1="60" y1="205" x2="590" y2="205" stroke="#0891b2" strokeWidth="1.5" strokeDasharray="5 4" />
        <text x="325" y="224" textAnchor="middle" fill="#0e7490" fontSize="12" fontWeight="600">
          Recorded Optical Path ≈ 68 cm
        </text>

        {/* Red Laser Source */}
        <rect x="40" y="92" width="110" height="56" rx="8" fill="#0f172a" />
        <rect x="148" y="110" width="14" height="20" rx="2" fill="#334155" />
        <text x="95" y="116" textAnchor="middle" fill="#ffffff" fontSize="12" fontWeight="700">
          RED LASER
        </text>
        <text x="95" y="133" textAnchor="middle" fill="#67e8f9" fontSize="10">
          Diode Source
        </text>
        <rect x="85" y="148" width="20" height="34" fill="#475569" />

        {/* Laser Beam Pre-Cuvette */}
        <line x1="162" y1="120" x2="310" y2="120" stroke="url(#beamGrad)" strokeWidth="5" />

        {/* Cuvette with Water Sample */}
        <rect x="302" y="64" width="84" height="106" rx="4" fill="#ecfeff" stroke="#0891b2" strokeWidth="3" />
        <rect x="308" y="84" width="72" height="81" fill="#bae6fd" fillOpacity="0.7" />
        <text x="344" y="54" textAnchor="middle" fill="#0f172a" fontSize="11" fontWeight="700">
          Water Cuvette
        </text>
        <text x="344" y="156" textAnchor="middle" fill="#0e7490" fontSize="9" fontWeight="600">
          1.5 cm · 0.4 cm
        </text>
        <rect x="334" y="170" width="20" height="12" fill="#475569" />

        {/* Scattered Beam Cone Post-Cuvette */}
        <polygon points="386,117 595,94 595,146 386,123" fill="#ef4444" fillOpacity="0.22" />
        <line x1="386" y1="120" x2="595" y2="120" stroke="#ef4444" strokeWidth="3" strokeOpacity="0.85" />

        {/* White Projection Screen */}
        <rect x="595" y="50" width="24" height="132" rx="3" fill="#ffffff" stroke="#0f172a" strokeWidth="2.5" />
        <circle cx="607" cy="120" r="18" fill="url(#spotGlow)" />
        <ellipse cx="607" cy="120" rx="8" ry="11" fill="#dc2626" />
        <text x="607" y="38" textAnchor="middle" fill="#0f172a" fontSize="11" fontWeight="700">
          White Screen
        </text>

        {/* Camera Capture */}
        <line x1="622" y1="120" x2="710" y2="120" stroke="#0891b2" strokeWidth="2" strokeDasharray="4 3" />
        <rect x="710" y="90" width="84" height="60" rx="8" fill="#1e293b" />
        <circle cx="728" cy="120" r="12" fill="#0891b2" />
        <circle cx="728" cy="120" r="6" fill="#0f172a" />
        <text x="765" y="116" textAnchor="middle" fill="#ffffff" fontSize="11" fontWeight="700">
          Camera
        </text>
        <text x="765" y="132" textAnchor="middle" fill="#94a3b8" fontSize="9.5">
          Capture
        </text>
        <rect x="744" y="150" width="16" height="32" fill="#475569" />

        {/* Python / OpenCV Analysis Box */}
        <line x1="794" y1="120" x2="820" y2="120" stroke="#0891b2" strokeWidth="2" />
        <rect x="820" y="76" width="80" height="88" rx="8" fill="#f0f9ff" stroke="#0891b2" strokeWidth="1.5" />
        <text x="860" y="99" textAnchor="middle" fill="#0f172a" fontSize="10.5" fontWeight="700">
          OpenCV
        </text>
        <text x="860" y="115" textAnchor="middle" fill="#0e7490" fontSize="9.5">
          Intensity
        </text>
        <text x="860" y="129" textAnchor="middle" fill="#0e7490" fontSize="9.5">
          2a · 2b · Eq D
        </text>
        <text x="860" y="143" textAnchor="middle" fill="#0e7490" fontSize="9.5">
          Distortion %
        </text>
      </svg>
    </div>
  );
}
