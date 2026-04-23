# Rockefeller Web Platform Master Documentation

Last updated: 2026-04-19

This file is the complete reference for both frontend and backend of the Rockefeller (MineSafe AI) web platform.

## 1. Project Summary

Rockefeller is a full-stack mine safety platform that combines:
- React + Vite frontend command center
- FastAPI backend APIs
- MongoDB data layer via Beanie ODM
- ML-assisted risk and anomaly workflows
- WebSocket and browser push notifications

Primary roles:
- Admin
- Safety Officer
- Field Worker

Primary workflows:
- Zone risk monitoring and map intelligence
- Crack report intake, verification, and escalation
- Blast and exploration logging
- Weather and rainfall risk forecasting
- Presence/headcount operations
- Alert and emergency broadcast operations

## 2. Live Deployments

- Frontend (Vercel): https://rockefeller-jade.vercel.app
- Backend (Railway): https://rockefeller-production.up.railway.app
- Health: https://rockefeller-production.up.railway.app/api/health

## 3. Monorepo Layout

- src/: React frontend source
- backend/app/: FastAPI core app, routes, models, services
- backend/scripts/: seeding and utility scripts
- dataset/: model artifacts and training data
- uploads/: uploaded media artifacts
- backend/uploads/: backend upload folder used at runtime
- website.md: previous long-form docs
- web.md: this complete doc

## 4. Frontend Complete Details

### 4.1 Frontend Runtime and Build

Project info from package.json:
- name: geoalert-dashboard
- version: 1.0.0
- module type: ES modules

Scripts:
- npm run dev: starts Vite dev server
- npm run build: production build
- npm run preview: serves built output locally

### 4.2 Frontend Dependencies (Exact)

Runtime dependencies:
- @deck.gl/core ^9.0.0
- @deck.gl/geo-layers ^9.0.0
- @deck.gl/layers ^9.0.0
- @deck.gl/react ^9.0.0
- @emotion/react ^11.11.0
- @emotion/styled ^11.11.0
- @mui/icons-material ^5.15.0
- @mui/material ^5.15.0
- axios ^1.13.6
- framer-motion ^11.18.2
- leaflet ^1.9.4
- maplibre-gl ^5.21.1
- react ^18.2.0
- react-dom ^18.2.0
- react-leaflet ^4.2.1
- react-loading-skeleton ^3.5.0
- react-map-gl ^8.1.0
- react-router-dom ^6.21.0
- recharts ^2.15.4

Dev dependencies:
- @types/react ^18.2.0
- @types/react-dom ^18.2.0
- @vitejs/plugin-react-swc ^3.5.0
- vite ^5.0.0

### 4.3 Frontend Environment Variables

Required:
- VITE_API_URL

Optional:
- VITE_API_FALLBACK_URL
- VITE_MAPTILER_KEY

Behavior:
- API base URL is resolved in src/config/api.js
- If VITE_API_URL is empty, fallback URL is used
- Trailing slashes are normalized to avoid double slash request issues

### 4.4 Frontend Bootstrapping and Providers

Startup flow:
- src/main.jsx mounts App in React.StrictMode
- App provider order in src/App.jsx:
  - ThemeModeProvider
  - AuthProvider
  - NotificationProvider
  - MUI ThemeProvider and CssBaseline
  - RouterProvider

Theme behavior:
- Dynamic dark/light theme via createTheme
- Typography base uses Inter-first stack
- Theme mode persistence in localStorage

### 4.5 Frontend Route Map (Exact)

Public routes:
- /login
- /signup

Protected shell routes:
- /dashboard
- /map
- /zones/:id
- /alerts
- /crack-reports
- /crack-reports/:id
- /reports
- /reports/:id
- /analytics
- /predictions
- /iot-sensors
- /blasts
- /explorations
- /profile
- /field-report
- /admin (admin-only)

Routing notes:
- / redirects to /dashboard
- AppShell wraps all protected pages
- PrivateRoute enforces auth and optional role restrictions

### 4.6 Frontend Contexts and Session State

AuthContext:
- token stored under localStorage key token
- user stored under localStorage key currentUser
- validates token via GET /api/auth/me
- clears auth on 401/403

