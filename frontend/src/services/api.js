const API_BASE = '/api';

async function handleResponse(res, fallbackMsg) {
  if (!res.ok) {
    let detail = fallbackMsg;
    try {
      const err = await res.json();
      if (err?.detail) detail = err.detail;
    } catch {
      // ignore json parse failure
    }
    throw new Error(detail);
  }
  return res.json();
}

export async function getHealth() {
  const res = await fetch(`${API_BASE}/health`);
  return handleResponse(res, 'Failed to reach optical backend');
}

export async function analyzeSpotImage(
  file,
  { sampleName = 'Untitled Sample', sampleGroup = 'Experimental Sample', notes = '', saveToHistory = false, sMin, vMin, circleThresholdPct } = {}
) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('sample_name', sampleName);
  formData.append('sample_group', sampleGroup);
  formData.append('notes', notes);
  formData.append('save_to_history', String(saveToHistory));
  if (sMin !== undefined && sMin !== null) formData.append('s_min', String(sMin));
  if (vMin !== undefined && vMin !== null) formData.append('v_min', String(vMin));
  if (circleThresholdPct !== undefined && circleThresholdPct !== null) {
    formData.append('circle_distortion_threshold_pct', String(circleThresholdPct));
  }

  const res = await fetch(`${API_BASE}/analyze`, {
    method: 'POST',
    body: formData,
  });
  return handleResponse(res, 'Image analysis failed');
}

export async function getExperiments() {
  const res = await fetch(`${API_BASE}/experiments`);
  return handleResponse(res, 'Failed to fetch saved experiments');
}

export async function saveExperiment(payload) {
  const res = await fetch(`${API_BASE}/experiments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handleResponse(res, 'Failed to save experiment');
}

export async function deleteExperiment(expId) {
  const res = await fetch(`${API_BASE}/experiments/${expId}`, { method: 'DELETE' });
  return handleResponse(res, 'Failed to delete experiment');
}

export async function getCalibration() {
  const res = await fetch(`${API_BASE}/calibration`);
  return handleResponse(res, 'Failed to fetch calibration dataset');
}

export async function addCalibrationPoint(payload) {
  const res = await fetch(`${API_BASE}/calibration`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handleResponse(res, 'Failed to add calibration entry');
}

export async function updateCalibrationPoint(recId, payload) {
  const res = await fetch(`${API_BASE}/calibration/${recId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handleResponse(res, 'Failed to update calibration entry');
}

export async function deleteCalibrationPoint(recId) {
  const res = await fetch(`${API_BASE}/calibration/${recId}`, { method: 'DELETE' });
  return handleResponse(res, 'Failed to delete calibration entry');
}

export async function fitCalibrationCurves(degree = 1) {
  const res = await fetch(`${API_BASE}/calibration/fit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ degree }),
  });
  return handleResponse(res, 'Failed to fit calibration curves');
}

export async function resetCalibrationDefaults() {
  const res = await fetch(`${API_BASE}/calibration/reset`, { method: 'POST' });
  return handleResponse(res, 'Failed to reset calibration dataset');
}

export async function getDetectionSettings() {
  const res = await fetch(`${API_BASE}/settings`);
  return handleResponse(res, 'Failed to load detection settings');
}
