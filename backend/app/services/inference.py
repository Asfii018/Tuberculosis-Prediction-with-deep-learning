import base64
import threading
from pathlib import Path
from typing import Any

import numpy as np

from app.config import DENSENET_MODEL_PATH, UNET_MODEL_PATH


class ModelService:
    def __init__(
        self,
        unet_path: Path = UNET_MODEL_PATH,
        densenet_path: Path = DENSENET_MODEL_PATH,
    ) -> None:
        self.unet_path = unet_path
        self.densenet_path = densenet_path
        self._unet: Any = None
        self._densenet: Any = None
        self._prediction_lock = threading.Lock()

    @property
    def ready(self) -> bool:
        return self._unet is not None and self._densenet is not None

    def status(self) -> dict[str, Any]:
        missing = [
            path.name
            for path in (self.unet_path, self.densenet_path)
            if not path.is_file()
        ]
        return {
            "ready": self.ready,
            "unet_checkpoint": self.unet_path.name,
            "densenet_checkpoint": self.densenet_path.name,
            "missing_artifacts": missing,
        }

    def load(self) -> None:
        missing = [
            path
            for path in (self.unet_path, self.densenet_path)
            if not path.is_file()
        ]
        if missing:
            return

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

        unet = tf.keras.models.load_model(
            self.unet_path,
            custom_objects={"dice_coefficient": dice_coefficient},
            compile=False,
        )
        densenet = tf.keras.models.load_model(
            self.densenet_path,
            compile=False,
        )
        if unet.input_shape[1:] != (256, 256, 1):
            raise ValueError(
                f"U-Net expects {unet.input_shape}; the notebook pipeline requires "
                "(None, 256, 256, 1)."
            )
        if densenet.input_shape[1:] != (224, 224, 3):
            raise ValueError(
                f"DenseNet expects {densenet.input_shape}; the notebook pipeline "
                "requires (None, 224, 224, 3)."
            )

        self._unet = unet
        self._densenet = densenet

    @staticmethod
    def _png_base64(image: np.ndarray) -> str:
        import cv2

        encoded, buffer = cv2.imencode(".png", image)
        if not encoded:
            raise RuntimeError("Could not encode an inference image as PNG.")
        return base64.b64encode(buffer.tobytes()).decode("ascii")

    def predict(self, image_bgr: np.ndarray) -> dict[str, Any]:
        if not self.ready:
            raise RuntimeError("Trained U-Net and DenseNet checkpoints are not loaded.")

        import cv2

        image_256 = cv2.resize(image_bgr, (256, 256)).astype(np.float32) / 255.0
        # Preserve the channel weighting used by the notebook's inference cell.
        grayscale = np.dot(image_256[..., :3], [0.2989, 0.5870, 0.1140])
        unet_input = grayscale[np.newaxis, ..., np.newaxis].astype(np.float32)

        with self._prediction_lock:
            predicted_mask = self._unet.predict(unet_input, verbose=0)
            if predicted_mask.shape != (1, 256, 256, 1):
                raise ValueError(
                    f"Unexpected U-Net output shape: {predicted_mask.shape}"
                )

            mask = predicted_mask[0, ..., 0]
            binary_mask = (mask > 0.5).astype(np.uint8)
            roi = image_256 * binary_mask[..., np.newaxis]
            roi_224 = cv2.resize(roi, (224, 224)).astype(np.float32)
            classifier_output = self._densenet.predict(
                roi_224[np.newaxis, ...],
                verbose=0,
            )

        if classifier_output.shape != (1, 1):
            raise ValueError(
                f"Unexpected DenseNet output shape: {classifier_output.shape}"
            )
        tb_score = float(classifier_output[0, 0])
        if not np.isfinite(tb_score) or not 0.0 <= tb_score <= 1.0:
            raise ValueError("DenseNet returned an invalid sigmoid score.")

        mask_png = binary_mask * 255
        roi_png = np.clip(roi_224 * 255.0, 0, 255).astype(np.uint8)
        return {
            "predicted_class": "TUBERCULOSIS" if tb_score > 0.5 else "NORMAL",
            "tb_score": tb_score,
            "score_is_calibrated": False,
            "segmentation_mask_png_base64": self._png_base64(mask_png),
            "lung_roi_png_base64": self._png_base64(roi_png),
        }


model_service = ModelService()
