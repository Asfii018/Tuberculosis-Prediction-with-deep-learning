# React frontend

The Vite application provides a responsive landing page, dashboard, X-ray
upload flow, prediction results, and browser-local analysis history. It reads
model readiness from FastAPI and sends uploads to the existing trained
U-Net/DenseNet inference endpoint. It does not create mock predictions or
population statistics.

## Run locally

Install the Python packages in `../backend/requirements.txt` once. In
PowerShell:

```powershell
npm install
npm run dev
```

`npm run dev` starts FastAPI and Vite together. Stop both services with
Ctrl+C. For reference, if you prefer separate terminals:

```powershell
cd ..\backend
python -m pip install -r requirements.txt
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

```powershell
cd frontend
npm install
npm run dev:web
```

The development server proxies API requests to `127.0.0.1:8000`, avoiding
local browser CORS errors. Run `npm run dev` (not only `npm run dev:web`) to
start both Vite and FastAPI; the API listens on `127.0.0.1:8000`. The UI
separately reports API connectivity and model readiness, and retries its
health check every 15 seconds if the backend starts later. For a separately
hosted API or Vite preview/production build, set `VITE_API_BASE_URL` in `.env`
to the API origin and configure `CORS_ORIGINS` in `backend/.env` to include
the frontend's exact browser origin.

The analysis screen accepts PNG/JPEG files up to 10 MB, previews the selected
image, and displays the actual API response class, uncalibrated model score,
segmentation mask, and ROI when returned. The dashboard and charts reflect
only completed analyses stored in the current browser; the latest eight
results are kept locally. A downloadable PDF summarizes the selected
prediction. Grad-CAM is shown only if a future API response provides it; the
frontend displays it when the response includes `grad_cam_png_base64`; the
current backend does not generate one.

The backend health check reports the resolved model checkpoint locations and
any missing files or model-load error. Place the original trained checkpoints
at those configured paths; the API does not produce predictions until both
models load successfully.

The application is an educational research prototype, not a medical device.
Its model scores are not calibrated probabilities and must not be used for
clinical decisions.
