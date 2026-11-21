import base64
import logging
import threading
from pathlib import Path
from typing import Any

import numpy as np

from app.config import DENSENET_MODEL_PATH, UNET_MODEL_PATH


logger = logging.getLogger(__name__)


def classical_lung_mask(grayscale_256: np.ndarray) -> np.ndarray:
    """Approximate a lung ROI when the trained U-Net checkpoint is unavailable."""
    import cv2

    image = np.clip(grayscale_256, 0.0, 1.0)
    image_u8 = (image * 255.0).astype(np.uint8)
    blurred = cv2.GaussianBlur(image_u8, (5, 5), 0)
    _, binary = cv2.threshold(
        blurred, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU
    )

    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7))
    cleaned = cv2.morphologyEx(binary, cv2.MORPH_OPEN, kernel, iterations=2)
    cleaned = cv2.morphologyEx(cleaned, cv2.MORPH_CLOSE, kernel, iterations=3)

    height, width = cleaned.shape
    border = max(4, min(height, width) // 20)
    cleaned[:border, :] = 0
    cleaned[-border:, :] = 0
    cleaned[:, :border] = 0
    cleaned[:, -border:] = 0

    num_labels, labels, stats, centroids = cv2.connectedComponentsWithStats(
        cleaned, connectivity=8
    )
    mask = np.zeros_like(cleaned, dtype=np.uint8)
    candidates: list[tuple[int, float]] = []
    min_area = (height * width) * 0.02
    for label in range(1, num_labels):
        area = int(stats[label, cv2.CC_STAT_AREA])
        if area < min_area:
            continue
        cx, cy = centroids[label]
        center_score = 1.0 - (
            abs(cx - width / 2.0) / width + abs(cy - height / 2.0) / height
        ) / 2.0
        candidates.append((label, area * (0.5 + center_score)))

    candidates.sort(key=lambda item: item[1], reverse=True)
    for label, _ in candidates[:2]:
        mask[labels == label] = 1

    if mask.sum() == 0:
        y0, y1 = int(height * 0.18), int(height * 0.88)
        x0, x1 = int(width * 0.12), int(width * 0.88)
        mask[y0:y1, x0:x1] = 1

    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel, iterations=2)
    return mask.astype(np.float32)


