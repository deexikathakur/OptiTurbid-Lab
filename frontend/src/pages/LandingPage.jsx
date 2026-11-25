import React from 'react';
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Camera,
  CheckCircle2,
  Cpu,
  Download,
  Eye,
  Focus,
  Layers,
  Microscope,
  SlidersHorizontal,
} from 'lucide-react';
import OpticalDiagram from '../components/OpticalDiagram';

export default function LandingPage({ onNavigate, apparatus, calibrationSummary }) {
  const params = [
    {
      title: 'Spot Intensity (Avg / Min / Max)',
      tag: 'Red Channel [R]',
      desc: 'Extracted from an untouched copy of the original image inside the fitted spot mask, isolating optical brightness changes from geometric size.',
      icon: Eye,
    },
    {
      title: 'Horizontal Diameter (2a)',
      tag: 'Spatial Metric',
      desc: 'Horizontal axis projection from ellipse fitting (or circle diameter when circularity is high), tracked independently from spot intensity.',
      icon: Focus,
    },
    {
      title: 'Vertical Diameter (2b)',
      tag: 'Spatial Metric',
      desc: 'Vertical axis projection of the detected laser spot on the white screen, capturing anisotropic beam spreading across samples.',
      icon: Layers,
    },
    {
      title: 'Equivalent Diameter & Circle Distortion',
      tag: 'Geometry & Distortion',
      desc: 'Computes area-equivalent diameter 2√(A/π) alongside eccentricity, circularity, and percentage distortion relative to an ideal circle.',
      icon: Cpu,
    },
  ];

  const pipelineSteps = [
    {
      step: '01',
      title: 'Dual-Range HSV Red Filtering',
      detail: 'Filters hue ranges [0–10] and [170–180] with saturation (S ≥ 100) and value (V ≥ 80) floors to isolate the red laser spot and exclude white screen regions.',
    },
    {
      step: '02',
      title: 'Morphological Noise Opening',
      detail: 'Applies a 3×3 morphological opening kernel to remove isolated glare specks while preserving the primary laser diffraction region.',
    },
    {
      step: '03',
      title: 'Top-Most Contour & Shape Fitting',
      detail: 'Selects the top-most contour and fits an ellipse (≥ 5 points) or enclosing circle, quantifying distortion from an ideal circle.',
    },
    {
      step: '04',
      title: 'Separate Parameter Readout',
      detail: 'Computes Red-channel intensity (Avg, Min, Max) inside the filled mask separately from 2a, 2b, and equivalent diameter.',
    },
  ];

  return (
    <div className="space-y-10 pb-12">
      {/* Hero Banner */}
      <section className="relative overflow-hidden rounded-3xl bg-slate-900 px-6 py-10 text-white shadow-lg sm:px-10 sm:py-14">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-cyan-500/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 left-1/3 h-64 w-64 rounded-full bg-cyan-400/10 blur-3xl" />

        <div className="relative max-w-4xl space-y-5">
          <div className="inline-flex flex-wrap items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-500/10 px-3.5 py-1 text-xs font-semibold text-cyan-300">
            <span>Engineering Research Project</span>
            <span className="text-cyan-500">•</span>
            <span>Government Hydro Engineering College, Bandla (H.P.)</span>
          </div>

          <h1 className="text-2xl font-extrabold leading-tight tracking-tight text-white sm:text-4xl">
            {apparatus?.title ||
              'An Optical System and Method for Determining Water Turbidity Using Laser Illumination and Image Analysis'}
          </h1>

          <p className="max-w-3xl text-sm leading-relaxed text-slate-300 sm:text-base">
            An accessible, camera-based optical bench and Python OpenCV analysis platform that directs a
            red laser through a water-filled cuvette onto a white projection screen, extracting spot
            intensity, horizontal/vertical diameters (2a, 2b), equivalent diameter, and geometric
            distortion from an ideal circle.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => onNavigate('analyze')}
              className="inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-5 py-3 text-sm font-bold text-slate-950 shadow-sm transition hover:bg-cyan-400"
            >
              <Microscope className="h-4 w-4" />
              <span>Open Detection Dashboard</span>
              <ArrowRight className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => onNavigate('compare')}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800/80 px-5 py-3 text-sm font-semibold text-white transition hover:border-cyan-500/50 hover:bg-slate-800"
            >
              <BarChart3 className="h-4 w-4 text-cyan-400" />
              <span>View Lab Notebook Graphs</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigate('calibration')}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-transparent px-4 py-3 text-sm font-semibold text-slate-200 transition hover:border-slate-500"
            >
              <SlidersHorizontal className="h-4 w-4 text-cyan-400" />
              <span>NTU Calibration Module</span>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3 border-t border-slate-800 pt-5 text-xs sm:grid-cols-4">
            <div>
              <div className="text-slate-400">Optical Path</div>
              <div className="mt-0.5 font-mono font-semibold text-cyan-300">68 cm Laser–Detector</div>
            </div>
            <div>
              <div className="text-slate-400">Cuvette Geometry</div>
              <div className="mt-0.5 font-mono font-semibold text-cyan-300">1.5 cm Space · 0.4 cm Wall</div>
            </div>
            <div>
              <div className="text-slate-400">Reference Trials</div>
              <div className="mt-0.5 font-mono font-semibold text-cyan-300">
                {calibrationSummary?.totalRecords ?? 14} Recorded (DW / Milk / Soap)
              </div>
            </div>
            <div>
              <div className="text-slate-400">NTU Status</div>
              <div className="mt-0.5 font-mono font-semibold text-amber-300">
                {calibrationSummary?.calibrated ? 'Validated Calibration' : 'Pending Meter Validation'}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Proof-of-concept disclaimer */}
      <section className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
          <div className="space-y-1 text-sm text-amber-950">
            <h2 className="font-bold">Experimental Proof-of-Concept &amp; Calibration Scope</h2>
            <p className="leading-relaxed text-amber-900">
              In accordance with our research methodology, this system reports measured optical parameters
              (<span className="font-semibold">Spot Intensity</span>,{' '}
              <span className="font-semibold">Horizontal Diameter 2a</span>,{' '}
              <span className="font-semibold">Vertical Diameter 2b</span>,{' '}
              <span className="font-semibold">Equivalent Diameter</span>, and{' '}
              <span className="font-semibold">Circle Distortion</span>) separately without fabricating
              NTU values. Quantitative NTU estimation becomes active only after entering validated
              measurements from a standard NTU turbidity meter in the Calibration Module.
            </p>
          </div>
        </div>
      </section>

      {/* Optical Setup Schematic */}
      <OpticalDiagram />

      {/* Extracted Optical Parameters */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-cyan-700">
              Independent Optical Metrics
            </span>
            <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">
              Separate Intensity, Diameter &amp; Shape Distortion Analysis
            </h2>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {params.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.title}
                className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-cyan-300"
              >
                <div>
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900 text-cyan-400">
                      <Icon className="h-4 w-4" />
                    </div>
                    <span className="rounded-md bg-cyan-50 px-2 py-0.5 text-[11px] font-semibold text-cyan-700">
                      {item.tag}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">{item.title}</h3>
                  <p className="mt-2 text-xs leading-relaxed text-slate-600">{item.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Modular Python + OpenCV Pipeline */}
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-cyan-700">
              Modular Backend Pipeline
            </span>
            <h2 className="text-xl font-bold text-slate-900">
              Python &amp; OpenCV Processing Workflow
            </h2>
          </div>
          <div className="flex flex-wrap gap-2 text-xs font-medium text-slate-600">
            <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1">
              <Camera className="h-3.5 w-3.5 text-cyan-700" /> Live Camera &amp; Upload
            </span>
            <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1">
              <Download className="h-3.5 w-3.5 text-cyan-700" /> CSV / JSON / PDF Export
            </span>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {pipelineSteps.map((s) => (
            <div key={s.step} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="font-mono text-xs font-bold text-cyan-700">STEP {s.step}</div>
              <h3 className="mt-1 text-sm font-bold text-slate-900">{s.title}</h3>
              <p className="mt-2 text-xs leading-relaxed text-slate-600">{s.detail}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Research Team Footer Card */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-cyan-700">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Research Team &amp; Institution</span>
            </div>
            <p className="text-sm font-bold text-slate-900">
              Deexika Thakur, Ankita, Swati Sharma, Shradha, Tammana Thakur
            </p>
            <p className="text-xs text-slate-600">
              Undergraduate B.Tech Students, Computer Science &amp; Engineering — Government Hydro
              Engineering College, Bandla, District Bilaspur, Himachal Pradesh – 174001
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('analyze')}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-slate-800"
          >
            <span>Start Image Analysis</span>
            <ArrowRight className="h-3.5 w-3.5 text-cyan-400" />
          </button>
        </div>
      </section>
    </div>
  );
}
