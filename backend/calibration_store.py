"""
Calibration dataset & regression module.
Preloaded strictly with genuine lab-notebook measurements (Distilled Water, Milk, Soap).
Salt and Coffee measurements are intentionally excluded per research scope.
No fabricated NTU values are included; standard NTU meter validation is entered by the researcher.
"""

import json
import math
import os
import uuid
from copy import deepcopy
from typing import Optional
import numpy as np


DATA_DIR = os.path.join(os.path.dirname(__file__), "data")
CALIBRATION_FILE = os.path.join(DATA_DIR, "calibration.json")


def _make_record(
    rec_id: str,
    sample_group: str,
    sample_label: str,
    trial: int,
    dilution_note: str,
    d_2a: float,
    d_2b: float,
    intensity_avg: float,
    validated_ntu: Optional[float] = None,
    source: str = "Lab Notebook",
) -> dict:
    eq_d = round(math.sqrt(d_2a * d_2b), 2)
    distortion_pct = round((1.0 - min(d_2a, d_2b) / max(d_2a, d_2b)) * 100.0, 2)
    return {
        "id": rec_id,
        "sample_group": sample_group,
        "sample_label": sample_label,
        "trial": trial,
        "dilution_note": dilution_note,
        "shape": "Ellipse",
        "diameter_2a_px": round(d_2a, 2),
        "diameter_2b_px": round(d_2b, 2),
        "equivalent_diameter_px": eq_d,
        "axis_distortion_pct": distortion_pct,
        "intensity_avg": round(intensity_avg, 2),
        "validated_ntu": validated_ntu,
        "source": source,
    }


INITIAL_NOTEBOOK_RECORDS = [
    # Distilled Water baseline (Notebook p.4)
    _make_record("nb-dw-1", "Distilled Water", "Distilled Water", 1, "Pure reference water", 27.86, 31.28, 191.24),
    _make_record("nb-dw-2", "Distilled Water", "Distilled Water", 2, "Pure reference water", 29.32, 35.26, 196.27),
    # Milk dilution series: 1 ml milk in water (Notebook p.2 & p.3)
    _make_record("nb-milk-200-1", "Milk", "Milk 200 ml", 1, "1 ml milk in 200 ml water", 13.81, 16.66, 144.46),
    _make_record("nb-milk-200-2", "Milk", "Milk 200 ml", 2, "1 ml milk in 200 ml water", 13.62, 14.38, 134.41),
    _make_record("nb-milk-300-1", "Milk", "Milk 300 ml", 1, "1 ml milk in 300 ml water", 19.74, 22.88, 168.37),
    _make_record("nb-milk-300-2", "Milk", "Milk 300 ml", 2, "1 ml milk in 300 ml water", 20.61, 24.12, 173.78),
    _make_record("nb-milk-400-1", "Milk", "Milk 400 ml", 1, "1 ml milk in 400 ml water", 25.75, 27.80, 187.14),
    _make_record("nb-milk-400-2", "Milk", "Milk 400 ml", 2, "1 ml milk in 400 ml water", 22.32, 26.37, 180.76),
    # Soap dilution series (Notebook p.1 & p.4; crossed-out 300 entries ignored)
    _make_record("nb-soap-200-1", "Soap", "Soap 200 ml", 1, "Soap in 200 ml water", 24.04, 26.58, 183.14),
    _make_record("nb-soap-200-2", "Soap", "Soap 200 ml", 2, "Soap in 200 ml water", 22.11, 22.88, 173.80),
    _make_record("nb-soap-300-1", "Soap", "Soap 300 ml", 1, "Soap in 300 ml water", 24.89, 28.49, 184.69),
    _make_record("nb-soap-300-2", "Soap", "Soap 300 ml", 2, "Soap in 300 ml water", 22.55, 26.00, 176.81),
    _make_record("nb-soap-400-1", "Soap", "Soap 400 ml", 1, "Soap in 400 ml water", 27.74, 34.30, 194.96),
    _make_record("nb-soap-400-2", "Soap", "Soap 400 ml", 2, "Soap in 400 ml water", 29.90, 30.13, 191.17),
]


