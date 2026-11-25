import React, { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  BookmarkCheck,
  Camera,
  CheckCircle2,
  Download,
  FileJson,
  FileText,
  Info,
  Loader2,
  RefreshCw,
  Sliders,
  Upload,
  VideoOff,
} from 'lucide-react';
import { analyzeSpotImage, saveExperiment } from '../services/api';
import { downloadExperimentPdf, downloadJson } from '../utils/exportReport';

export default function AnalyzeTab({ onSavedExperiment }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [sampleName, setSampleName] = useState('');
  const [sampleGroup, setSampleGroup] = useState('Distilled Water');
  const [notes, setNotes] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [sMin, setSMin] = useState(100);
  const [vMin, setVMin] = useState(80);
  const [circleThresholdPct, setCircleThresholdPct] = useState(3.0);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [activeVisual, setActiveVisual] = useState('annotated');
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');

  // Camera capture state
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const startCamera = async () => {
    setCameraError('');
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError('Camera capture is not supported in this browser.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      setCameraActive(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 50);
    } catch (err) {
      setCameraError(`Unable to access camera: ${err.message}`);
    }
  };

  const captureFromCamera = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], `camera_capture_${Date.now()}.png`, { type: 'image/png' });
      handleFileSelected(file);
      stopCamera();
    }, 'image/png');
  };

  const handleFileSelected = (file) => {
    if (!file) return;
    setSelectedFile(file);
    setError('');
    setSavedMsg('');
    if (!sampleName) {
      setSampleName(file.name.replace(/\.[^/.]+$/, ''));
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const f = e.dataTransfer?.files?.[0];
    if (f) handleFileSelected(f);
  };

  const runAnalysis = async () => {
    if (!selectedFile) {
      setError('Please upload or capture an image of the laser spot first.');
      return;
    }
    setLoading(true);
    setError('');
    setSavedMsg('');
    try {
      const data = await analyzeSpotImage(selectedFile, {
        sampleName: sampleName.trim() || selectedFile.name,
        sampleGroup,
        notes,
        sMin,
        vMin,
        circleThresholdPct,
      });
      if (!data.detected) {
        setResult(null);
        setError(data.error || 'No red laser spot detected in the image.');
      } else {
        setResult(data);
        setActiveVisual('annotated');
      }
    } catch (err) {
      setError(err.message || 'Failed to analyze image.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!result) return;
    setSaving(true);
    setSavedMsg('');
    try {
      await saveExperiment({
        sample_name: result.sample_name,
        sample_group: result.sample_group,
        notes: result.notes || '',
        shape: result.shape,
        intensity_avg: result.intensity_avg,
        intensity_min: result.intensity_min,
        intensity_max: result.intensity_max,
        diameter_2a_px: result.diameter_2a_px,
        diameter_2b_px: result.diameter_2b_px,
        equivalent_diameter_px: result.equivalent_diameter_px,
        circle_diameter_px: result.circle_diameter_px,
        distortion: result.distortion,
        calibration_status: result.calibration_status,
        thumbnail_base64: result.images_base64?.thumbnail,
        annotated_image_base64: result.images_base64?.annotated,
        centroid: result.centroid,
        baseline_comparison: result.baseline_comparison,
      });
      setSavedMsg('Saved to experimental log.');
      if (onSavedExperiment) onSavedExperiment();
    } catch (err) {
      setError(err.message || 'Failed to save experiment.');
    } finally {
      setSaving(false);
    }
  };

  const visualTabs = [
    { id: 'annotated', label: 'Fitted Shape + Ideal Circle' },
    { id: 'red_mask', label: 'Red Filter Mask' },
    { id: 'intensity_region', label: 'Intensity Mask' },
    { id: 'original', label: 'Original Image' },
  ];

  const dist = result?.distortion || {};

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-cyan-700">
            OpenCV Optical Analysis Workspace
          </span>
          <h1 className="text-2xl font-bold text-slate-900">
            Laser Spot Capture &amp; Parameter Extraction
          </h1>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left: Input & Controls */}
        <div className="space-y-4 lg:col-span-5">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900">1. Image Acquisition</h2>
              <div className="flex gap-2">
                {!cameraActive ? (
                  <button
                    type="button"
                    onClick={startCamera}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-200 bg-cyan-50 px-3 py-1.5 text-xs font-semibold text-cyan-800 transition hover:bg-cyan-100"
                  >
                    <Camera className="h-3.5 w-3.5" />
                    <span>Live Camera</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={stopCamera}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700"
                  >
                    <VideoOff className="h-3.5 w-3.5" />
                    <span>Close Camera</span>
                  </button>
                )}
              </div>
            </div>

            {cameraError && (
              <div className="mb-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
                {cameraError}
              </div>
            )}

            {cameraActive ? (
              <div className="space-y-3">
                <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-950">
                  <video ref={videoRef} autoPlay playsInline muted className="h-60 w-full object-contain" />
                </div>
                <button
                  type="button"
                  onClick={captureFromCamera}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-cyan-500"
                >
                  <Camera className="h-4 w-4" />
                  <span>Capture Laser Spot Frame</span>
                </button>
              </div>
            ) : (
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-7 text-center transition hover:border-cyan-500 hover:bg-cyan-50/30"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleFileSelected(e.target.files?.[0])}
                />
                {previewUrl ? (
                  <div className="space-y-2">
                    <img
                      src={previewUrl}
                      alt="Selected laser spot"
                      className="mx-auto max-h-48 rounded-lg border border-slate-200 object-contain"
                    />
                    <p className="text-xs font-medium text-slate-600">
                      {selectedFile?.name} — click or drop to replace
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-full bg-slate-900 text-cyan-400">
                      <Upload className="h-5 w-5" />
                    </div>
                    <p className="text-sm font-semibold text-slate-800">
                      Drop laser spot image here or click to browse
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Supports PNG, JPG, JPEG captured from the white projection screen
                    </p>
                  </>
                )}
              </div>
            )}

            {/* Metadata inputs */}
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Sample Label
                </label>
                <input
                  type="text"
                  value={sampleName}
                  onChange={(e) => setSampleName(e.target.value)}
                  placeholder="e.g., Milk 300 ml Trial 1"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-cyan-600 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Sample Category
                </label>
                <select
                  value={sampleGroup}
                  onChange={(e) => setSampleGroup(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-cyan-600 focus:outline-none"
                >
                  <option value="Distilled Water">Distilled Water</option>
                  <option value="Milk">Milk Dilution</option>
                  <option value="Soap">Soap Solution</option>
                  <option value="Tap / Environmental Water">Tap / Environmental Water</option>
                  <option value="Experimental Sample">Experimental Sample</option>
                </select>
              </div>
            </div>

            <div className="mt-3">
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Experimental Notes (optional)
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Cuvette preparation, camera distance, ambient condition..."
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-cyan-600 focus:outline-none"
              />
            </div>

            {/* Collapsible HSV / Circle Distortion Tuning */}
            <div className="mt-4 border-t border-slate-100 pt-3">
              <button
                type="button"
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900"
              >
                <Sliders className="h-3.5 w-3.5 text-cyan-700" />
                <span>{showFilters ? 'Hide' : 'Show'} Red HSV &amp; Circle Tolerance Parameters</span>
              </button>

              {showFilters && (
                <div className="mt-3 grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs">
                  <div>
                    <div className="flex justify-between font-medium text-slate-700">
                      <span>HSV Saturation Floor (excludes white screen)</span>
                      <span className="font-mono text-cyan-700">S ≥ {sMin}</span>
                    </div>
                    <input
                      type="range"
                      min="20"
                      max="180"
                      value={sMin}
                      onChange={(e) => setSMin(Number(e.target.value))}
                      className="mt-1 w-full accent-cyan-600"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between font-medium text-slate-700">
                      <span>HSV Value Floor (minimum brightness)</span>
                      <span className="font-mono text-cyan-700">V ≥ {vMin}</span>
                    </div>
                    <input
                      type="range"
                      min="20"
                      max="180"
                      value={vMin}
                      onChange={(e) => setVMin(Number(e.target.value))}
                      className="mt-1 w-full accent-cyan-600"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between font-medium text-slate-700">
                      <span>Ideal Circle Axis Tolerance</span>
                      <span className="font-mono text-cyan-700">≤ {circleThresholdPct}%</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      step="0.5"
                      value={circleThresholdPct}
                      onChange={(e) => setCircleThresholdPct(Number(e.target.value))}
                      className="mt-1 w-full accent-cyan-600"
                    />
                  </div>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={runAnalysis}
              disabled={loading || !selectedFile}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin text-cyan-400" /> : <RefreshCw className="h-4 w-4 text-cyan-400" />}
              <span>{loading ? 'Processing with OpenCV...' : 'Analyze Laser Spot'}</span>
            </button>

            {error && (
              <div className="mt-3 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </div>
        </div>

        {/* Right: Results & Visualizations */}
        <div className="space-y-4 lg:col-span-7">
          {!result ? (
            <div className="flex h-full min-h-[380px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
                <Info className="h-6 w-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Awaiting Laser Spot Image</h3>
              <p className="mt-1 max-w-md text-xs leading-relaxed text-slate-500">
                Upload an image or capture one with your camera, then click{' '}
                <span className="font-semibold text-slate-700">Analyze Laser Spot</span> to extract
                Red-channel intensity, horizontal diameter (2a), vertical diameter (2b), equivalent
                diameter, and circle distortion metrics.
              </p>
            </div>
          ) : (
            <>
              {/* Calibration Status Notice */}
              <div
                className={`rounded-2xl border p-3.5 text-xs ${
                  result.calibration_status === 'calibrated'
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                    : 'border-cyan-200 bg-cyan-50/70 text-slate-800'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold">
                    {result.calibration_status === 'calibrated'
                      ? 'Validated NTU Calibration Active — Parameter estimates shown below'
                      : 'Proof-of-Concept Mode (Uncalibrated): Reporting independent optical intensity, diameter, and shape distortion without fabricated NTU claims.'}
                  </span>
                  <span className="rounded-md bg-white px-2 py-0.5 font-mono text-[11px] font-bold text-slate-900 shadow-xs">
                    Shape: {result.shape}
                  </span>
                </div>
              </div>

              {/* Separate Primary Optical Metrics */}
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Spot Intensity (Avg)
                  </div>
                  <div className="mt-1 font-mono text-2xl font-bold text-slate-900 tabular-nums">
                    {result.intensity_avg.toFixed(2)}
                  </div>
                  <div className="mt-1 font-mono text-[11px] text-slate-500">
                    Min {result.intensity_min} · Max {result.intensity_max}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    {result.shape === 'Circle' ? 'Circle Diameter (2a = 2b)' : 'Horizontal Diameter (2a)'}
                  </div>
                  <div className="mt-1 font-mono text-2xl font-bold text-slate-900 tabular-nums">
                    {result.diameter_2a_px.toFixed(2)} <span className="text-xs font-normal text-slate-500">px</span>
                  </div>
                  <div className="mt-1 font-mono text-[11px] text-slate-500">
                    Vertical (2b): {result.diameter_2b_px.toFixed(2)} px
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Equivalent Diameter
                  </div>
                  <div className="mt-1 font-mono text-2xl font-bold text-cyan-700 tabular-nums">
                    {result.equivalent_diameter_px.toFixed(2)} <span className="text-xs font-normal text-slate-500">px</span>
                  </div>
                  <div className="mt-1 font-mono text-[11px] text-slate-500">
                    Area: {result.contour_area_px2.toFixed(1)} px²
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Circle Distortion
                  </div>
                  <div className="mt-1 font-mono text-2xl font-bold text-slate-900 tabular-nums">
                    {dist.circle_distortion_pct?.toFixed(2)}%
                  </div>
                  <div className="mt-1 text-[11px] font-medium text-cyan-800">{dist.grade}</div>
                </div>
              </div>

              {/* Shape Distortion Detail Card */}
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Geometric Distortion from Ideal Circle
                  </h3>
                  <span className="font-mono text-xs text-slate-500">
                    Centroid: ({result.centroid?.x}, {result.centroid?.y}) px
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-5">
                  <div className="rounded-lg bg-slate-50 p-2.5">
                    <div className="text-slate-500">Axis Distortion</div>
                    <div className="mt-0.5 font-mono font-bold text-slate-900">{dist.axis_distortion_pct}%</div>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-2.5">
                    <div className="text-slate-500">Radial Distortion</div>
                    <div className="mt-0.5 font-mono font-bold text-slate-900">{dist.radial_distortion_pct}%</div>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-2.5">
                    <div className="text-slate-500">Eccentricity</div>
                    <div className="mt-0.5 font-mono font-bold text-slate-900">{dist.eccentricity}</div>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-2.5">
                    <div className="text-slate-500">Aspect Ratio</div>
                    <div className="mt-0.5 font-mono font-bold text-slate-900">{dist.aspect_ratio}</div>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-2.5">
                    <div className="text-slate-500">Circularity</div>
                    <div className="mt-0.5 font-mono font-bold text-slate-900">{dist.circularity}</div>
                  </div>
                </div>
              </div>

              {/* Validated NTU estimates if calibrated */}
              {result.validated_ntu_estimates && (
                <div className="rounded-2xl border border-emerald-200 bg-white p-4 shadow-sm">
                  <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-emerald-800">
                    Separate Parameter NTU Estimates (From Validated Calibration)
                  </h3>
                  <div className="grid gap-2 sm:grid-cols-4">
                    {Object.entries(result.validated_ntu_estimates).map(([key, est]) => (
                      <div key={key} className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-3 text-xs">
                        <div className="text-slate-600">{est.label}</div>
                        <div className="mt-1 font-mono text-lg font-bold text-emerald-900">
                          {est.estimated_ntu} NTU
                        </div>
                        <div className="font-mono text-[10px] text-emerald-700">R² = {est.r2}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 4-Panel Processed Visual Inspector */}
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-bold text-slate-900">Processed Optical Views</h3>
                  <div className="flex flex-wrap gap-1 rounded-lg bg-slate-100 p-1">
                    {visualTabs.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setActiveVisual(t.id)}
                        className={`rounded-md px-2.5 py-1 text-xs font-semibold transition ${
                          activeVisual === t.id
                            ? 'bg-slate-900 text-white'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-slate-950 p-3">
                  <img
                    src={`data:image/png;base64,${result.images_base64?.[activeVisual]}`}
                    alt={activeVisual}
                    className="max-h-80 rounded-lg object-contain"
                  />
                  {activeVisual === 'annotated' && (
                    <p className="mt-2 text-[11px] text-slate-300">
                      Green = Fitted Ellipse (or Blue = Fitted Circle) · Thin Cyan = Ideal Equivalent Circle · Red Dot = Centroid
                    </p>
                  )}
                </div>
              </div>

              {/* Baseline comparison against Distilled Water notebook mean */}
              {result.baseline_comparison && (
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-700">
                    Delta vs. {result.baseline_comparison.reference_label}
                  </h3>
                  <div className="grid gap-3 text-xs sm:grid-cols-4">
                    <div className="rounded-lg border border-slate-100 bg-slate-50 p-2.5">
                      <div className="text-slate-500">Intensity Δ</div>
                      <div className="mt-0.5 font-mono font-bold text-slate-900">
                        {result.baseline_comparison.intensity_avg_delta > 0 ? '+' : ''}
                        {result.baseline_comparison.intensity_avg_delta} ({result.baseline_comparison.intensity_avg_pct}%)
                      </div>
                    </div>
                    <div className="rounded-lg border border-slate-100 bg-slate-50 p-2.5">
                      <div className="text-slate-500">2a Horizontal Δ</div>
                      <div className="mt-0.5 font-mono font-bold text-slate-900">
                        {result.baseline_comparison.diameter_2a_delta > 0 ? '+' : ''}
                        {result.baseline_comparison.diameter_2a_delta} px ({result.baseline_comparison.diameter_2a_pct}%)
                      </div>
                    </div>
                    <div className="rounded-lg border border-slate-100 bg-slate-50 p-2.5">
                      <div className="text-slate-500">2b Vertical Δ</div>
                      <div className="mt-0.5 font-mono font-bold text-slate-900">
                        {result.baseline_comparison.diameter_2b_delta > 0 ? '+' : ''}
                        {result.baseline_comparison.diameter_2b_delta} px ({result.baseline_comparison.diameter_2b_pct}%)
                      </div>
                    </div>
                    <div className="rounded-lg border border-slate-100 bg-slate-50 p-2.5">
                      <div className="text-slate-500">Eq. Diameter Δ</div>
                      <div className="mt-0.5 font-mono font-bold text-slate-900">
                        {result.baseline_comparison.equivalent_diameter_delta > 0 ? '+' : ''}
                        {result.baseline_comparison.equivalent_diameter_delta} px ({result.baseline_comparison.equivalent_diameter_pct}%)
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Save & Export Actions */}
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
                  >
                    <BookmarkCheck className="h-4 w-4 text-cyan-400" />
                    <span>{saving ? 'Saving...' : 'Save to Experiments'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => downloadExperimentPdf(result)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50"
                  >
                    <FileText className="h-4 w-4 text-cyan-700" />
                    <span>Download PDF Report</span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      downloadJson(
                        result,
                        `${(result.sample_name || 'sample').replace(/[^a-z0-9_-]+/gi, '_')}.json`
                      )
                    }
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50"
                  >
                    <FileJson className="h-4 w-4 text-cyan-700" />
                    <span>Download JSON</span>
                  </button>
                </div>
                {savedMsg && (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
                    <CheckCircle2 className="h-4 w-4" />
                    {savedMsg}
                  </span>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