NotificationContext:
- loads notifications from GET /api/notifications
- opens websocket connection to /ws/{user_id}?token=<jwt>
- handles notification and emergency_broadcast events
- auto reconnects websocket on disconnect
- registers browser push subscription via service worker and VAPID key
- includes polling fallback sync from /api/notifications every 12 seconds
- supports user id fallback currentUser.id or currentUser._id

ThemeModeContext:
- persists mode using localStorage key rockefeller-theme-mode
- updates html class and data-theme attribute

### 4.7 Frontend Layout and UX Shell

App shell behavior:
- fixed sidebar and fixed header
- compact sidebar width for /map
- standard sidebar for other routes
- animated route transitions outside map route

Header behavior:
- route-aware breadcrumbs
- notification bell with unread count
- drawer listing notifications
- mark one or mark all read actions

Sidebar behavior:
- role-aware menu entries
- admin item shown only for admin role
- profile and logout anchored in sidebar

### 4.8 Frontend API Modules and Backend Contract

API base client:
- src/api/axios.js adds Authorization bearer token automatically
- 401 handler clears token and redirects to /login

API modules:
- alerts.js
  - GET /api/alerts
  - GET /api/alerts/{alert_id}
  - POST /api/alerts
  - PATCH /api/alerts/{alert_id}/acknowledge
  - PATCH /api/alerts/{alert_id}/resolve
- zones.js
  - GET /api/zones
  - GET /api/zones/{zone_id}
  - GET /api/zones/{zone_id}/forecast
  - PATCH /api/zones/{zone_id}
  - GET /api/risk-levels
- crackReports.js
  - GET /api/crack-reports
  - POST /api/crack-reports
  - PATCH /api/crack-reports/{report_id}
  - PATCH /api/crack-reports/verify-bulk
- reports.js
  - GET /api/reports
  - GET /api/reports/{report_id}
  - POST /api/reports
  - POST /api/reports/generate-ai-draft
- blasts.js
  - POST /api/blasts
  - GET /api/blasts
  - GET /api/blasts/{blast_id}
- blastEvents.js
  - POST /api/blast-events
  - GET /api/blast-events
- explorations.js
  - POST /api/explorations
  - GET /api/explorations
  - GET /api/explorations/{exploration_id}
- weather.js
  - GET /api/weather
  - GET /api/weather/{district}
- rainfall.js
  - GET /api/rainfall/forecast/{district}
  - GET /api/rainfall/zone-risk-flags
- notifications.js
  - GET /api/notifications
  - PATCH /api/notifications/{notification_id}/read
  - PATCH /api/notifications/read-all
- push.js
  - GET /api/push/vapid-public-key
  - POST /api/push/subscribe
- emergency.js
  - POST /api/emergency/broadcast
- presence.js
  - GET /api/presence/me
  - PATCH /api/presence/me/check-in
  - PATCH /api/presence/me/check-out
  - GET /api/presence/headcount
  - GET /api/presence/red-alert-inside
- history.js
  - GET /api/history
- predictions.js
  - GET /api/predictions/zones
  - GET /api/predictions/zones/{zone_id}
  - GET /api/predictions/summary
- groq.js
  - POST /api/groq/zones/{zone_id}/summary
  - POST /api/groq/alerts/{alert_id}/explain
  - POST /api/groq/crack-remarks

### 4.9 Frontend Feature Modules

Major page modules:
- Dashboard
- MapView
- ZoneDetails
- Alerts
- CrackReports
- CrackReportDetails
- Reports
- ReportDetails
- Analytics
- Predictions
- Blasts
- Explorations
- FieldReport
- Profile
- Admin
- IoTSensors

Recent production-critical additions:
- Crack Reports details includes Generate with AI and Generate with Grok for technical remarks
- Notification delivery hardened with websocket + polling fallback

## 5. Backend Complete Details

### 5.1 Backend Runtime and Dependencies

Backend framework and runtime:
- FastAPI
- Uvicorn
- Python 3.10 runtime target