class CalibrationStore:
    def __init__(self, filepath: str = CALIBRATION_FILE):
        self.filepath = filepath
        self.records: list[dict] = []
        self._load()

    def _load(self):
        os.makedirs(os.path.dirname(self.filepath), exist_ok=True)
        if os.path.exists(self.filepath):
            try:
                with open(self.filepath, "r", encoding="utf-8") as f:
                    data = json.load(f)
                if isinstance(data, list) and len(data) > 0:
                    self.records = data
                    return
            except Exception:
                pass
        self.records = deepcopy(INITIAL_NOTEBOOK_RECORDS)
        self._save()

    def _save(self):
        os.makedirs(os.path.dirname(self.filepath), exist_ok=True)
        with open(self.filepath, "w", encoding="utf-8") as f:
            json.dump(self.records, f, indent=2)

    def list_records(self) -> list[dict]:
        return deepcopy(self.records)

    def reset_to_notebook_defaults(self) -> list[dict]:
        self.records = deepcopy(INITIAL_NOTEBOOK_RECORDS)
        self._save()
        return self.list_records()

    def add_record(self, payload: dict) -> dict:
        d_2a = float(payload["diameter_2a_px"])
        d_2b = float(payload["diameter_2b_px"])
        intensity_avg = float(payload["intensity_avg"])
        ntu_raw = payload.get("validated_ntu")
        validated_ntu = float(ntu_raw) if ntu_raw not in (None, "") else None
        rec = _make_record(
            rec_id=f"cal-{uuid.uuid4().hex[:8]}",
            sample_group=str(payload.get("sample_group", "Custom")).strip() or "Custom",
            sample_label=str(payload.get("sample_label", "Sample")).strip() or "Sample",
            trial=int(payload.get("trial", 1)),
            dilution_note=str(payload.get("dilution_note", "")).strip(),
            d_2a=d_2a,
            d_2b=d_2b,
            intensity_avg=intensity_avg,
            validated_ntu=validated_ntu,
            source=str(payload.get("source", "User Entry")).strip() or "User Entry",
        )
        self.records.append(rec)
        self._save()
        return rec

    def update_record(self, rec_id: str, updates: dict) -> Optional[dict]:
        for rec in self.records:
            if rec["id"] == rec_id:
                if "validated_ntu" in updates:
                    val = updates["validated_ntu"]
                    rec["validated_ntu"] = float(val) if val not in (None, "") else None
                for field in ("sample_group", "sample_label", "dilution_note"):
                    if field in updates and updates[field] is not None:
                        rec[field] = str(updates[field]).strip()
                for num_field in ("diameter_2a_px", "diameter_2b_px", "intensity_avg"):
                    if num_field in updates and updates[num_field] is not None:
                        rec[num_field] = round(float(updates[num_field]), 2)
                rec["equivalent_diameter_px"] = round(
                    math.sqrt(rec["diameter_2a_px"] * rec["diameter_2b_px"]), 2
                )
                rec["axis_distortion_pct"] = round(
                    (1.0 - min(rec["diameter_2a_px"], rec["diameter_2b_px"]) / max(rec["diameter_2a_px"], rec["diameter_2b_px"])) * 100.0,
                    2,
                )
                self._save()
                return deepcopy(rec)
        return None

    def delete_record(self, rec_id: str) -> bool:
        before = len(self.records)
        self.records = [r for r in self.records if r["id"] != rec_id]
        if len(self.records) < before:
            self._save()
            return True
        return False

    def get_distilled_baseline_summary(self) -> Optional[dict]:
        dw = [r for r in self.records if r["sample_group"].lower() == "distilled water"]
        if not dw:
            return None
        return {
            "count": len(dw),
            "mean_intensity_avg": round(float(np.mean([r["intensity_avg"] for r in dw])), 2),
            "mean_2a_px": round(float(np.mean([r["diameter_2a_px"] for r in dw])), 2),
            "mean_2b_px": round(float(np.mean([r["diameter_2b_px"] for r in dw])), 2),
            "mean_equivalent_diameter_px": round(float(np.mean([r["equivalent_diameter_px"] for r in dw])), 2),
            "mean_axis_distortion_pct": round(float(np.mean([r["axis_distortion_pct"] for r in dw])), 2),
        }

    def get_group_summaries(self) -> list[dict]:
        groups: dict[str, list[dict]] = {}
        for rec in self.records:
            key = rec["sample_label"]
            groups.setdefault(key, []).append(rec)

        summaries = []
        for label, rows in groups.items():
            ntu_vals = [r["validated_ntu"] for r in rows if r["validated_ntu"] is not None]
            summaries.append({
                "sample_label": label,
                "sample_group": rows[0]["sample_group"],
                "trials": len(rows),
                "mean_intensity_avg": round(float(np.mean([r["intensity_avg"] for r in rows])), 2),
                "mean_2a_px": round(float(np.mean([r["diameter_2a_px"] for r in rows])), 2),
                "mean_2b_px": round(float(np.mean([r["diameter_2b_px"] for r in rows])), 2),
                "mean_equivalent_diameter_px": round(float(np.mean([r["equivalent_diameter_px"] for r in rows])), 2),
                "mean_axis_distortion_pct": round(float(np.mean([r["axis_distortion_pct"] for r in rows])), 2),
                "mean_validated_ntu": round(float(np.mean(ntu_vals)), 2) if ntu_vals else None,
            })
        return summaries

    def fit_validated_models(self, degree: int = 1) -> dict:
        """
        Fit separate regression models (Intensity vs NTU, 2a vs NTU, 2b vs NTU,
        Equivalent Diameter vs NTU) strictly from records that have validated_ntu values.
        Never fabricates NTU claims when validated NTU points < 3.
        """
        validated = [r for r in self.records if r["validated_ntu"] is not None]
        if len(validated) < 3:
            return {
                "calibrated": False,
                "validated_count": len(validated),
                "required_count": 3,
                "message": (
                    "Uncalibrated (Proof of Concept): Enter at least 3 standard NTU turbidity meter "
                    "measurements in the Calibration Module before fitting NTU regression curves."
                ),
                "models": {},
            }

        y_ntu = np.array([float(r["validated_ntu"]) for r in validated], dtype=float)
        degree = 2 if (degree == 2 and len(validated) >= 4) else 1

        models = {}
        param_map = {
            "intensity_avg": ("Spot Intensity (Avg)", "intensity_avg"),
            "diameter_2a_px": ("Horizontal Diameter (2a)", "diameter_2a_px"),
            "diameter_2b_px": ("Vertical Diameter (2b)", "diameter_2b_px"),
            "equivalent_diameter_px": ("Equivalent Diameter", "equivalent_diameter_px"),
        }

        for key, (label, field) in param_map.items():
            x = np.array([float(r[field]) for r in validated], dtype=float)
            if np.std(x) < 1e-9:
                models[key] = {
                    "label": label,
                    "r2": None,
                    "equation": "Insufficient variance in independent variable",
                    "coeffs": [],
                }
                continue

            coeffs = np.polyfit(x, y_ntu, degree)
            pred = np.polyval(coeffs, x)
            ss_res = float(np.sum((y_ntu - pred) ** 2))
            ss_tot = float(np.sum((y_ntu - np.mean(y_ntu)) ** 2))
            r2 = round(1.0 - ss_res / ss_tot, 4) if ss_tot > 0 else 1.0

            if degree == 1:
                m, b = coeffs
                eq = f"NTU = {m:.4f} * x + ({b:.4f})"
            else:
                c2, c1, c0 = coeffs
                eq = f"NTU = {c2:.5f}x^2 + {c1:.4f}x + ({c0:.4f})"

            models[key] = {
                "label": label,
                "r2": r2,
                "equation": eq,
                "coeffs": [round(float(c), 6) for c in coeffs],
                "degree": degree,
            }

        return {
            "calibrated": True,
            "validated_count": len(validated),
            "required_count": 3,
            "message": f"Calibration models fitted from {len(validated)} validated NTU meter readings.",
            "models": models,
        }

    def estimate_ntu_if_calibrated(self, metrics: dict) -> Optional[dict]:
        """Return separate parameter-based NTU estimates ONLY when calibrated."""
        fit = self.fit_validated_models()
        if not fit["calibrated"]:
            return None
        estimates = {}
        for key, model in fit["models"].items():
            coeffs = model.get("coeffs", [])
            if coeffs and key in metrics:
                val = float(np.polyval(coeffs, float(metrics[key])))
                estimates[key] = {
                    "label": model["label"],
                    "estimated_ntu": round(max(0.0, val), 2),
                    "r2": model["r2"],
                }
        return estimates


calibration_store = CalibrationStore()
