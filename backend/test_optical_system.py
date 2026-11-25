import asyncio
import io
import os
import tempfile
import unittest
import cv2
import numpy as np
from starlette.datastructures import UploadFile

from calibration_store import CalibrationStore
from experiments_store import ExperimentsStore
from image_processing import analyze_laser_spot
from main import analyze_image, get_calibration, health


def _make_white_screen_image(shape=(240, 320, 3)):
    # Bright white background (high V, low S in HSV) -> must be excluded by red HSV filter
    return np.full(shape, 245, dtype=np.uint8)


class TestImageProcessing(unittest.TestCase):
    def test_circle_spot_on_white_background(self):
        img = _make_white_screen_image()
        cv2.circle(img, (160, 100), 22, (20, 20, 235), -1)

        res = analyze_laser_spot(img)
        self.assertIsNotNone(res)
        self.assertEqual(res["shape"], "Circle")
        self.assertIsNotNone(res["circle_diameter_px"])
        self.assertAlmostEqual(res["diameter_2a_px"], res["diameter_2b_px"], delta=0.5)
        self.assertGreater(res["diameter_2a_px"], 40.0)
        self.assertLess(res["diameter_2a_px"], 48.0)
        self.assertLess(res["distortion"]["circle_distortion_pct"], 5.0)
        self.assertGreater(res["intensity_avg"], 220.0)

    def test_ellipse_spot_distortion_detection(self):
        img = _make_white_screen_image()
        cv2.ellipse(img, (160, 110), (15, 30), 0, 0, 360, (15, 15, 210), -1)

        res = analyze_laser_spot(img)
        self.assertIsNotNone(res)
        self.assertEqual(res["shape"], "Ellipse")
        self.assertIsNone(res["circle_diameter_px"])
        self.assertAlmostEqual(res["diameter_2a_px"], 30.0, delta=3.0)
        self.assertAlmostEqual(res["diameter_2b_px"], 60.0, delta=3.0)
        self.assertGreater(res["distortion"]["axis_distortion_pct"], 40.0)
        self.assertGreater(res["distortion"]["circle_distortion_pct"], 25.0)
        self.assertGreater(res["distortion"]["eccentricity"], 0.7)

    def test_topmost_contour_selected_and_white_excluded(self):
        img = _make_white_screen_image()
        cv2.ellipse(img, (140, 60), (12, 16), 0, 0, 360, (10, 10, 160), -1)
        cv2.ellipse(img, (140, 180), (15, 15), 0, 0, 360, (10, 10, 240), -1)

        res = analyze_laser_spot(img)
        self.assertIsNotNone(res)
        self.assertLess(res["centroid"]["y"], 90.0)
        self.assertLess(res["intensity_avg"], 180.0)

    def test_pure_white_image_returns_none(self):
        img = _make_white_screen_image()
        self.assertIsNone(analyze_laser_spot(img))


class TestCalibrationAndExperiments(unittest.TestCase):
    def test_notebook_data_excludes_salt_and_coffee(self):
        with tempfile.TemporaryDirectory() as tmp:
            store = CalibrationStore(filepath=os.path.join(tmp, "cal.json"))
            records = store.list_records()
            self.assertEqual(len(records), 14)
            groups = {r["sample_group"].lower() for r in records}
            self.assertNotIn("salt", groups)
            self.assertNotIn("coffee", groups)
            self.assertEqual(groups, {"distilled water", "milk", "soap"})
            self.assertTrue(all(r["validated_ntu"] is None for r in records))
            fit = store.fit_validated_models()
            self.assertFalse(fit["calibrated"])

            # Verify calibration activates only after >= 3 validated NTU readings
            store.update_record(records[0]["id"], {"validated_ntu": 0.2})
            store.update_record(records[2]["id"], {"validated_ntu": 18.5})
            self.assertFalse(store.fit_validated_models()["calibrated"])
            store.update_record(records[4]["id"], {"validated_ntu": 9.4})
            calibrated = store.fit_validated_models()
            self.assertTrue(calibrated["calibrated"])
            self.assertIn("intensity_avg", calibrated["models"])
            self.assertIn("diameter_2a_px", calibrated["models"])
            self.assertIn("diameter_2b_px", calibrated["models"])

    def test_experiments_csv_export(self):
        with tempfile.TemporaryDirectory() as tmp:
            exp_store = ExperimentsStore(filepath=os.path.join(tmp, "exp.json"))
            exp_store.save_experiment({
                "sample_name": "Milk 300 ml",
                "sample_group": "Milk",
                "shape": "Ellipse",
                "intensity_avg": 170.5,
                "intensity_min": 120.0,
                "intensity_max": 210.0,
                "diameter_2a_px": 20.1,
                "diameter_2b_px": 23.4,
                "equivalent_diameter_px": 21.69,
                "distortion": {"circle_distortion_pct": 14.1, "grade": "Moderately Distorted"},
            })
            csv_data = exp_store.export_csv()
            self.assertIn("Milk 300 ml", csv_data)
            self.assertIn("diameter_2a_px", csv_data)


class TestFastAPIHandlers(unittest.TestCase):
    def test_handlers(self):
        h = asyncio.run(health())
        self.assertEqual(h["status"], "ok")

        cal = asyncio.run(get_calibration())
        self.assertEqual(len(cal["records"]), 14)
        self.assertFalse(cal["fit"]["calibrated"])

        img = _make_white_screen_image()
        cv2.ellipse(img, (160, 100), (14, 18), 0, 0, 360, (15, 15, 200), -1)
        ok, buf = cv2.imencode(".png", img)
        self.assertTrue(ok)

        upload = UploadFile(filename="spot.png", file=io.BytesIO(buf.tobytes()))
        resp = asyncio.run(
            analyze_image(
                file=upload,
                sample_name="Test Milk",
                sample_group="Milk",
                notes="Unit test",
                save_to_history=False,
                s_min=None,
                v_min=None,
                circle_distortion_threshold_pct=None,
            )
        )
        self.assertTrue(resp["detected"])
        self.assertEqual(resp["shape"], "Ellipse")
        self.assertEqual(resp["calibration_status"], "uncalibrated")
        self.assertIsNone(resp["validated_ntu_estimates"])
        self.assertIn("annotated", resp["images_base64"])
        self.assertIn("red_mask", resp["images_base64"])
        self.assertIn("intensity_region", resp["images_base64"])


if __name__ == "__main__":
    unittest.main()
