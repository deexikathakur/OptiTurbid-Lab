"""
Persistent JSON store and CSV export for saved experimental results.
"""

import csv
import io
import json
import os
import uuid
from copy import deepcopy
from datetime import datetime, timezone
from typing import Optional


DATA_DIR = os.path.join(os.path.dirname(__file__), "data")
EXPERIMENTS_FILE = os.path.join(DATA_DIR, "experiments.json")


class ExperimentsStore:
    def __init__(self, filepath: str = EXPERIMENTS_FILE):
        self.filepath = filepath
        self.items: list[dict] = []
        self._load()

    def _load(self):
        os.makedirs(os.path.dirname(self.filepath), exist_ok=True)
        if os.path.exists(self.filepath):
            try:
                with open(self.filepath, "r", encoding="utf-8") as f:
                    data = json.load(f)
                if isinstance(data, list):
                    self.items = data
                    return
            except Exception:
                pass
        self.items = []

    def _save(self):
        os.makedirs(os.path.dirname(self.filepath), exist_ok=True)
        with open(self.filepath, "w", encoding="utf-8") as f:
            json.dump(self.items, f, indent=2)

    def list_experiments(self) -> list[dict]:
        return deepcopy(self.items)

    def get_experiment(self, exp_id: str) -> Optional[dict]:
        for item in self.items:
            if item["id"] == exp_id:
                return deepcopy(item)
        return None

    def save_experiment(self, payload: dict) -> dict:
        record = deepcopy(payload)
        record["id"] = record.get("id") or f"exp-{uuid.uuid4().hex[:8]}"
        record["saved_at"] = datetime.now(timezone.utc).isoformat()
        self.items.insert(0, record)
        self._save()
        return deepcopy(record)

    def delete_experiment(self, exp_id: str) -> bool:
        before = len(self.items)
        self.items = [item for item in self.items if item["id"] != exp_id]
        if len(self.items) < before:
            self._save()
            return True
        return False

    def export_csv(self) -> str:
        output = io.StringIO()
        fieldnames = [
            "id",
            "saved_at",
            "sample_name",
            "sample_group",
            "notes",
            "shape",
            "intensity_avg",
            "intensity_min",
            "intensity_max",
            "diameter_2a_px",
            "diameter_2b_px",
            "equivalent_diameter_px",
            "circle_distortion_pct",
            "axis_distortion_pct",
            "radial_distortion_pct",
            "eccentricity",
            "aspect_ratio",
            "circularity",
            "distortion_grade",
            "calibration_status",
        ]
        writer = csv.DictWriter(output, fieldnames=fieldnames)
        writer.writeheader()
        for item in self.items:
            dist = item.get("distortion", {})
            writer.writerow({
                "id": item.get("id", ""),
                "saved_at": item.get("saved_at", ""),
                "sample_name": item.get("sample_name", ""),
                "sample_group": item.get("sample_group", ""),
                "notes": item.get("notes", ""),
                "shape": item.get("shape", ""),
                "intensity_avg": item.get("intensity_avg", ""),
                "intensity_min": item.get("intensity_min", ""),
                "intensity_max": item.get("intensity_max", ""),
                "diameter_2a_px": item.get("diameter_2a_px", ""),
                "diameter_2b_px": item.get("diameter_2b_px", ""),
                "equivalent_diameter_px": item.get("equivalent_diameter_px", ""),
                "circle_distortion_pct": dist.get("circle_distortion_pct", ""),
                "axis_distortion_pct": dist.get("axis_distortion_pct", ""),
                "radial_distortion_pct": dist.get("radial_distortion_pct", ""),
                "eccentricity": dist.get("eccentricity", ""),
                "aspect_ratio": dist.get("aspect_ratio", ""),
                "circularity": dist.get("circularity", ""),
                "distortion_grade": dist.get("grade", ""),
                "calibration_status": item.get("calibration_status", "uncalibrated"),
            })
        return output.getvalue()


experiments_store = ExperimentsStore()
