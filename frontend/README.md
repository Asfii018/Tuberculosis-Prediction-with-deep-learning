# React frontend

The Vite application provides the landing page and chest X-ray analysis
interface. It reads model readiness from FastAPI and only enables analysis
when the configured U-Net and DenseNet checkpoints are loaded. It does not
display mock metrics, predictions, or confidence values.

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
local browser CORS errors. The UI retries its API readiness check every 15
seconds if the backend starts later. For a separately hosted API, set
`VITE_API_BASE_URL` in `.env` to its absolute URL and configure backend CORS
to allow the frontend's origin.

The analysis screen accepts PNG/JPEG files up to 10 MB, previews the selected
image locally, and displays the actual API response mask and ROI. This
prototype does not yet include authentication, MongoDB history, reports,
analytics, or administration.