Python dependencies from backend/requirements.txt:
- fastapi
- uvicorn[standard]
- motor==3.7.0
- beanie==1.26.0
- pymongo==4.9.0
- python-jose[cryptography]
- bcrypt
- pydantic[email]
- pydantic-settings
- python-multipart
- python-dotenv
- aiofiles
- xgboost>=2.0.0
- scikit-learn>=1.3.0
- prophet>=1.1.5
- pandas>=2.0.0
- numpy>=1.24.0
- pywebpush>=2.0.3
- tensorflow>=2.15.0
- urllib3>=2.2.0
- groq

### 5.2 FastAPI App Assembly and Startup

In backend/app/main.py:
- initializes database with init_db
- runs IMD collector (non-fatal if it fails)
- preloads ML models and crack model
- runs daily risk forecast
- configures CORS from CORS_ORIGINS and CORS_ORIGIN_REGEX
- mounts static uploads under /uploads
- includes all routers
- serves GET /api/health

### 5.3 Backend Router Inventory

Included route modules in backend/app/api/routes:
- auth.py
- users.py
- zones.py
- alerts.py
- reports.py
- crack_reports.py
- blasts.py
- blast_events.py
- explorations.py
- weather.py
- rainfall.py
- notifications.py
- push.py
- emergency.py
- presence.py
- history.py
- predictions.py

Additional router module:
- backend/app/routers/groq_router.py

### 5.4 Backend API Endpoints (Method + Path)

Auth (/api/auth):
- POST /register
- POST /login
- GET /me
- GET /users
- PATCH /users/{user_id}/role

Users (/api/users):
- GET /
- POST /
- PATCH /{user_id}
- DELETE /{user_id}

Zones and risk:
- GET /api/zones
- GET /api/zones/{zone_id}
- GET /api/zones/{zone_id}/forecast
- PATCH /api/zones/{zone_id}
- GET /api/risk-levels

Alerts (/api/alerts):
- GET /
- GET /{alert_id}
- POST /
- PATCH /{alert_id}/acknowledge
- PATCH /{alert_id}/resolve

Reports (/api/reports):
- POST /generate-ai-draft
- GET /
- GET /{report_id}
- POST /

Crack Reports (/api/crack-reports):
- GET /
- GET /{report_id}
- POST /
- PATCH /verify-bulk
- PATCH /{report_id}
- PATCH /{report_id}/review
- PATCH /{report_id}/verify
- PATCH /{report_id}/reject
- PATCH /{report_id}/notify-critical

Blast APIs:
- /api/blasts
  - POST /
  - GET /
  - GET /{blast_id}
- /api/blast-events
  - POST /
  - GET /

Explorations (/api/explorations):
- POST /
- GET /
- GET /{exploration_id}

Weather and Rainfall:
- /api/weather
  - GET /
  - GET /{district}
  - POST /
- /api/rainfall
  - GET /forecast/{district}
  - GET /zone-risk-flags

Notifications and push:
- /api/notifications
  - GET /
  - PATCH /{notification_id}/read
  - PATCH /read-all
- /api/push
  - GET /vapid-public-key
  - POST /subscribe

Presence and emergency:
- /api/presence
  - GET /me
  - PATCH /me/check-in
  - PATCH /me/check-out
  - GET /headcount
  - GET /red-alert-inside
- /api/emergency
  - POST /broadcast

History and predictions:
- /api/history
  - GET /
- /api/predictions
  - GET /zones
  - GET /zones/{zone_id}
  - GET /summary

Groq AI routes (/api/groq):
- POST /zones/{zone_id}/summary
- POST /zones/{zone_id}/summary/stream
- POST /alerts/{alert_id}/explain
- POST /crack-remarks

Health:
- GET /api/health

### 5.5 WebSocket Contract

Endpoint:
- /ws/{user_id}?token=<jwt>

Validation:
- token required
- token must decode to valid user
- user id in token must match path user_id unless role is admin

Server events:
- notification
- emergency_broadcast

### 5.6 Security and Role Access

Security core:
- JWT create/decode in app/core/security.py
- password hashing and verification via bcrypt

Role guards in dependencies:
- get_current_user: any authenticated user
- require_officer: safety_officer or admin
- require_admin: admin only

### 5.7 Backend Database Models (Beanie)

Registered documents in app/core/database.py:
- User
- Zone
- Alert
- Report
- CrackReport
- BlastEvent
- ExplorationLog
- WeatherRecord
- HistoricalLandslide
- RiskPrediction
- UserLocation
- WorkerPresence
- Notification
- PushSubscription