class ModelService:
    def __init__(
        self,
        unet_path: Path = UNET_MODEL_PATH,
        densenet_path: Path = DENSENET_MODEL_PATH,
    ) -> None:
        self.unet_path = unet_path
        self.densenet_path = densenet_path
        self._unet: Any = None
        self._classifier: Any = None
        self._pipeline: str = "unavailable"
        self._classifier_input_shape: tuple[int, ...] | None = None
        self._use_classical_segmentation = False
        self._load_error: str | None = None
        self._load_state = "not_loaded"
        self._prediction_lock = threading.Lock()

    @property
    def ready(self) -> bool:
        return self._classifier is not None and self._pipeline != "unavailable"

    def status(self) -> dict[str, Any]:
        missing = [path.name for path in self._missing_paths()]
        return {
            "ready": self.ready,
            "state": "ready" if self.ready else self._load_state,
            "pipeline": self._pipeline,
            "unet_checkpoint": self.unet_path.name,
            "densenet_checkpoint": self.densenet_path.name,
            "unet_path": str(self.unet_path),
            "densenet_path": str(self.densenet_path),
            "segmentation_backend": (
                "unet"
                if self._unet is not None
                else "classical_fallback"
                if self._use_classical_segmentation
                else "none"
                if self._pipeline == "grayscale_cnn"
                else "unavailable"
            ),
            "missing_artifacts": missing,
            "error": self._load_error,
        }

    def _missing_paths(self) -> list[Path]:
        required = [self.densenet_path]
        return [path for path in required if not path.is_file()]

    def load(self) -> None:
        if self.ready:
            return

        missing = self._missing_paths()
        if missing:
            self._load_state = "missing_artifacts"
            self._load_error = (
                "Trained model checkpoint files are missing: "
                + ", ".join(path.name for path in missing)
            )
            logger.error(self._load_error)
            return

        self._load_state = "loading"
        self._load_error = None
        try:
            import tensorflow as tf

            def dice_coefficient(y_true: Any, y_pred: Any) -> Any:
                y_true_flat = tf.keras.backend.flatten(y_true)
                y_pred_flat = tf.keras.backend.flatten(y_pred)
                intersection = tf.keras.backend.sum(y_true_flat * y_pred_flat)
                return (
                    2.0 * intersection + 1e-7
                ) / (
                    tf.keras.backend.sum(y_true_flat)
                    + tf.keras.backend.sum(y_pred_flat)
                    + 1e-7
                )

            classifier = tf.keras.models.load_model(
                self.densenet_path,
                compile=False,
            )
            classifier_shape = tuple(classifier.input_shape[1:])
            self._classifier_input_shape = classifier_shape

            if classifier_shape == (224, 224, 3):
                if self.unet_path.is_file():
                    unet = tf.keras.models.load_model(
                        self.unet_path,
                        custom_objects={"dice_coefficient": dice_coefficient},
                        compile=False,
                    )
                    if unet.input_shape[1:] != (256, 256, 1):
                        raise ValueError(
                            f"U-Net expects {unet.input_shape}; the notebook pipeline "
                            "requires (None, 256, 256, 1)."
                        )
                    self._unet = unet
                    self._use_classical_segmentation = False
                    self._pipeline = "unet_densenet"
                else:
                    self._unet = None
                    self._use_classical_segmentation = True
                    self._pipeline = "classical_densenet"
                    logger.warning(
                        "U-Net checkpoint %s is missing; using classical lung "
                        "segmentation with the DenseNet classifier.",
                        self.unet_path.name,
                    )
            elif classifier_shape == (512, 512, 1):
                # Local artifact is a grayscale CNN classifier, not notebook DenseNet121.
                self._unet = None
                self._use_classical_segmentation = False
                self._pipeline = "grayscale_cnn"
                logger.warning(
                    "Configured classifier %s has input shape %s. Using direct "
                    "grayscale CNN inference instead of the notebook U-Net + DenseNet path.",
                    self.densenet_path.name,
                    classifier_shape,
                )
            else:
                raise ValueError(
                    f"Unsupported classifier input shape {classifier_shape}. "
                    "Expected (224, 224, 3) for DenseNet121 or (512, 512, 1) for the "
                    "available grayscale CNN checkpoint."
                )

            if classifier.output_shape[-1] != 1:
                raise ValueError(
                    f"Classifier output shape {classifier.output_shape} must end with 1."
                )

            self._classifier = classifier
            self._load_state = "ready"
            self._load_error = None
        except Exception as exc:
            self._unet = None
            self._classifier = None
            self._pipeline = "unavailable"
            self._use_classical_segmentation = False
            self._load_state = "error"
            self._load_error = f"{type(exc).__name__}: {exc}"
            logger.exception("Could not initialize the inference models.")

    @staticmethod
    def _png_base64(image: np.ndarray) -> str:
        import cv2

        encoded, buffer = cv2.imencode(".png", image)
        if not encoded:
            raise RuntimeError("Could not encode an inference image as PNG.")
        return base64.b64encode(buffer.tobytes()).decode("ascii")

    def _predict_grayscale_cnn(self, image_bgr: np.ndarray) -> dict[str, Any]:
        import cv2

        gray = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2GRAY)
        resized = cv2.resize(gray, (512, 512)).astype(np.float32) / 255.0
        model_input = resized[np.newaxis, ..., np.newaxis]
        with self._prediction_lock:
            classifier_output = self._classifier.predict(model_input, verbose=0)

        tb_score = self._score_from_output(classifier_output)
        preview = np.clip(resized * 255.0, 0, 255).astype(np.uint8)
        return {
            "predicted_class": "TUBERCULOSIS" if tb_score > 0.5 else "NORMAL",
            "tb_score": tb_score,
            "score_is_calibrated": False,
            "segmentation_backend": "none",
            "pipeline": "grayscale_cnn",
            "segmentation_mask_png_base64": None,
            "lung_roi_png_base64": self._png_base64(preview),
        }

    def _predict_unet_pipeline(self, image_bgr: np.ndarray) -> dict[str, Any]:
        import cv2

        image_256 = cv2.resize(image_bgr, (256, 256)).astype(np.float32) / 255.0
        grayscale = np.dot(image_256[..., :3], [0.2989, 0.5870, 0.1140])

        with self._prediction_lock:
            if self._unet is not None:
                unet_input = grayscale[np.newaxis, ..., np.newaxis].astype(np.float32)
                predicted_mask = self._unet.predict(unet_input, verbose=0)
                if predicted_mask.shape != (1, 256, 256, 1):
                    raise ValueError(
                        f"Unexpected U-Net output shape: {predicted_mask.shape}"
                    )
                mask = predicted_mask[0, ..., 0]
                binary_mask = (mask > 0.5).astype(np.uint8)
                backend = "unet"
            else:
                binary_mask = classical_lung_mask(grayscale).astype(np.uint8)
                backend = "classical_fallback"

            roi = image_256 * binary_mask[..., np.newaxis]
            roi_224 = cv2.resize(roi, (224, 224)).astype(np.float32)
            classifier_output = self._classifier.predict(
                roi_224[np.newaxis, ...],
                verbose=0,
            )

        tb_score = self._score_from_output(classifier_output)
        mask_png = binary_mask * 255
        roi_png = np.clip(roi_224 * 255.0, 0, 255).astype(np.uint8)
        return {
            "predicted_class": "TUBERCULOSIS" if tb_score > 0.5 else "NORMAL",
            "tb_score": tb_score,
            "score_is_calibrated": False,
            "segmentation_backend": backend,
            "pipeline": self._pipeline,
            "segmentation_mask_png_base64": self._png_base64(mask_png),
            "lung_roi_png_base64": self._png_base64(roi_png),
        }

    @staticmethod
    def _score_from_output(classifier_output: np.ndarray) -> float:
        if classifier_output.shape != (1, 1):
            raise ValueError(
                f"Unexpected classifier output shape: {classifier_output.shape}"
            )
        tb_score = float(classifier_output[0, 0])
        if not np.isfinite(tb_score) or not 0.0 <= tb_score <= 1.0:
            raise ValueError("Classifier returned an invalid sigmoid score.")
        return tb_score

    def predict(self, image_bgr: np.ndarray) -> dict[str, Any]:
        if not self.ready:
            raise RuntimeError("Inference models are not loaded.")

        if self._pipeline == "grayscale_cnn":
            return self._predict_grayscale_cnn(image_bgr)
        return self._predict_unet_pipeline(image_bgr)


model_service = ModelService()
