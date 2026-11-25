import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Plus,
  RotateCcw,
  Save,
  Trash2,
} from 'lucide-react';
import {
  CartesianGrid,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  addCalibrationPoint,
  deleteCalibrationPoint,
  fitCalibrationCurves,
  resetCalibrationDefaults,
  updateCalibrationPoint,
} from '../services/api';

export default function CalibrationTab({ calibrationData, onCalibrationChange }) {
  const records = calibrationData?.records || [];
  const fit = calibrationData?.fit || { calibrated: false, validated_count: 0, models: {} };

  const [ntuDrafts, setNtuDrafts] = useState({});
  const [degree, setDegree] = useState(1);
  const [busyId, setBusyId] = useState('');
  const [statusMsg, setStatusMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const [newForm, setNewForm] = useState({
    sample_group: 'Standard Formazin',
    sample_label: '',
    trial: 1,
    dilution_note: '',
    diameter_2a_px: '',
    diameter_2b_px: '',
    intensity_avg: '',
    validated_ntu: '',
  });

  const validatedPoints = useMemo(
    () => records.filter((r) => r.validated_ntu !== null && r.validated_ntu !== undefined),
    [records]
  );

  const handleSaveNtu = async (rec) => {
    setBusyId(rec.id);
    setErrorMsg('');
    setStatusMsg('');
    try {
      const raw = ntuDrafts[rec.id] !== undefined ? ntuDrafts[rec.id] : rec.validated_ntu ?? '';
      const val = raw === '' ? null : Number(raw);
      if (val !== null && (Number.isNaN(val) || val < 0)) {
        setErrorMsg('Validated NTU must be a non-negative number.');
        setBusyId('');
        return;
      }
      const updated = await updateCalibrationPoint(rec.id, { validated_ntu: val });
      onCalibrationChange(updated);
      setStatusMsg(`Updated ${rec.sample_label} (Trial ${rec.trial}).`);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setBusyId('');
    }
  };

  const handleAddRecord = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setStatusMsg('');
    try {
      const updated = await addCalibrationPoint({
        ...newForm,
        trial: Number(newForm.trial) || 1,
        diameter_2a_px: Number(newForm.diameter_2a_px),
        diameter_2b_px: Number(newForm.diameter_2b_px),
        intensity_avg: Number(newForm.intensity_avg),
        validated_ntu: newForm.validated_ntu === '' ? null : Number(newForm.validated_ntu),
      });
      onCalibrationChange(updated);
      setNewForm({
        sample_group: 'Standard Formazin',
        sample_label: '',
        trial: 1,
        dilution_note: '',
        diameter_2a_px: '',
        diameter_2b_px: '',
        intensity_avg: '',
        validated_ntu: '',
      });
      setStatusMsg('Added calibration record.');
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  const handleDelete = async (recId) => {
    setBusyId(recId);
    setErrorMsg('');
    try {
      const updated = await deleteCalibrationPoint(recId);
      onCalibrationChange(updated);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setBusyId('');
    }
  };

  const handleFit = async () => {
    setErrorMsg('');
    setStatusMsg('');
    try {
      const fitRes = await fitCalibrationCurves(degree);
      onCalibrationChange({ ...calibrationData, fit: fitRes });
      setStatusMsg(fitRes.message);
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  const handleReset = async () => {
    setErrorMsg('');
    setStatusMsg('');
    try {
      const resetRes = await resetCalibrationDefaults();
      setNtuDrafts({});
      onCalibrationChange(resetRes);
      setStatusMsg('Reset to the 14 recorded Lab Notebook measurements (Distilled Water, Milk, Soap).');
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-cyan-700">
            Standard NTU Meter Validation Module
          </span>
          <h1 className="text-2xl font-bold text-slate-900">
            Experimental Calibration &amp; Regression Fitting
          </h1>
          <p className="mt-1 text-xs text-slate-600">
            Preloaded strictly with our lab notebook measurements for Distilled Water, Milk, and Soap (Salt &amp; Coffee excluded). Standard NTU meter values remain unassigned until laboratory validation.
          </p>
        </div>

        <button
          type="button"
          onClick={handleReset}
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
        >
          <RotateCcw className="h-3.5 w-3.5 text-cyan-700" />
          <span>Restore Notebook Defaults</span>
        </button>
      </div>

      {/* Calibration Status Banner */}
      <div
        className={`rounded-2xl border p-4 text-xs sm:p-5 ${
          fit.calibrated
            ? 'border-emerald-200 bg-emerald-50 text-emerald-950'
            : 'border-amber-200 bg-amber-50 text-amber-950'
        }`}
      >
        <div className="flex items-start gap-3">
          {fit.calibrated ? (
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />
          ) : (
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
          )}
          <div className="space-y-1">
            <div className="text-sm font-bold">
              {fit.calibrated
                ? `Calibration Active (${fit.validated_count} Validated NTU Points)`
                : `Calibration Pending (${fit.validated_count} / 3 Validated NTU Meter Readings Entered)`}
            </div>
            <p className="leading-relaxed">
              {fit.message ||
                'Enter validated NTU readings from a calibrated nephelometric turbidity meter alongside any sample rows below to fit separate Intensity-vs-NTU and Diameter-vs-NTU curves.'}
            </p>
          </div>
        </div>
      </div>

      {statusMsg && (
        <div className="rounded-xl border border-cyan-200 bg-cyan-50 px-4 py-2.5 text-xs font-medium text-cyan-900">
          {statusMsg}
        </div>
      )}
      {errorMsg && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs font-medium text-rose-800">
          {errorMsg}
        </div>
      )}

      {/* Notebook + Calibration Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-5 py-3.5">
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Recorded Calibration Reference Table ({records.length} entries)
            </h2>
            <p className="text-[11px] text-slate-500">
              Experimental Setup: 68 cm laser–detector distance · Cuvette 1.5 cm space / 0.4 cm border
            </p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={degree}
              onChange={(e) => setDegree(Number(e.target.value))}
              className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800"
            >
              <option value={1}>Linear Fit (Degree 1)</option>
              <option value={2}>Quadratic Fit (Degree 2)</option>
            </select>
            <button
              type="button"
              onClick={handleFit}
              className="rounded-lg bg-slate-900 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
            >
              Fit NTU Curves
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
            <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3">Sample</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">2a Horiz (px)</th>
                <th className="px-4 py-3">2b Vert (px)</th>
                <th className="px-4 py-3">Eq. Dia (px)</th>
                <th className="px-4 py-3">Distortion</th>
                <th className="px-4 py-3">Intensity (Avg)</th>
                <th className="px-4 py-3">Validated NTU (Meter)</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {records.map((rec) => {
                const draftVal =
                  ntuDrafts[rec.id] !== undefined
                    ? ntuDrafts[rec.id]
                    : rec.validated_ntu ?? '';
                return (
                  <tr key={rec.id} className="hover:bg-slate-50/80">
                    <td className="px-4 py-2.5">
                      <div className="font-semibold text-slate-900">
                        {rec.sample_label} ({rec.trial})
                      </div>
                      <div className="text-[11px] text-slate-500">{rec.dilution_note}</div>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="whitespace-nowrap rounded-md bg-slate-100 px-2 py-0.5 font-medium text-slate-700">
                        {rec.sample_group}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 font-mono tabular-nums">{rec.diameter_2a_px.toFixed(2)}</td>
                    <td className="px-4 py-2.5 font-mono tabular-nums">{rec.diameter_2b_px.toFixed(2)}</td>
                    <td className="px-4 py-2.5 font-mono tabular-nums text-cyan-800">
                      {rec.equivalent_diameter_px.toFixed(2)}
                    </td>
                    <td className="px-4 py-2.5 font-mono tabular-nums">{rec.axis_distortion_pct.toFixed(2)}%</td>
                    <td className="px-4 py-2.5 font-mono font-semibold text-slate-900 tabular-nums">
                      {rec.intensity_avg.toFixed(2)}
                    </td>
                    <td className="px-4 py-2.5">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="Pending"
                        value={draftVal}
                        onChange={(e) =>
                          setNtuDrafts((prev) => ({ ...prev, [rec.id]: e.target.value }))
                        }
                        className="w-24 rounded-lg border border-slate-300 bg-white px-2.5 py-1 font-mono text-xs text-slate-900 focus:border-cyan-600 focus:outline-none"
                      />
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleSaveNtu(rec)}
                          disabled={busyId === rec.id}
                          title="Save NTU reading"
                          className="rounded-lg border border-cyan-200 bg-cyan-50 p-1.5 text-cyan-800 hover:bg-cyan-100"
                        >
                          <Save className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(rec.id)}
                          disabled={busyId === rec.id}
                          title="Delete row"
                          className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-500 hover:border-rose-200 hover:text-rose-600"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Fitted Models Output (only when calibrated) */}
      {fit.calibrated && fit.models && (
        <div className="grid gap-4 md:grid-cols-2">
          {Object.entries(fit.models).map(([key, model]) => (
            <div key={key} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900">{model.label} → NTU</h3>
                <span className="rounded-md bg-emerald-50 px-2 py-0.5 font-mono text-xs font-bold text-emerald-700">
                  R² = {model.r2 ?? '-'}
                </span>
              </div>
              <div className="mt-2 rounded-lg bg-slate-50 p-2.5 font-mono text-xs text-slate-800">
                {model.equation}
              </div>
              <div className="mt-3 h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 8, right: 12, bottom: 8, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis type="number" dataKey={key} name={model.label} tick={{ fontSize: 10 }} />
                    <YAxis type="number" dataKey="validated_ntu" name="Validated NTU" tick={{ fontSize: 10 }} />
                    <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                    <Scatter name="Validated Points" data={validatedPoints} fill="#0891b2" />
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add New Reference Point Form */}
      <form
        onSubmit={handleAddRecord}
        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
      >
        <h3 className="mb-3 text-sm font-bold text-slate-900">
          Add New Standard / Experimental Calibration Measurement
        </h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <input
            type="text"
            required
            placeholder="Sample Label (e.g. Formazin 10 NTU)"
            value={newForm.sample_label}
            onChange={(e) => setNewForm({ ...newForm, sample_label: e.target.value })}
            className="rounded-lg border border-slate-300 px-3 py-2 text-xs"
          />
          <input
            type="text"
            placeholder="Category (e.g. Standard Formazin)"
            value={newForm.sample_group}
            onChange={(e) => setNewForm({ ...newForm, sample_group: e.target.value })}
            className="rounded-lg border border-slate-300 px-3 py-2 text-xs"
          />
          <input
            type="number"
            step="0.01"
            required
            placeholder="2a Horizontal (px)"
            value={newForm.diameter_2a_px}
            onChange={(e) => setNewForm({ ...newForm, diameter_2a_px: e.target.value })}
            className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-mono"
          />
          <input
            type="number"
            step="0.01"
            required
            placeholder="2b Vertical (px)"
            value={newForm.diameter_2b_px}
            onChange={(e) => setNewForm({ ...newForm, diameter_2b_px: e.target.value })}
            className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-mono"
          />
          <input
            type="number"
            step="0.01"
            required
            placeholder="Average Spot Intensity"
            value={newForm.intensity_avg}
            onChange={(e) => setNewForm({ ...newForm, intensity_avg: e.target.value })}
            className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-mono"
          />
          <input
            type="number"
            step="0.01"
            min="0"
            placeholder="Validated NTU (optional)"
            value={newForm.validated_ntu}
            onChange={(e) => setNewForm({ ...newForm, validated_ntu: e.target.value })}
            className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-mono"
          />
          <input
            type="text"
            placeholder="Dilution / Prep Notes"
            value={newForm.dilution_note}
            onChange={(e) => setNewForm({ ...newForm, dilution_note: e.target.value })}
            className="rounded-lg border border-slate-300 px-3 py-2 text-xs"
          />
          <button
            type="submit"
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800"
          >
            <Plus className="h-4 w-4 text-cyan-400" />
            <span>Add Entry</span>
          </button>
        </div>
      </form>
    </div>
  );
}
