import React, { useMemo, useState } from 'react';
import { Download, FileJson, FileSpreadsheet, FileText, Search, Trash2 } from 'lucide-react';
import { deleteExperiment } from '../services/api';
import { downloadCsvFromUrl, downloadExperimentPdf, downloadJson } from '../utils/exportReport';

export default function HistoryTab({ experiments = [], onRefresh }) {
  const [query, setQuery] = useState('');
  const [deletingId, setDeletingId] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return experiments;
    return experiments.filter(
      (item) =>
        (item.sample_name || '').toLowerCase().includes(q) ||
        (item.sample_group || '').toLowerCase().includes(q) ||
        (item.notes || '').toLowerCase().includes(q)
    );
  }, [experiments, query]);

  const handleDelete = async (id) => {
    setDeletingId(id);
    try {
      await deleteExperiment(id);
      if (onRefresh) await onRefresh();
    } finally {
      setDeletingId('');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-cyan-700">
            Persistent Experimental Archive
          </span>
          <h1 className="text-2xl font-bold text-slate-900">
            Saved Experimental Results &amp; Downloads
          </h1>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => downloadCsvFromUrl('/api/experiments/export/csv')}
            disabled={experiments.length === 0}
            className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-40"
          >
            <FileSpreadsheet className="h-4 w-4 text-cyan-400" />
            <span>Download All (CSV)</span>
          </button>
          <button
            type="button"
            onClick={() => downloadJson(experiments, 'turbidity_experiments.json')}
            disabled={experiments.length === 0}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-40"
          >
            <FileJson className="h-4 w-4 text-cyan-700" />
            <span>Download All (JSON)</span>
          </button>
        </div>
      </div>

      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search saved samples, categories, or notes..."
          className="w-full rounded-xl border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 focus:border-cyan-600 focus:outline-none"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
          {experiments.length === 0
            ? 'No saved experiments yet. Run an analysis in the Detection Dashboard and click "Save to Experiments".'
            : 'No saved experiments match your search filter.'}
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
              <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3">Spot</th>
                  <th className="px-4 py-3">Sample</th>
                  <th className="px-4 py-3">Shape</th>
                  <th className="px-4 py-3">Intensity (Avg)</th>
                  <th className="px-4 py-3">2a / 2b (px)</th>
                  <th className="px-4 py-3">Eq. Dia (px)</th>
                  <th className="px-4 py-3">Distortion</th>
                  <th className="px-4 py-3 text-right">Downloads / Delete</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80">
                    <td className="px-4 py-3">
                      {item.thumbnail_base64 ? (
                        <img
                          src={`data:image/png;base64,${item.thumbnail_base64}`}
                          alt={item.sample_name}
                          className="h-11 w-16 rounded-md border border-slate-200 bg-slate-950 object-contain"
                        />
                      ) : (
                        <div className="flex h-11 w-16 items-center justify-center rounded-md border border-slate-200 bg-slate-100 text-[10px] text-slate-400">
                          No Img
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900">{item.sample_name}</div>
                      <div className="text-[11px] text-slate-500">
                        {item.sample_group} · {new Date(item.saved_at).toLocaleString()}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-md bg-cyan-50 px-2 py-0.5 font-semibold text-cyan-800">
                        {item.shape}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-slate-900 tabular-nums">
                      {Number(item.intensity_avg).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 font-mono tabular-nums">
                      {Number(item.diameter_2a_px).toFixed(2)} / {Number(item.diameter_2b_px).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 font-mono font-semibold text-cyan-800 tabular-nums">
                      {Number(item.equivalent_diameter_px).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 font-mono tabular-nums">
                      {item.distortion?.circle_distortion_pct ?? 0}%
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => downloadExperimentPdf(item)}
                          title="Download PDF Report"
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          <FileText className="h-3.5 w-3.5 text-cyan-700" />
                          <span>PDF</span>
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            downloadJson(
                              item,
                              `${(item.sample_name || 'experiment').replace(/[^a-z0-9_-]+/gi, '_')}.json`
                            )
                          }
                          title="Download JSON"
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          <Download className="h-3.5 w-3.5 text-cyan-700" />
                          <span>JSON</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(item.id)}
                          disabled={deletingId === item.id}
                          title="Delete experiment"
                          className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-500 hover:border-rose-200 hover:text-rose-600"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
