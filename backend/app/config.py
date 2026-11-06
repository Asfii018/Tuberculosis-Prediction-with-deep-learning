import os
from pathlib import Path

from dotenv import load_dotenv

PROJECT_ROOT = Path(__file__).resolve().parents[2]
load_dotenv(Path(__file__).resolve().parents[1] / ".env")


def _project_path(environment_name: str, default: Path) -> Path:
    configured = Path(os.getenv(environment_name, str(default)))
    if not configured.is_absolute():
        configured = PROJECT_ROOT / configured
    return configured.resolve()


MODEL_DIRECTORY = Path(
    _project_path("TB_MODEL_DIR", PROJECT_ROOT / "models")
)
UNET_MODEL_PATH = _project_path(
    "UNET_MODEL_PATH",
    MODEL_DIRECTORY / "unet_model_fold_3.h5",
)
DENSENET_MODEL_PATH = _project_path(
    "DENSENET_MODEL_PATH",
    MODEL_DIRECTORY / "densenet_model_fold_1.h5",
)
MAX_UPLOAD_BYTES = int(os.getenv("MAX_UPLOAD_BYTES", str(10 * 1024 * 1024)))
MAX_IMAGE_PIXELS = int(os.getenv("MAX_IMAGE_PIXELS", "25000000"))
CORS_ORIGINS = [
    origin.strip()
    for origin in os.getenv(
        "CORS_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173",
    ).split(",")
    if origin.strip()
]
