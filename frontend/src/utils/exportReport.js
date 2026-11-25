import { jsPDF } from 'jspdf';

export function downloadJson(data, filename = 'optical_turbidity_result.json') {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function downloadCsvFromUrl(url = '/api/experiments/export/csv') {
  const a = document.createElement('a');
  a.href = url;
  a.download = 'turbidity_experiments.csv';
  a.click();
}

export function downloadExperimentPdf(result) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const margin = 15;
  let y = 16;

  // Header bar (Navy Blue)
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, 210, 26, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('Optical Laser Water Turbidity Analysis Report', margin, 11);
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(103, 232, 249);
  doc.text('An Optical System and Method for Determining Water Turbidity Using Laser Illumination and Image Analysis', margin, 18);

  y = 35;
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(`Sample: ${result.sample_name || 'Untitled Sample'} (${result.sample_group || 'Sample'})`, margin, y);
  y += 6;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`Timestamp: ${result.saved_at || new Date().toISOString()}`, margin, y);
  y += 5;
  if (result.notes) {
    doc.text(`Notes: ${result.notes}`, margin, y);
    y += 6;
  }

  // Calibration disclaimer box
  doc.setFillColor(236, 254, 255);
  doc.setDrawColor(8, 145, 178);
  doc.roundedRect(margin, y, 180, 14, 2, 2, 'FD');
  doc.setFontSize(8.5);
  doc.setTextColor(14, 116, 144);
  const statusText =
    result.calibration_status === 'calibrated'
      ? 'Calibration Status: Calibrated against entered standard NTU meter readings.'
      : 'Calibration Status: Uncalibrated (Proof of Concept) — Raw measured optical parameters only. No NTU claim made.';
  doc.text(statusText, margin + 3, y + 8.5);
  y += 20;

  // Annotated image if available
  const imgB64 = result.images_base64?.annotated || result.annotated_image_base64;
  if (imgB64) {
    try {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text('Detected Laser Spot (Fitted Shape & Ideal Circle Reference)', margin, y);
      y += 4;
      doc.addImage(`data:image/png;base64,${imgB64}`, 'PNG', margin, y, 82, 58);
    } catch {
      // skip if image fails to embed
    }
  }

  // Separate parameter table on the right or below
  const startX = imgB64 ? margin + 90 : margin;
  let py = y + 4;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('Extracted Optical Parameters', startX, py);
  py += 6;

  const dist = result.distortion || {};
  const rows = [
    ['Detected Shape', String(result.shape || '-')],
    ['Spot Intensity (Avg)', `${result.intensity_avg ?? '-'} (0-255 R)`],
    ['Intensity Min / Max', `${result.intensity_min ?? '-'} / ${result.intensity_max ?? '-'}`],
    ['Horizontal Diameter (2a)', `${result.diameter_2a_px ?? '-'} px`],
    ['Vertical Diameter (2b)', `${result.diameter_2b_px ?? '-'} px`],
    ['Equivalent Diameter', `${result.equivalent_diameter_px ?? '-'} px`],
    ['Circle Distortion', `${dist.circle_distortion_pct ?? '-'} %`],
    ['Axis / Radial Distortion', `${dist.axis_distortion_pct ?? '-'}% / ${dist.radial_distortion_pct ?? '-'}%`],
    ['Eccentricity / Circularity', `${dist.eccentricity ?? '-'} / ${dist.circularity ?? '-'}`],
  ];

  doc.setFontSize(8.5);
  rows.forEach(([k, v]) => {
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(`${k}:`, startX, py);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(v, startX + 46, py);
    py += 5.5;
  });

  y = Math.max(y + 66, py + 8);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(
    'Government Hydro Engineering College, Bandla, Bilaspur (H.P.) — Optical Turbidity Research Project',
    margin,
    285
  );

  const safeName = (result.sample_name || 'turbidity_report').replace(/[^a-z0-9_-]+/gi, '_');
  doc.save(`${safeName}_report.pdf`);
}