### 5.8 Backend Service Modules

Service modules in backend/app/services:
- ml_models.py
  - zone risk prediction, rainfall forecast, blast anomaly scoring
- crack_ai.py
  - crack image severity classification and risk score
- report_ai.py
  - field report draft generation with fallback
- groq_service.py
  - zone summary, alert explanation, crack remarks generation
- forecast_runner.py
  - scheduled daily prediction runs
- notification_service.py
  - persists notification rows and sends websocket events
- push_service.py
  - push subscription management and web push delivery

### 5.9 Critical Notification Behavior

Crack report verification flow:
- /api/crack-reports/{report_id}/verify updates report and creates alert
- sends user notifications to workers and officers/admin targets

Critical notify flow:
- /api/crack-reports/{report_id}/notify-critical
- sends separate messages to inside-zone workers and outside-zone workers
- sends systemwide informational broadcast to non-worker users

### 5.10 File Uploads and Static Serving

Upload paths:
- reports: uploads/reports
- crack reports: uploads/crack_reports

Static mount:
- /uploads serves files from configured UPLOAD_DIR

### 5.11 Backend Environment Variables (Complete)

Core:
- MONGODB_URL
- DATABASE_NAME
- SECRET_KEY
- ALGORITHM
- ACCESS_TOKEN_EXPIRE_MINUTES
- REFRESH_TOKEN_EXPIRE_DAYS
- REDIS_URL

CORS:
- CORS_ORIGINS
- CORS_ORIGIN_REGEX

AI and model:
- GEMINI_API_KEY
- GEMINI_MODEL
- GROQ_API_KEY
- MODEL_ARTIFACTS_DIR
- CRACK_MODEL_PATH
- CRACK_MODEL_URL
- MODEL_CACHE_DIR
- MODEL_DOWNLOAD_TIMEOUT_SEC

Uploads and limits:
- UPLOAD_DIR
- MAX_UPLOAD_SIZE_MB

Rule thresholds:
- RAINFALL_YELLOW_THRESHOLD_MM
- RAINFALL_ORANGE_THRESHOLD_MM
- RAINFALL_RED_THRESHOLD_MM
- BLAST_YELLOW_THRESHOLD
- BLAST_ORANGE_THRESHOLD
- BLAST_REEVAL_THRESHOLD
- DGMS_PPV_LIMIT_MM_S
- CRACK_RISK_FLAG_THRESHOLD
- CRACK_RISK_CRITICAL_THRESHOLD
- WATER_REPORT_YELLOW_THRESHOLD
- ZONE_PROXIMITY_ALERT_METERS

Push notification config:
- VAPID_PUBLIC_KEY
- VAPID_PRIVATE_KEY
- VAPID_CLAIMS_SUBJECT

### 5.12 Backend Deployment (Railway)

Recommended service settings:
- Root Directory: backend
- Build Command: pip install -r requirements.txt
- Start Command: uvicorn app.main:app --host 0.0.0.0 --port $PORT

Post-deploy checks:
- /api/health returns 200
- /openapi.json includes latest routes
- CORS allows production frontend origin

## 6. AI and ML Workflow Details

Zone risk pipeline:
- combines weather, blast, crack, and zone features
- predicts risk score and risk label
- supports fallback risk formula path

Crack AI:
- image-based crack severity class and risk score
- threshold flags critical crack conditions

Report AI drafting:
- /api/reports/generate-ai-draft
- uses AI provider when configured, fallback template when unavailable

Groq generation surfaces:
- zone risk summary
- alert explanation
- crack technical remarks generation

## 7. End-to-End Operational Flows

Flow A: Crack report to verify and notify
1. Field worker submits crack report with image
2. Report enters review queue
3. Admin verifies report
4. Alert row is created
5. Notifications delivered in-app and via push

Flow B: Critical crack notify broadcast
1. Officer/admin runs notify-critical action
2. Inside-zone workers receive evacuation-focused message
3. Outside-zone workers receive avoidance advisory
4. Non-worker users receive systemwide broadcast update

