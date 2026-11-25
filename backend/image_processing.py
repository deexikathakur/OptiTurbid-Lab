"""
Modular OpenCV image-processing pipeline for red laser spot detection,
horizontal/vertical diameter extraction (2a, 2b), intensity quantification,
and geometric distortion analysis relative to an ideal circle.
"""

from typing import Optional
import math
import cv2
import numpy as np

from config import DEFAULT_DETECTION_SETTINGS


def _select_topmost_contour(contours: list, min_area: float = 4.0):
    """Select the top-most contour (minimum boundingRect y), preferring contours >= min_area."""
    if not contours:
        return None

    filtered = [c for c in contours if cv2.contourArea(c) >= min_area]
    candidates = filtered if filtered else contours

    top_contour = None
    min_y = float("inf")
    for cnt in candidates:
        _, y, _, _ = cv2.boundingRect(cnt)
        if y < min_y:
            min_y = y
            top_contour = cnt
    return top_contour


def _ellipse_axis_projections(axis_1: float, axis_2: float, angle_deg: float) -> tuple[float, float]:
    """
    Compute horizontal (2a) and vertical (2b) projected diameters of a fitted
    OpenCV ellipse ((cx, cy), (axis_1, axis_2), angle_deg).
    When angle is 0/180 deg, horizontal = axis_1 and vertical = axis_2.
    """
    theta = math.radians(angle_deg)
    a_half = axis_1 / 2.0
    b_half = axis_2 / 2.0
    cos_t = math.cos(theta)
    sin_t = math.sin(theta)
    horiz_d = 2.0 * math.sqrt((a_half * cos_t) ** 2 + (b_half * sin_t) ** 2)
    vert_d = 2.0 * math.sqrt((a_half * sin_t) ** 2 + (b_half * cos_t) ** 2)
    return horiz_d, vert_d


def _distortion_grade(distortion_pct: float) -> str:
    if distortion_pct <= 3.0:
        return "Near-Circular (Minimal Distortion)"
    if distortion_pct <= 10.0:
        return "Slightly Elliptical (Low Distortion)"
    if distortion_pct <= 22.0:
        return "Moderately Distorted"
    return "Highly Distorted"


