import io
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import numpy as np
from fastapi import APIRouter, File, HTTPException, UploadFile
from PIL import Image, UnidentifiedImageError

from app.config import MAX_IMAGE_PIXELS, MAX_UPLOAD_BYTES
from app.services.inference import model_service


router = APIRouter()
ALLOWED_EXTENSIONS = {".png", ".jpg", ".jpeg"}
ALLOWED_FORMATS = {"PNG", "JPEG"}


async def _read_xray(file: UploadFile) -> np.ndarray:
    suffix = Path(file.filename or "").suffix.lower()
    if suffix not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail="Upload a PNG, JPG, or JPEG chest X-ray.",
        )

    content = await file.read(MAX_UPLOAD_BYTES + 1)
    if not content:
        raise HTTPException(status_code=400, detail="The uploaded file is empty.")
    if len(content) > MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"Image exceeds the {MAX_UPLOAD_BYTES}-byte upload limit.",
        )

    try:
        with Image.open(io.BytesIO(content)) as image:
            if image.format not in ALLOWED_FORMATS:
                raise HTTPException(
                    status_code=400,
                    detail="The file contents are not a supported PNG or JPEG image.",
                )
            if image.width * image.height > MAX_IMAGE_PIXELS:
                raise HTTPException(
                    status_code=400,
                    detail="Image dimensions exceed the allowed pixel limit.",
                )
            rgb_image = image.convert("RGB")
            rgb = np.asarray(rgb_image)
    except (UnidentifiedImageError, OSError, Image.DecompressionBombError) as exc:
        raise HTTPException(
            status_code=400,
            detail="The uploaded image could not be decoded.",
        ) from exc

    import cv2

    return cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR)


@router.post("/predictions/upload")
async def predict(file: UploadFile = File(...)) -> dict[str, Any]:
    if not model_service.ready:
        status = model_service.status()
        raise HTTPException(
            status_code=503,
            detail={
                "message": "Inference is unavailable until trained model files are installed.",
                "missing_artifacts": status["missing_artifacts"],
            },
        )

    image_bgr = await _read_xray(file)
    started = time.perf_counter()
    try:
        result = model_service.predict(image_bgr)
    except (RuntimeError, ValueError) as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    result["processing_time_ms"] = round(
        (time.perf_counter() - started) * 1000,
        2,
    )
    result["prediction_timestamp"] = datetime.now(timezone.utc).isoformat()
    return result
