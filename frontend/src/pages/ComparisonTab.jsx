import React, { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

export default function ComparisonTab({ groupSummaries = [], savedExperiments = [] }) {
  const [sourceFilter, setSourceFilter] = useState('all');

  const chartData = useMemo(() => {
    const notebookRows = groupSummaries.map((g) => ({
      name: g.sample_label,
      group: g.sample_group,
      source: 'Lab Notebook',
      intensity_avg: g.mean_intensity_avg,
      diameter_2a: g.mean_2a_px,
      diameter_2b: g.mean_2b_px,
      equivalent_diameter: g.mean_equivalent_diameter_px,
      distortion_pct: g.mean_axis_distortion_pct,
    }));

    const expRows = savedExperiments.map((e) => ({
      name: e.sample_name,
      group: e.sample_group,
      source: 'Saved Capture',
      intensity_avg: e.intensity_avg,
      diameter_2a: e.diameter_2a_px,
      diameter_2b: e.diameter_2b_px,
      equivalent_diameter: e.equivalent_diameter_px,
      distortion_pct: e.distortion?.circle_distortion_pct ?? 0,
    }));

    if (sourceFilter === 'notebook') return notebookRows;
    if (sourceFilter === 'saved') return expRows;
    return [...notebookRows, ...expRows];
  }, [groupSummaries, savedExperiments, sourceFilter]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-cyan-700">
            Independent Parameter Comparison
          </span>
          <h1 className="text-2xl font-bold text-slate-900">
            Water Sample Comparison Graphs
          </h1>
          <p className="mt-1 text-xs text-slate-600">
            Spot intensity and spot diameters (2a, 2b, Equivalent Diameter) are plotted separately across Distilled Water, Milk, and Soap datasets (Salt &amp; Coffee excluded).
          </p>
        </div>

        <div className="flex gap-1 rounded-xl border border-slate-200 bg-white p-1">
          {[
            { id: 'all', label: 'All Samples' },
            { id: 'notebook', label: 'Lab Notebook (Mean)' },
            { id: 'saved', label: `Saved Captures (${savedExperiments.length})` },
          ].map((btn) => (
            <button
              key={btn.id}
              type="button"
              onClick={() => setSourceFilter(btn.id)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                sourceFilter === btn.id
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      {chartData.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
          No samples match the selected filter yet. Save an analysis in the Detection Dashboard or switch to Lab Notebook view.
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Graph 1: Spot Intensity Only */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-bold text-slate-900">
              1. Spot Intensity Comparison (Average Red-Channel Intensity)
            </h2>
            <p className="mb-4 text-xs text-slate-500">
              Higher dilution (e.g., 400 ml vs 200 ml milk/soap) retains higher transmitted spot brightness.
            </p>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 10.5, fill: '#334155' }} angle={-22} textAnchor="end" height={64} interval={0} />
                  <YAxis tick={{ fontSize: 11, fill: '#334155' }} domain={[0, 255]} />
                  <Tooltip />
                  <Legend verticalAlign="top" height={32} wrapperStyle={{ fontSize: '12px' }} />
                  <Bar dataKey="intensity_avg" name="Spot Intensity (0–255)" fill="#0f172a" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Graph 2: Horizontal (2a), Vertical (2b), and Equivalent Diameter */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-bold text-slate-900">
              2. Laser Spot Diameters (2a, 2b &amp; Equivalent Diameter in px)
            </h2>
            <p className="mb-4 text-xs text-slate-500">
              Horizontal (2a), Vertical (2b), and Equivalent Diameter plotted separately from intensity.
            </p>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 10.5, fill: '#334155' }} angle={-22} textAnchor="end" height={64} interval={0} />
                  <YAxis tick={{ fontSize: 11, fill: '#334155' }} />
                  <Tooltip />
                  <Legend verticalAlign="top" height={32} wrapperStyle={{ fontSize: '12px' }} />
                  <Bar dataKey="diameter_2a" name="2a Horizontal (px)" fill="#0891b2" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="diameter_2b" name="2b Vertical (px)" fill="#1e3a8a" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="equivalent_diameter" name="Equivalent D (px)" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Graph 3: Circle Distortion % */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
            <h2 className="text-sm font-bold text-slate-900">
              3. Shape Distortion from Ideal Circle (%) Across Samples
            </h2>
            <p className="mb-4 text-xs text-slate-500">
              Quantifies deviation between 2a and 2b (plus radial irregularity for live captures).
            </p>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 16, left: 0, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#334155' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#334155' }} unit="%" />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Bar dataKey="distortion_pct" name="Circle Distortion (%)" fill="#0e7490" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