Flow C: Frontend notification delivery
1. Websocket receives event and updates drawer/snackbar
2. If websocket fails, polling sync fetches new notifications
3. Push acts as extra channel when subscription exists

## 8. Frontend and Backend Local Setup

Frontend:
1. npm install
2. npm run dev

Backend:
1. cd backend
2. python -m venv env
3. .\env\Scripts\Activate.ps1
4. pip install -r requirements.txt
5. uvicorn app.main:app --reload --port 8000

## 9. Production Smoke Test Checklist

- Login works for admin and worker roles
- /api/zones loads in frontend dashboard/map
- crack submit works and media uploads are accessible
- verify action creates alert and notifications
- notify-critical sends segmented notification titles
- AI draft and Groq generation endpoints respond
- websocket updates notification drawer without page reload
- fallback polling updates notifications within 12 seconds if websocket is down

## 10. Troubleshooting

Frontend no notifications:
- verify token exists and user is logged in
- check websocket connection in browser devtools
- confirm /api/notifications returns rows for that user
- wait up to 12 seconds for polling fallback sync

Backend 404 on new endpoints:
- deployment is likely on older commit
- verify /openapi.json contains new path
- redeploy Railway from latest main

CORS failures:
- add exact Vercel URL to CORS_ORIGINS
- keep CORS_ORIGIN_REGEX for preview URLs
- redeploy backend after env change

Grok generation failures:
- set GROQ_API_KEY in backend runtime
- verify route /api/groq/crack-remarks exists in OpenAPI

## 11. Security and Compliance Notes

- Never commit real credentials in .env.example or docs
- Use placeholders for all secrets in tracked files
- Rotate exposed keys/passwords immediately
- Keep backend/.env and root .env files gitignored
- Use least-privilege DB users and periodic secret rotation

## 11.5 Daily Rainfall Data Refresh (GitHub Actions)

**Problem solved**: Backend rainfall data doesn't automatically update; relies only on startup or manual refresh.

**Solution**: Automated daily refresh via GitHub Actions at 6:00 AM IST daily.

### Setup Steps

1. **Add a GitHub Actions Secret** in repository settings:
   - Go to Settings → Secrets and variables → Actions
   - Add `RAINFALL_REFRESH_TOKEN`: JWT admin token (get from logged-in admin user)
   - Add `BACKEND_API_URL`: Backend URL (e.g., `https://rockefeller-production.up.railway.app`)

2. **Generate admin JWT token** for GitHub Actions:
   ```bash
   # Login with admin account via frontend
   # Copy token from localStorage['token']
   # Or use backend script:
   python -c "
   from app.core.security import create_access_token
   from app.models.user import User
   # Run in authenticated context to generate token
   token = create_access_token(data={'sub': 'admin@rockefeller.io'})
   print(token)
   "
   ```

3. **Workflow file**: `.github/workflows/refresh-rainfall.yml`
   - Runs at 0:30 UTC daily (= 6:00 AM IST)
   - Calls `POST /api/rainfall/refresh`
   - Requires admin authentication
   - Can be manually triggered from Actions tab

### Backend Refresh Endpoint

- **Route**: `POST /api/rainfall/refresh`
- **Auth**: Admin only (requires valid JWT)
- **Behavior**: Triggers IMD collector in background; returns immediately
- **Response**:
  ```json
  {
    "status": "refresh_started",
    "message": "Rainfall data refresh initiated in background",
    "triggered_by": "admin@rockefeller.io"
  }
  ```

### Manual Refresh

To manually refresh without waiting for 6 AM:
```bash
curl -X POST \
  -H "Authorization: Bearer <admin_jwt>" \
  https://rockefeller-production.up.railway.app/api/rainfall/refresh
```

### Monitoring

- Check workflow runs: Actions tab → "Refresh Rainfall Data Daily"
- Logs show curl status and timestamp
- Backend logs show IMD collector output (check Railway logs)

### Notes

- Cron schedule: `30 0 * * *` (UTC time, adjust as needed)
- IMD collector uses free Open-Meteo API (no key required)
- Refresh typically completes in <2 minutes for all 36 districts

## 12. Maintenance Notes

When you update routes, models, or provider behavior, update this file together with README.md and backend/README.md so all docs remain synchronized.
