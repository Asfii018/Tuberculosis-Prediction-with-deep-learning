# FastAPI inference backend

This backend implements the notebook's two-stage inference path. It does not
train models, persist uploaded images, or generate fallback predictions.

## Required model files

Place the trained checkpoints in the repository's `models` directory, or set
`UNET_MODEL_PATH` and `DENSENET_MODEL_PATH` in `backend/.env`:

- `unet_model_fold_3.h5` — notebook inference explicitly loads U-Net fold 3.
- `densenet_model_fold_1.h5` — the notebook's recorded 10-fold run selected
  DenseNet fold 1. Its exported `tb.h5` can be used instead by setting the
  classifier path to that file.

The notebook reports U-Net fold 2 as its best validation fold, despite loading
fold 3 in the later inference cell. This backend follows that inference cell
and uses fold 3 by default. Change `UNET_MODEL_PATH` only after verifying which
checkpoint is intended. A notebook (`.ipynb`) is not a loadable model
checkpoint. If a checkpoint is unavailable, the health and model-status
endpoints report the missing artifacts and predictions return HTTP 503.

## Run locally

From the `backend` directory, create and activate a virtual environment,
install requirements, copy `.env.example` to `.env`, set the checkpoint paths,
then run:

```powershell
python -m pip install -r requirements.txt
Copy-Item .env.example .env
uvicorn app.main:app --reload
```

Interactive API documentation is available at `http://127.0.0.1:8000/docs`.

## Endpoints

- `GET /health` — API process and model readiness.
- `GET /api/models/status` — checkpoint availability.
- `POST /api/predictions/upload` — PNG/JPG/JPEG upload; returns prediction,
  segmentation mask, ROI, elapsed time, and timestamp.

The returned sigmoid value is labeled as an **uncalibrated score**, not a
clinical probability or calibrated confidence. The service is for research
and educational use only. It is not a medical device and must not be used for
diagnosis or treatment decisions.

This is the first backend module only. Authentication, user-specific history,
MongoDB persistence, the React frontend, reports, and admin/research dashboards
are not implemented yet.
