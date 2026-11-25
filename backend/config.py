"""
Default optical apparatus metadata and image-processing configuration.
"""

from copy import deepcopy

OPTICAL_APPARATUS = {
    "title": "An Optical System and Method for Determining Water Turbidity Using Laser Illumination and Image Analysis",
    "authors": [
        "Deexika Thakur",
        "Ankita",
        "Swati Sharma",
        "Shradha",
        "Tammana Thakur",
    ],
    "institution": "Department of Computer Science and Engineering, Government Hydro Engineering College, Bandla, District Bilaspur, Himachal Pradesh – 174001",
    "cuvette_space_cm": 1.5,
    "cuvette_border_cm": 0.4,
    "laser_to_detector_cm": 68.0,
    "laser_source": "Red Laser Diode",
    "screen_type": "White Projection Screen",
}

DEFAULT_DETECTION_SETTINGS = {
    "lower_red1": [0, 100, 80],
    "upper_red1": [10, 255, 255],
    "lower_red2": [170, 100, 80],
    "upper_red2": [180, 255, 255],
    "morph_kernel_size": 3,
    "morph_open_iterations": 1,
    "min_contour_area": 4.0,
    "circle_distortion_threshold_pct": 3.0,
}


def get_default_settings() -> dict:
    return deepcopy(DEFAULT_DETECTION_SETTINGS)
