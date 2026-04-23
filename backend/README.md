# Backend Service Guide

FastAPI backend for MineSafe AI, including auth, zone risk APIs, crack workflows, notifications, and AI integrations.

## Service Summary

- Framework: FastAPI
- Data Layer: MongoDB via Beanie ODM
- Auth: JWT
- Realtime: WebSocket + push notifications
- AI Integrations:
  - Groq (summaries, explanations, crack remarks)
  - Local and ML model services for operational scoring

## Local Run

```bash
python -m venv env
# Windows PowerShell
.\env\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Health endpoint:
- http://127.0.0.1:8000/api/health

## Required Environment Variables

Create backend/.env:

```env
MONGODB_URL=mongodb://localhost:27017
DATABASE_NAME=rockefeller
SECRET_KEY=change_this
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=10080

CORS_ORIGINS=http://localhost:5173,https://rockefeller-jade.vercel.app,https://rockefeller-production.up.railway.app
CORS_ORIGIN_REGEX=^https://([a-z0-9-]+\.)?vercel\.app$

GROQ_API_KEY=
GEMINI_API_KEY=

VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_CLAIMS_SUBJECT=mailto:admin@rockefeller.local
```

## Railway Deployment

Railway service settings:
- Root Directory: backend
- Build Command: pip install -r requirements.txt
- Start Command: uvicorn app.main:app --host 0.0.0.0 --port $PORT

Deployment steps:
1. Set environment variables in Railway.
2. Redeploy backend.
3. Verify:
   - https://rockefeller-production.up.railway.app/api/health

## Crack Model Setup on Railway

Configure these environment variables in Railway:

```env
CRACK_MODEL_URL=<direct .keras asset URL>
MODEL_CACHE_DIR=/tmp/model_cache
MODEL_DOWNLOAD_TIMEOUT_SEC=300
CRACK_MODEL_PATH=/tmp/model_cache/crack_model.keras
```

Notes:
- Use a direct release-asset URL for the model file, not the release page URL.
- On startup, the backend downloads the file only if it does not already exist at CRACK_MODEL_PATH.
- If a downloaded file is corrupted, the backend deletes it and retries download once.
- If model preparation fails, crack inference endpoints return:

```json
{"error":"model_unavailable"}
```

## CORS Setup for Vercel

Production Vercel URL:
- https://rockefeller-jade.vercel.app

Ensure CORS_ORIGINS includes this exact domain and keep CORS_ORIGIN_REGEX enabled for preview branches.

## AI Endpoints

- POST /api/groq/zones/{zone_id}/summary
- POST /api/groq/alerts/{alert_id}/explain
- POST /api/groq/crack-remarks

## Operational Notes

- Do not commit real secrets.
- Keep backend/.env out of Git.
- Rotate compromised API keys immediately.
- Backend runs a daily refresh job at 06:00 (default Asia/Kolkata) to pull fresh rainfall and regenerate zone predictions.
- Configure `DAILY_REFRESH_TIMEZONE`, `DAILY_REFRESH_HOUR`, and `DAILY_REFRESH_MINUTE` in `.env` to change schedule.
