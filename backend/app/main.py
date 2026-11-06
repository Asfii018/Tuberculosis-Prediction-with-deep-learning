from contextlib import asynccontextmanager
from typing import Any

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.predictions import router as predictions_router
from app.config import CORS_ORIGINS
from app.services.inference import model_service


@asynccontextmanager
async def lifespan(_: FastAPI):
    model_service.load()
    yield


app = FastAPI(
    title="Tuberculosis X-ray Research API",
    description=(
        "Research-only API for the notebook's U-Net segmentation and "
        "DenseNet121 classification pipeline."
    ),
    version="0.1.0",
    lifespan=lifespan,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)
app.include_router(predictions_router, prefix="/api")


@app.get("/health")
def health() -> dict[str, Any]:
    return {
        "status": "ok",
        "model_ready": model_service.ready,
    }


@app.get("/api/models/status")
def models_status() -> dict[str, Any]:
    return model_service.status()