def analyze_laser_spot(
    image: np.ndarray,
    settings: Optional[dict] = None,
) -> Optional[dict]:
    """
    Analyze a BGR image containing a red laser spot projected on a white screen.

    Implements the core HSV dual-range red filter (excluding low-saturation white
    background regions), 3x3 morphological opening, top-most contour selection,
    ellipse/circle fitting, red-channel intensity measurement on an untouched copy,
    and geometric distortion quantification relative to an ideal circle.
    """
    if image is None or image.size == 0:
        return None

    cfg = {**DEFAULT_DETECTION_SETTINGS, **(settings or {})}

    # Keep an untouched copy for exact intensity calculation
    original = image.copy()
    annotated = image.copy()

    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)

    # -----------------------------
    # RED FILTER (excludes white/gray background via S and V thresholds)
    # -----------------------------
    lower_red1 = np.array(cfg["lower_red1"], dtype=np.uint8)
    upper_red1 = np.array(cfg["upper_red1"], dtype=np.uint8)
    lower_red2 = np.array(cfg["lower_red2"], dtype=np.uint8)
    upper_red2 = np.array(cfg["upper_red2"], dtype=np.uint8)

    red_mask1 = cv2.inRange(hsv, lower_red1, upper_red1)
    red_mask2 = cv2.inRange(hsv, lower_red2, upper_red2)
    red_mask = cv2.bitwise_or(red_mask1, red_mask2)

    # Clean isolated noise specks
    k_size = max(1, int(cfg.get("morph_kernel_size", 3)))
    if k_size % 2 == 0:
        k_size += 1
    kernel = np.ones((k_size, k_size), np.uint8)
    open_iters = max(1, int(cfg.get("morph_open_iterations", 1)))
    final_mask = cv2.morphologyEx(red_mask, cv2.MORPH_OPEN, kernel, iterations=open_iters)

    # Find contours
    contours, _ = cv2.findContours(final_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if not contours:
        return None

    # -----------------------------
    # SELECT TOP-MOST CONTOUR
    # -----------------------------
    cnt = _select_topmost_contour(contours, min_area=float(cfg.get("min_contour_area", 4.0)))
    if cnt is None:
        return None

    contour_area = float(cv2.contourArea(cnt))
    contour_perimeter = float(cv2.arcLength(cnt, True))

    # Mask for intensity calculation
    mask = np.zeros(gray.shape, dtype=np.uint8)

    # Compute enclosing circle for ideal-circle comparison & fallback
    (enc_cx, enc_cy), enc_radius = cv2.minEnclosingCircle(cnt)
    enc_diameter = float(2.0 * enc_radius)

    # Equivalent diameter from contour area: D_eq = 2 * sqrt(Area / pi)
    if contour_area > 0:
        equivalent_diameter = float(2.0 * math.sqrt(contour_area / math.pi))
    else:
        equivalent_diameter = enc_diameter

    # -----------------------------
    # SHAPE DETECTION & DISTORTION FROM ACTUAL CIRCLE
    # -----------------------------
    circle_threshold_pct = float(cfg.get("circle_distortion_threshold_pct", 3.0))

    if len(cnt) >= 5:
        ellipse = cv2.fitEllipse(cnt)
        (cx, cy), (axis_1, axis_2), angle = ellipse

        # Ensure positive axes; fallback to enclosing circle if degenerate
        if axis_1 <= 0 or axis_2 <= 0:
            axis_1 = axis_2 = max(enc_diameter, 1.0)
            angle = 0.0
            cx, cy = enc_cx, enc_cy

        # Projected horizontal (2a) and vertical (2b) diameters
        horiz_2a, vert_2b = _ellipse_axis_projections(axis_1, axis_2, angle)
        major_axis = max(axis_1, axis_2)
        minor_axis = min(axis_1, axis_2)

        # Geometric distortion relative to an ideal circle
        aspect_ratio = float(major_axis / minor_axis) if minor_axis > 0 else 1.0
        eccentricity = float(math.sqrt(max(0.0, 1.0 - (minor_axis / major_axis) ** 2))) if major_axis > 0 else 0.0
        axis_distortion_pct = float((1.0 - (minor_axis / major_axis)) * 100.0) if major_axis > 0 else 0.0
        circularity = float((4.0 * math.pi * contour_area) / (contour_perimeter ** 2)) if contour_perimeter > 0 else 1.0
        circularity = min(1.0, max(0.0, circularity))

        # Radial deviation from ideal circle around centroid
        pts = cnt.reshape(-1, 2).astype(np.float64)
        radii = np.sqrt((pts[:, 0] - cx) ** 2 + (pts[:, 1] - cy) ** 2)
        mean_r = float(np.mean(radii)) if len(radii) > 0 else 1.0
        std_r = float(np.std(radii)) if len(radii) > 0 else 0.0
        radial_distortion_pct = float((std_r / mean_r) * 100.0) if mean_r > 0 else 0.0

        # Combined shape distortion percentage from an ideal circle
        circle_distortion_pct = float(0.65 * axis_distortion_pct + 0.35 * radial_distortion_pct)

        if axis_distortion_pct <= circle_threshold_pct and circularity >= 0.90:
            # Spot is effectively circular within tolerance
            shape = "Circle"
            circle_diameter = float(equivalent_diameter if equivalent_diameter > 0 else (horiz_2a + vert_2b) / 2.0)
            diameter_2a = circle_diameter
            diameter_2b = circle_diameter
            center = (int(round(cx)), int(round(cy)))
            radius_px = max(1, int(round(circle_diameter / 2.0)))

            # Blue circle matching user's reference OpenCV script
            cv2.circle(annotated, center, radius_px, (255, 0, 0), 2, cv2.LINE_AA)
            cv2.circle(mask, center, radius_px, 255, -1)
        else:
            shape = "Ellipse"
            diameter_2a = float(horiz_2a)
            diameter_2b = float(vert_2b)
            center = (int(round(cx)), int(round(cy)))

            # Green fitted ellipse matching user's reference OpenCV script
            cv2.ellipse(annotated, ellipse, (0, 255, 0), 2, cv2.LINE_AA)
            # Dashed/thin cyan ideal-circle overlay (equivalent diameter) to visualize distortion
            eq_radius_px = max(1, int(round(equivalent_diameter / 2.0)))
            cv2.circle(annotated, center, eq_radius_px, (255, 255, 0), 1, cv2.LINE_AA)

            # Filled ellipse mask for intensity calculation
            cv2.ellipse(mask, ellipse, 255, -1)

        # Center marker
        cv2.circle(annotated, center, 2, (0, 0, 255), -1, cv2.LINE_AA)
    else:
        shape = "Circle"
        cx, cy = float(enc_cx), float(enc_cy)
        diameter_2a = float(enc_diameter)
        diameter_2b = float(enc_diameter)
        major_axis = float(enc_diameter)
        minor_axis = float(enc_diameter)
        angle = 0.0
        aspect_ratio = 1.0
        eccentricity = 0.0
        axis_distortion_pct = 0.0
        radial_distortion_pct = 0.0
        circle_distortion_pct = 0.0
        circularity = 1.0

        center = (int(round(cx)), int(round(cy)))
        radius_px = max(1, int(round(enc_radius)))
        cv2.circle(annotated, center, radius_px, (255, 0, 0), 2, cv2.LINE_AA)
        cv2.circle(annotated, center, 2, (0, 0, 255), -1, cv2.LINE_AA)
        cv2.circle(mask, center, radius_px, 255, -1)

    # -----------------------------
    # INTENSITY INSIDE FITTED REGION (from untouched original image)
    # -----------------------------
    red_channel = original[:, :, 2]
    pixels = red_channel[mask == 255]
    if len(pixels) == 0:
        # Fallback to contour pixels if fitted mask falls outside sub-pixel boundary
        cv2.drawContours(mask, [cnt], -1, 255, -1)
        pixels = red_channel[mask == 255]

    if len(pixels) == 0:
        return None

    average_intensity = float(np.mean(pixels))
    min_intensity = float(np.min(pixels))
    max_intensity = float(np.max(pixels))

    # Ellipse geometric equivalent diameter sqrt(2a * 2b) when area is tiny
    ellipse_eq_diameter = float(math.sqrt(max(0.0, diameter_2a * diameter_2b)))

    return {
        "shape": shape,
        "centroid": {"x": round(float(cx), 2), "y": round(float(cy), 2)},
        "diameter_2a_px": round(float(diameter_2a), 2),
        "diameter_2b_px": round(float(diameter_2b), 2),
        "circle_diameter_px": round(float(diameter_2a), 2) if shape == "Circle" else None,
        "equivalent_diameter_px": round(float(equivalent_diameter), 2),
        "ellipse_equivalent_diameter_px": round(ellipse_eq_diameter, 2),
        "major_axis_px": round(float(major_axis), 2),
        "minor_axis_px": round(float(minor_axis), 2),
        "ellipse_angle_deg": round(float(angle), 2),
        "contour_area_px2": round(float(contour_area), 2),
        "contour_perimeter_px": round(float(contour_perimeter), 2),
        "intensity_avg": round(average_intensity, 2),
        "intensity_min": round(min_intensity, 2),
        "intensity_max": round(max_intensity, 2),
        "distortion": {
            "circle_distortion_pct": round(circle_distortion_pct, 2),
            "axis_distortion_pct": round(axis_distortion_pct, 2),
            "radial_distortion_pct": round(radial_distortion_pct, 2),
            "eccentricity": round(eccentricity, 4),
            "aspect_ratio": round(aspect_ratio, 4),
            "circularity": round(circularity, 4),
            "grade": _distortion_grade(circle_distortion_pct),
        },
        "images": {
            "original": original,
            "red_mask": final_mask,
            "intensity_region": mask,
            "annotated": annotated,
        },
    }
