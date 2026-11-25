"""
FastAPI backend for:
"An Optical System and Method for Determining Water Turbidity Using Laser Illumination and Image Analysis"
"""

import base64
import os
from typing import List, Optional
import cv2
import numpy as np
from fastapi import APIRouter, Body, FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, Response
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from calibration_store import calibration_store
from config import OPTICAL_APPARATUS, get_default_settings
from experiments_store import experiments_store
from image_processing import analyze_laser_spot

app = FastAPI(
    title="Optical Laser Water Turbidity Analysis API",
    version="1.0.0",
    description=OPTICAL_APPARATUS["title"],
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

router = APIRouter(prefix="/api")

DETECTION_SETTINGS = get_default_settings()


def _decode_image(file_bytes: bytes) -> Optional[np.ndarray]:
    if not file_bytes:
        return None
    np_arr = np.frombuffer(file_bytes, np.uint8)
    return cv2.imdecode(np_arr, cv2.IMREAD_COLOR)


def _encode_png_b64(img: np.ndarray) -> str:
    _, buf = cv2.imencode(".png", img)
    return base64.b64encode(buf).decode("utf-8")


def _make_thumbnail_b64(img: np.ndarray, target_h: int = 120) -> str:
    h, w = img.shape[:2]
    if h <= 0 or w <= 0:
        return _encode_png_b64(img)
    scale = target_h / float(h)
    thumb = cv2.resize(img, (max(1, int(round(w * scale))), target_h))
    return _encode_png_b64(thumb)


def _compute_baseline_deltas(result: dict) -> Optional[dict]:
    baseline = calibration_store.get_distilled_baseline_summary()
    if not baseline:
        return None

    def pct(curr: float, ref: float) -> float:
        return round(((curr - ref) / ref) * 100.0, 2) if ref != 0 else 0.0

    return {
        "reference_label": f"Distilled Water Mean (n={baseline['count']})",
        "reference_values": baseline,
        "intensity_avg_delta": round(result["intensity_avg"] - baseline["mean_intensity_avg"], 2),
        "intensity_avg_pct": pct(result["intensity_avg"], baseline["mean_intensity_avg"]),
        "diameter_2a_delta": round(result["diameter_2a_px"] - baseline["mean_2a_px"], 2),
        "diameter_2a_pct": pct(result["diameter_2a_px"], baseline["mean_2a_px"]),
        "diameter_2b_delta": round(result["diameter_2b_px"] - baseline["mean_2b_px"], 2),
        "diameter_2b_pct": pct(result["diameter_2b_px"], baseline["mean_2b_px"]),
        "equivalent_diameter_delta": round(
            result["equivalent_diameter_px"] - baseline["mean_equivalent_diameter_px"], 2
        ),
        "equivalent_diameter_pct": pct(
            result["equivalent_diameter_px"], baseline["mean_equivalent_diameter_px"]
        ),
    }


def _format_analysis_response(
    raw: dict,
    sample_name: str,
    sample_group: str,
    notes: str,
) -> dict:
    imgs = raw["images"]
    calibration_fit = calibration_store.fit_validated_models()
    ntu_estimates = calibration_store.estimate_ntu_if_calibrated(raw)

    return {
        "sample_name": sample_name,
        "sample_group": sample_group,
        "notes": notes,
        "shape": raw["shape"],
        "centroid": raw["centroid"],
        "intensity_avg": raw["intensity_avg"],
        "intensity_min": raw["intensity_min"],
        "intensity_max": raw["intensity_max"],
        "diameter_2a_px": raw["diameter_2a_px"],
        "diameter_2b_px": raw["diameter_2b_px"],
        "circle_diameter_px": raw["circle_diameter_px"],
        "equivalent_diameter_px": raw["equivalent_diameter_px"],
        "ellipse_equivalent_diameter_px": raw["ellipse_equivalent_diameter_px"],
        "major_axis_px": raw["major_axis_px"],
        "minor_axis_px": raw["minor_axis_px"],
        "ellipse_angle_deg": raw["ellipse_angle_deg"],
        "contour_area_px2": raw["contour_area_px2"],
        "contour_perimeter_px": raw["contour_perimeter_px"],
        "distortion": raw["distortion"],
        "baseline_comparison": _compute_baseline_deltas(raw),
        "calibration_status": "calibrated" if calibration_fit["calibrated"] else "uncalibrated",
        "validated_ntu_estimates": ntu_estimates,
        "images_base64": {
            "original": _encode_png_b64(imgs["original"]),
            "red_mask": _encode_png_b64(imgs["red_mask"]),
            "intensity_region": _encode_png_b64(imgs["intensity_region"]),
            "annotated": _encode_png_b64(imgs["annotated"]),
            "thumbnail": _make_thumbnail_b64(imgs["annotated"]),
        },
    }


@router.get("/health")
async def health():
    return {"status": "ok", "apparatus": OPTICAL_APPARATUS}


@router.get("/apparatus")
async def get_apparatus():
    return OPTICAL_APPARATUS


@router.post("/analyze")
async def analyze_image(
    file: UploadFile = File(...),
    sample_name: str = Form("Untitled Sample"),
    sample_group: str = Form("Experimental Sample"),
    notes: str = Form(""),
    save_to_history: bool = Form(False),
    s_min: Optional[int] = Form(None),
    v_min: Optional[int] = Form(None),
    circle_distortion_threshold_pct: Optional[float] = Form(None),
):
    contents = await file.read()
    image = _decode_image(contents)
    if image is None:
        raise HTTPException(status_code=400, detail="Invalid or unreadable image file.")

    custom_settings = dict(DETECTION_SETTINGS)
    if s_min is not None or v_min is not None:
        s_val = int(s_min) if s_min is not None else custom_settings["lower_red1"][1]
        v_val = int(v_min) if v_min is not None else custom_settings["lower_red1"][2]
        custom_settings["lower_red1"] = [custom_settings["lower_red1"][0], s_val, v_val]
        custom_settings["lower_red2"] = [custom_settings["lower_red2"][0], s_val, v_val]
    if circle_distortion_threshold_pct is not None:
        custom_settings["circle_distortion_threshold_pct"] = float(circle_distortion_threshold_pct)

    raw = analyze_laser_spot(image, settings=custom_settings)
    if raw is None:
        return {
            "detected": False,
            "error": "No red laser spot detected.",
            "suggestion": "Verify red laser alignment on the white screen or adjust HSV saturation/value thresholds.",
        }

    response = _format_analysis_response(raw, sample_name=sample_name, sample_group=sample_group, notes=notes)
    response["detected"] = True

    if save_to_history:
        saved = experiments_store.save_experiment({
            k: v for k, v in response.items()
            if k != "images_base64"
        } | {
            "thumbnail_base64": response["images_base64"]["thumbnail"],
            "annotated_image_base64": response["images_base64"]["annotated"],
        })
        response["saved_experiment_id"] = saved["id"]

    return response


@router.post("/analyze/batch")
async def analyze_batch(
    files: List[UploadFile] = File(...),
    sample_group: str = Form("Batch Sample"),
):
    results = []
    for f in files:
        contents = await f.read()
        img = _decode_image(contents)
        if img is None:
            results.append({"filename": f.filename, "detected": False, "error": "Invalid image"})
            continue
        raw = analyze_laser_spot(img, settings=DETECTION_SETTINGS)
        if raw is None:
            results.append({"filename": f.filename, "detected": False, "error": "No red spot detected"})
            continue
        formatted = _format_analysis_response(
            raw,
            sample_name=os.path.splitext(f.filename or "Sample")[0],
            sample_group=sample_group,
            notes="Batch upload",
        )
        formatted["filename"] = f.filename
        formatted["detected"] = True
        results.append(formatted)
    return {"count": len(results), "results": results}


@router.get("/experiments")
async def list_experiments():
    return {"items": experiments_store.list_experiments()}


class SaveExperimentRequest(BaseModel):
    sample_name: str
    sample_group: str = "Experimental Sample"
    notes: str = ""
    shape: str
    intensity_avg: float
    intensity_min: float
    intensity_max: float
    diameter_2a_px: float
    diameter_2b_px: float
    equivalent_diameter_px: float
    circle_diameter_px: Optional[float] = None
    distortion: dict
    calibration_status: str = "uncalibrated"
    thumbnail_base64: Optional[str] = None
    annotated_image_base64: Optional[str] = None
    centroid: Optional[dict] = None
    baseline_comparison: Optional[dict] = None


@router.post("/experiments")
async def save_experiment(req: SaveExperimentRequest):
    saved = experiments_store.save_experiment(req.model_dump())
    return {"status": "saved", "experiment": saved}


@router.delete("/experiments/{exp_id}")
async def delete_experiment(exp_id: str):
    if not experiments_store.delete_experiment(exp_id):
        raise HTTPException(status_code=404, detail="Experiment record not found.")
    return {"status": "deleted", "id": exp_id}


@router.get("/experiments/export/csv")
async def export_experiments_csv():
    csv_text = experiments_store.export_csv()
    return Response(
        content=csv_text,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=turbidity_experiments.csv"},
    )


@router.get("/calibration")
async def get_calibration():
    return {
        "records": calibration_store.list_records(),
        "group_summaries": calibration_store.get_group_summaries(),
        "distilled_baseline": calibration_store.get_distilled_baseline_summary(),
        "fit": calibration_store.fit_validated_models(),
    }


@router.post("/calibration")
async def add_calibration_record(payload: dict = Body(...)):
    required = ("diameter_2a_px", "diameter_2b_px", "intensity_avg")
    for field in required:
        if field not in payload:
            raise HTTPException(status_code=400, detail=f"Missing required field: {field}")
    rec = calibration_store.add_record(payload)
    return {
        "record": rec,
        "records": calibration_store.list_records(),
        "group_summaries": calibration_store.get_group_summaries(),
        "fit": calibration_store.fit_validated_models(),
    }


@router.put("/calibration/{rec_id}")
async def update_calibration_record(rec_id: str, payload: dict = Body(...)):
    updated = calibration_store.update_record(rec_id, payload)
    if updated is None:
        raise HTTPException(status_code=404, detail="Calibration record not found.")
    return {
        "record": updated,
        "records": calibration_store.list_records(),
        "group_summaries": calibration_store.get_group_summaries(),
        "fit": calibration_store.fit_validated_models(),
    }


@router.delete("/calibration/{rec_id}")
async def delete_calibration_record(rec_id: str):
    if not calibration_store.delete_record(rec_id):
        raise HTTPException(status_code=404, detail="Calibration record not found.")
    return {
        "records": calibration_store.list_records(),
        "group_summaries": calibration_store.get_group_summaries(),
        "fit": calibration_store.fit_validated_models(),
    }


@router.post("/calibration/fit")
async def fit_calibration(degree: int = Body(1, embed=True)):
    return calibration_store.fit_validated_models(degree=degree)


@router.post("/calibration/reset")
async def reset_calibration():
    records = calibration_store.reset_to_notebook_defaults()
    return {
        "records": records,
        "group_summaries": calibration_store.get_group_summaries(),
        "fit": calibration_store.fit_validated_models(),
    }


@router.get("/settings")
async def get_settings():
    return DETECTION_SETTINGS


@router.put("/settings")
async def update_settings(payload: dict = Body(...)):
    for key in (
        "lower_red1",
        "upper_red1",
        "lower_red2",
        "upper_red2",
        "morph_kernel_size",
        "morph_open_iterations",
        "min_contour_area",
        "circle_distortion_threshold_pct",
    ):
        if key in payload:
            DETECTION_SETTINGS[key] = payload[key]
    return {"status": "updated", "settings": DETECTION_SETTINGS}


app.include_router(router)

# Serve built React frontend if present
_FRONTEND_DIST = os.path.join(os.path.dirname(__file__), "..", "frontend", "dist")
if os.path.isdir(_FRONTEND_DIST):
    _ASSETS_DIR = os.path.join(_FRONTEND_DIST, "assets")
    if os.path.isdir(_ASSETS_DIR):
        app.mount("/assets", StaticFiles(directory=_ASSETS_DIR), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    async def spa_fallback(full_path: str):
        return FileResponse(os.path.join(_FRONTEND_DIST, "index.html"))
