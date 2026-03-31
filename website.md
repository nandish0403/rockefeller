# Rockefeller / MineSafe AI Website Full Documentation

## 1. Project Overview

Rockefeller (MineSafe AI) is a full-stack mine safety web platform for open-pit mine monitoring, risk prediction, and incident response.

It combines:
- A React + Vite frontend command center.
- A FastAPI backend with MongoDB (Beanie ODM).
- ML-assisted risk workflows (zone risk, blast anomaly, crack image scoring, rainfall forecasting).
- Real-time delivery with WebSocket and browser push notifications.

Primary user roles:
- Admin
- Safety Officer
- Field Worker

Primary operational domains:
- Zone risk monitoring
- Blast and exploration logging
- Field and crack reporting
- Alerting and escalation
- Presence/headcount support
- Forecast-driven planning

## 2. Technology Stack

### 2.1 Frontend

- Runtime: React 18
- Build: Vite 5 (`@vitejs/plugin-react-swc`)
- Router: React Router 6
- UI: Material UI 5 + Emotion
- Animation: Framer Motion
- Maps: Deck.gl + react-map-gl + maplibre-gl + react-leaflet
- Charts: Recharts
- API: Axios
- Utility visuals: react-loading-skeleton

### 2.2 Backend

- API framework: FastAPI
- ASGI server: Uvicorn
- DB: MongoDB via Motor + Beanie
- Auth: JWT (`python-jose`) + bcrypt
- File upload handling: python-multipart + aiofiles
- Push: pywebpush (VAPID)
- ML/DS libs: numpy, pandas, scikit-learn, xgboost, prophet, tensorflow

### 2.3 Deployment/Runtime

- Backend Docker base image: `python:3.10-slim`
- Runtime pin file: `python-3.10`

## 3. Repository Structure (Functional)

- `src/`: frontend app
- `backend/app/`: FastAPI app, routes, models, core logic, services
- `backend/scripts/`: seed and data utility scripts
- `dataset/`: model artifacts and training/support data
- `uploads/`: user-uploaded report media
- `backend/uploads/`: backend-local upload storage when running from backend cwd

## 4. Frontend Architecture (Detailed)

### 4.1 App Bootstrap and Providers

`src/main.jsx`:
- Loads global CSS and third-party CSS for Leaflet/skeleton.
- Mounts `<App />` inside `React.StrictMode`.

`src/App.jsx` provider order:
1. `ThemeModeProvider`
2. `AuthProvider`
3. `NotificationProvider`
4. MUI `ThemeProvider` + `CssBaseline`
5. `RouterProvider`

Theme behavior:
- Dynamic `createTheme` based on mode (`light`/`dark`).
- Typography uses Inter-first stack.
- Light and dark palettes are both supported in code.

### 4.2 Frontend Environment and API Base

- `src/config/api.js` exports `API_BASE_URL = import.meta.env.VITE_API_URL`.
- Frontend must define `VITE_API_URL` (`.env` or `.env.local`).

### 4.3 Authentication State Management

`src/context/AuthContext.jsx`:
- Stores token key: `token` in localStorage.
- Stores user key: `currentUser` in localStorage.
- On token change, validates with `GET /api/auth/me`.
- On 401/403: clears localStorage and resets auth state.
- `login(email,password)` calls `POST /api/auth/login` then stores token + user.
- `logout()` clears token/user and local auth state.

### 4.4 Notification, Realtime, and Push

`src/context/NotificationContext.jsx`:
- Loads in-app notifications from `GET /api/notifications`.
- Opens websocket to `ws://.../ws/{user_id}?token={jwt}`.
- Handles websocket events:
	- `notification` -> prepends notification + snackbar
	- `emergency_broadcast` -> opens full-screen emergency dialog
- Auto-reconnect on socket close (5s retry).
- Push registration flow:
	- Registers service worker at `/sw.js`
	- Requests browser notification permission
	- Fetches VAPID key (`GET /api/push/vapid-public-key`)
	- Sends subscription (`POST /api/push/subscribe`)
	- Uses localStorage key prefix `push_sub_sent:{user_id}` to avoid duplicate registration

### 4.5 Theme Mode State

`src/context/ThemeModeContext.jsx`:
- Storage key: `rockefeller-theme-mode`.
- Applies `theme-dark` / `theme-light` class on `<html>`.
- Sets `data-theme` attribute.

### 4.6 Route Protection

`src/routes/PrivateRoute.jsx`:
- While auth state is loading: shows skeleton placeholder.
- If unauthenticated: redirects to `/login`.
- If `requiredRole` is set and role mismatch: redirects to `/dashboard`.

### 4.7 App Shell and Navigation

`src/components/layout/AppShell.jsx`:
- Fixed sidebar + fixed header + outlet content area.
- Sidebar width:
	- `/map`: 96px compact
	- all other routes: 256px
- Main content left margin follows sidebar width.
- Framer Motion route transitions enabled except `/map`.

`src/components/layout/SidebarNav.jsx`:
- Scrollable navigation section for long menu lists.
- Fixed bottom profile and logout controls.
- Admin menu item rendered only when `currentUser.role === "admin"`.

`src/components/layout/Header.jsx`:
- Route-aware breadcrumb labels.
- Notification bell with unread badge.
- Right-side drawer for notifications with mark-read actions.

## 5. Frontend Route Map (Current)

Public routes:
- `/login`
- `/signup`

Protected routes (inside `AppShell`):
- `/dashboard`
- `/map`
- `/zones/:id`
- `/alerts`
- `/crack-reports`
- `/crack-reports/:id`
- `/reports`
- `/reports/:id`
- `/analytics`
- `/predictions`
- `/iot-sensors`
- `/blasts`
- `/explorations`
- `/profile`
- `/field-report`
- `/admin` (admin-only)

Notes:
- `/` redirects to `/dashboard`.
- `src/pages/Upload/index.jsx` exists in repository but is not currently routed.

## 6. Frontend API Modules (Exact Contract)

`src/api/axios.js`:
- Injects `Authorization: Bearer <token>` on each request if token exists.
- On 401 response: clears token and redirects to `/login`.

### 6.1 Alerts API (`src/api/alerts.js`)
- `fetchAlerts(params)` -> `GET /api/alerts`
- `fetchAlert(id)` -> `GET /api/alerts/{id}`
- `acknowledgeAlert(id)` -> `PATCH /api/alerts/{id}/acknowledge`
- `resolveAlert(id)` -> `PATCH /api/alerts/{id}/resolve`
- `createAlert(data)` -> `POST /api/alerts`

### 6.2 Zones API (`src/api/zones.js`)
- `fetchZones(params)` -> `GET /api/zones`
- `fetchZone(id)` -> `GET /api/zones/{id}`
- `updateZone(id,data)` -> `PATCH /api/zones/{id}`
- `fetchRiskLevels(params)` -> `GET /api/risk-levels`

### 6.3 Crack Reports API (`src/api/crackReports.js`)
- `fetchCrackReports(params)` -> `GET /api/crack-reports`
- `submitCrackReport(formData)` -> `POST /api/crack-reports` (multipart)
- `updateCrackReport(id,data)` -> `PATCH /api/crack-reports/{id}`
- `verifyCrackReportsBulk(reportIds)` -> `PATCH /api/crack-reports/verify-bulk`

### 6.4 Reports API (`src/api/reports.js`)
- `fetchReports(params)` -> `GET /api/reports`
- `fetchReportById(id)` -> `GET /api/reports/{id}`
- `submitReport(formData)` -> `POST /api/reports` (multipart)
- `generateReportAIDraft(payload)` -> `POST /api/reports/generate-ai-draft`

### 6.5 Blast APIs
- `src/api/blasts.js`:
	- `fetchBlasts(params)` -> `GET /api/blasts`
	- `fetchBlastById(id)` -> `GET /api/blasts/{id}`
	- `createBlast(data)` -> `POST /api/blasts`
- `src/api/blastEvents.js`:
	- `fetchBlastEvents(params)` -> `GET /api/blast-events`
	- `createBlastEvent(data)` -> `POST /api/blast-events`

### 6.6 Explorations API (`src/api/explorations.js`)
- `fetchExplorations(params)` -> `GET /api/explorations`
- `fetchExplorationById(id)` -> `GET /api/explorations/{id}`
- `createExploration(data)` -> `POST /api/explorations`

### 6.7 Predictions API (`src/api/predictions.js`)
- `fetchPredictionsSummary()` -> `GET /api/predictions/summary`
- `fetchZonePredictions()` -> `GET /api/predictions/zones`
- `fetchZonePredictionDetail(zoneId)` -> `GET /api/predictions/zones/{zoneId}`

### 6.8 Weather/Rainfall API
- `src/api/weather.js`:
	- `fetchWeather(params)` -> `GET /api/weather`
	- `fetchWeatherByDistrict(district)` -> `GET /api/weather/{district}`
- `src/api/rainfall.js`:
	- `fetchDistrictForecast(district,daysAhead)` -> `GET /api/rainfall/forecast/{district}`
	- `fetchZoneForecastFlags(daysAhead)` -> `GET /api/rainfall/zone-risk-flags`

### 6.9 Notifications/Push/Emergency/Presence/History API
- `src/api/notifications.js`:
	- `fetchNotifications(params)` -> `GET /api/notifications`
	- `markNotificationRead(id)` -> `PATCH /api/notifications/{id}/read`
	- `markAllNotificationsRead()` -> `PATCH /api/notifications/read-all`
- `src/api/push.js`:
	- `getVapidPublicKey()` -> `GET /api/push/vapid-public-key`
	- `subscribePush(subscription)` -> `POST /api/push/subscribe`
- `src/api/emergency.js`:
	- `sendEmergencyBroadcast(payload)` -> `POST /api/emergency/broadcast`
- `src/api/presence.js`:
	- `fetchMyPresence()` -> `GET /api/presence/me`
	- `checkIn(zoneId)` -> `PATCH /api/presence/me/check-in`
	- `checkOut()` -> `PATCH /api/presence/me/check-out`
	- `fetchHeadcount(zoneId)` -> `GET /api/presence/headcount`
	- `fetchRedAlertInside()` -> `GET /api/presence/red-alert-inside`
- `src/api/history.js`:
	- `fetchHistoricalEvents(params)` -> `GET /api/history`

## 7. Frontend Pages (Functional Purpose)

- Dashboard: command center KPIs, risk distribution, trends, alerts, and quick operational status.
- Map View: spatial risk visualization with interactive zone context.
- Zone Details: single-zone deep drill including risk context and related records.
- Alerts: active/acknowledged/resolved alert management.
- Reports: field report listing and filtering.
- Report Details: full report context with media/details.
- Crack Reports: crack submission/review operations and lifecycle actions.
- Crack Report Details: per-report AI/review detail view.
- Analytics: cross-zone metrics and trends.
- Predictions: model summary + per-zone forecast detail.
- Blasts: blast event entry + recent blast telemetry list.
- Explorations: exploration log entry + recent logs and saturation context.
- Field Report: structured report submission workflow (includes AI draft option).
- IoT Sensors: sensor-focused page (currently lighter/placeholder-style).
- Profile: user profile and role-specific personal/operational view.
- Admin: admin control center (users/zones/alerts operational oversight).
- Login/Signup: authentication onboarding screens.

## 8. Backend Architecture (Detailed)

### 8.1 FastAPI App Assembly

`backend/app/main.py`:
- Creates app with lifespan startup/shutdown manager.
- Configures CORS from `settings.CORS_ORIGINS` (comma-separated list).
- Ensures upload directories exist:
	- `uploads/reports`
	- `uploads/crack_reports`
- Mounts static uploads at `/uploads`.
- Includes all API routers.
- Exposes health endpoint: `GET /api/health`.

### 8.2 Startup Lifecycle Sequence

On startup:
1. `init_db()` opens MongoDB and initializes Beanie models.
2. Runs IMD collector (`app.ml.collectors.imd_collector.run`) to fetch latest rainfall.
3. Preloads ML models (`preload_models`).
4. Preloads crack model (`preload_crack_model`).
5. Runs daily risk forecast (`run_daily_risk_forecast`) for zones.

On shutdown:
- `close_db()` closes MongoDB client.

All startup extras are wrapped with non-fatal error handling to keep API boot resilient.

### 8.3 Database Initialization

`backend/app/core/database.py` registers Beanie documents:
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

### 8.4 Security Core

`backend/app/core/security.py`:
- Password hash/verify via bcrypt.
- JWT create/decode via jose.
- Access token includes `exp` expiration claim.

`backend/app/api/dependencies.py` role guards:
- `require_user`: any authenticated user
- `require_officer`: admin or safety_officer
- `require_admin`: admin only

### 8.5 Rule Engine and Risk Update

`backend/app/core/rule_engine.py`:
- Builds zone features from recent blasts, crack reports, and weather.
- Uses ML prediction (`predict_zone_risk`) when available.
- Falls back to weighted simple formula when ML fails.
- Persists updated zone risk/score.
- Creates alerts when risk escalates.
- Exposes compatibility wrappers:
	- `run_blast_check`
	- `run_rainfall_check`
	- `run_crack_check`

## 9. Backend API Routes (Method + Path)

### 9.1 Auth (`/api/auth`)
- `POST /register`
- `POST /login`
- `GET /me`
- `GET /users` (under auth router)
- `PATCH /users/{user_id}/role`

### 9.2 Users (`/api/users`)
- `GET /`
- `POST /`
- `PATCH /{user_id}`
- `DELETE /{user_id}`

### 9.3 Zones (`/api/zones`)
- `GET /`
- `GET /{zone_id}`
- `GET /{zone_id}/forecast`
- `PATCH /{zone_id}`

Additional risk route:
- `GET /api/risk-levels`

### 9.4 Alerts (`/api/alerts`)
- `GET /`
- `GET /{alert_id}`
- `POST /`
- `PATCH /{alert_id}/acknowledge`
- `PATCH /{alert_id}/resolve`

### 9.5 Reports (`/api/reports`)
- `POST /generate-ai-draft`
- `GET /`
- `GET /{report_id}`
- `POST /`

### 9.6 Crack Reports (`/api/crack-reports`)
- `GET /`
- `GET /{report_id}`
- `POST /`
- `PATCH /verify-bulk`
- `PATCH /{report_id}`
- `PATCH /{report_id}/review`
- `PATCH /{report_id}/verify`
- `PATCH /{report_id}/reject`
- `PATCH /{report_id}/notify-critical`

### 9.7 Blast APIs
- Blast events (`/api/blast-events`):
	- `GET /`
	- `POST /`
- Blasts (`/api/blasts`):
	- `POST /`
	- `GET /`
	- `GET /{blast_id}`

### 9.8 Explorations (`/api/explorations`)
- `POST /`
- `GET /`
- `GET /{exploration_id}`

### 9.9 Weather/Rainfall
- Weather (`/api/weather`):
	- `GET /`
	- `GET /{district}`
	- `POST /`
- Rainfall (`/api/rainfall`):
	- `GET /forecast/{district}`
	- `GET /zone-risk-flags`

### 9.10 Notifications and Push
- Notifications (`/api/notifications`):
	- `GET /`
	- `PATCH /{notification_id}/read`
	- `PATCH /read-all`
- Push (`/api/push`):
	- `GET /vapid-public-key`
	- `POST /subscribe`

### 9.11 Presence, Emergency, History, Predictions
- Presence (`/api/presence`):
	- `GET /me`
	- `PATCH /me/check-in`
	- `PATCH /me/check-out`
	- `GET /headcount`
	- `GET /red-alert-inside`
- Emergency (`/api/emergency`):
	- `POST /broadcast`
- History (`/api/history`):
	- `GET /`
- Predictions (`/api/predictions`):
	- `GET /zones`
	- `GET /zones/{zone_id}`
	- `GET /summary`

## 10. WebSocket Contract

Endpoint:
- `GET ws://<host>/ws/{user_id}?token=<jwt>`

Validation flow:
1. Token query param required.
2. JWT decoded and `sub` resolved to user.
3. Access granted if `auth_user.id == user_id` or role is admin.

Event patterns delivered by backend:
- `notification`
- `emergency_broadcast`

## 11. Backend Data Models (Fields)

### 11.1 User (`users`)
- `name`, `email`, `password_hash`, `role`
- Optional: `district`, `zone_assigned`, `worker_id`, `phone`, `avatar_url`, `last_login`
- `created_at`

### 11.2 Zone (`zones`)
- Identity: `name`, `mine_name`, `district`
- Risk: `risk_level`, `risk_score`, `status`
- Geometry: `latlngs`
- Geology/context: `soil_type`, `slope_angle`, `elevation_m`, `area_sq_km`
- Activity context: `blast_count_7d`, `recent_rainfall`, `soil_saturation_index`
- Incident timestamps: `last_landslide`, `last_updated`, `created_at`
- Indexes: district/risk/status/last_updated + compound district+risk

### 11.3 Alert (`alerts`)
- Zone linkage: `zone_id`, `zone_name`, `district`
- Alert data: `risk_level`, `trigger_reason`, `trigger_source`, `recommended_action`, `status`
- Audit fields: `acknowledged_by/at`, `resolved_by/at`
- `created_at`

### 11.4 Report (`reports`)
- `zone_id`, `zone_name`, `reported_by`, `photo_url`, `coords`
- `severity`, `remarks`, `review_status`, `reviewed_by`, `reviewed_at`, `created_at`

### 11.5 CrackReport (`crack_reports`)
- Reporter/zone: `zone_id`, `zone_name`, `reported_by`, `reporter_user_id`
- Media: `photo_url`, `annotated_photo_url`
- Classification: `crack_type`, `severity`, `ai_severity_class`, `ai_risk_score`, `confidence`, `critical_crack_flag`
- Review: `engineer_action`, `reviewed_by`, `reviewed_at`, `zone_color_before/after`, `status`
- Metadata: `coords`, `remarks`, `created_at`

### 11.6 BlastEvent (`blast_events`)
- Zone/context: `zone_id`, `zone_name`, `logged_by`
- Blast properties: `blast_date`, `blast_time`, `intensity`, `ppv_reading`, `depth_meters`, `blasts_this_week`, `charge_weight_kg`, `detonator_type`, `explosive_type`
- Compliance/anomaly: `dgms_ppv_limit`, `is_ppv_exceedance`, `is_anomaly`, `anomaly_score`, `anomaly_severity`
- `notes`, `created_at`
- Indexed by zone/time combinations

### 11.7 ExplorationLog (`exploration_logs`)
- Zone/context: `zone_id`, `zone_name`, `logged_by`, `log_date`, `activity_type`
- Geology/water: `depth_m`, `water_encountered`, `water_depth_m`, `soil_description`, `moisture_level`
- Notes: `remarks`, `notes`
- Legacy compatibility fields retained: `start_time`, `end_time`, `direction`, `depth_meters`, `equipment`, `active`
- `created_at`

### 11.8 RiskPrediction (`risk_predictions`)
- `zone_id`, `predicted_at`, `risk_score`, `risk_level`
- `model_version`, `features_used`, `confidence`
- Indexed by zone and prediction time

### 11.9 WeatherRecord (`weather_records`)
- `district`, `recorded_at`, `rainfall_mm`
- Optional atmosphere: `wind_speed_kmh`, `temperature_c`, `humidity_percent`
- `warning_level`, `trend`, `source`

### 11.10 HistoricalLandslide (`historical_landslides`)
- `zone_id`, `date`, `type`, `magnitude`, `damage_level`, `notes`, `created_at`

### 11.11 WorkerPresence (`worker_presence`)
- `user_id`, `user_name`, `zone_id`, `zone_name`
- `status`, `last_check_in_at`, `last_check_out_at`, `updated_at`, `created_at`

### 11.12 Notification (`notifications`)
- `user_id`, `title`, `message`, `zone_id`, `zone_name`, `type`, `is_read`, `created_at`

### 11.13 PushSubscription (`push_subscriptions`)
- `user_id`, `subscription`, `created_at`, `updated_at`

### 11.14 UserLocation (`user_locations`)
- `user_id`, `lat`, `lng`, `recorded_at`

## 12. Backend Services (Detailed)

### 12.1 ML Model Service (`backend/app/services/ml_models.py`)

Capabilities:
- Loads model artifacts:
	- `model2_model.pkl`
	- `model2_scaler.pkl`
	- `model2_encoder.pkl`
	- `model4_blast_anomaly.pkl`
- Resolves dataset base from `MODEL_ARTIFACTS_DIR` or fallback folders.
- Resolves model3 directory with compatibility names:
	- `model3_district_models`
	- `model 3 district models`
	- `model 3 distict models`
- Computes zone risk labels from probability thresholds:
	- red >= 0.72
	- orange >= 0.48
	- yellow >= 0.24
	- else green
- Supports live blast feature override by querying last 7-day `BlastEvent` rows.
- Provides district rainfall forecast from Prophet pickle files.
- Performs blast anomaly detection using Isolation Forest with critical score threshold `-0.15`.

### 12.2 Crack AI Service (`backend/app/services/crack_ai.py`)

Capabilities:
- Loads Keras model `model1_best_phase2.keras`.
- Supports path resolution via:
	- `CRACK_MODEL_PATH`
	- `MODEL_ARTIFACTS_DIR`
	- optional download from `CRACK_MODEL_URL` into `MODEL_CACHE_DIR`
- Preprocesses image to 224x224 float tensor.
- Class labels:
	- `no_crack`, `low`, `moderate`, `high`, `critical`
- Maps severity class to risk score:
	- no_crack 0.0
	- low 0.15
	- moderate 0.40
	- high 0.60
	- critical 0.85
- `critical_crack_flag` set when score >= 0.68.

### 12.3 Forecast Runner (`backend/app/services/forecast_runner.py`)

- `run_daily_risk_forecast(zone_id=None)`:
	- collects features via rule engine
	- injects tomorrow rainfall forecast
	- writes `RiskPrediction` documents
	- supports all-zones or zone-only execution

### 12.4 Notification Service (`backend/app/services/notification_service.py`)

- Creates notification rows for user ids.
- Broadcasts websocket payload to each target user.
- Optionally triggers push dispatch.

### 12.5 Push Service (`backend/app/services/push_service.py`)

- Stores/updates push subscriptions per user.
- Sends web push payloads when VAPID is configured.
- Deletes invalid subscriptions after push failure.

### 12.6 Report AI Service (`backend/app/services/report_ai.py`)

- Generates structured report draft via Gemini API.
- If Gemini key missing/unavailable, returns fallback draft template.
- Enforces strict output keys and normalized severity.

## 13. ML Inputs, Outputs, and Thresholds

Zone risk model feature set (`FEATURES`):
- `blast_count_7d`
- `avg_blast_intensity`
- `rainfall_mm_24h`
- `rainfall_mm_7d`
- `crack_count_7d`
- `avg_crack_score`
- `critical_crack_flag`
- `elevation_m`
- `area_sq_km`
- `days_since_inspection`
- `is_monsoon`

Blast anomaly model output:
- `is_anomaly`
- `anomaly_score`
- `severity` (`critical` / `warning` / `normal`)

Rule engine fallback weighted formula:
- rainfall 0.40
- slope 0.20
- soil factor 0.15
- blast activity 0.15
- historical incidents 0.10

## 14. Environment Variables (Backend + Frontend)

### 14.1 Frontend

- `VITE_API_URL` (required for API base URL)
- `VITE_MAPTILER_KEY` (map tile key for map scenes)

### 14.2 Backend (`backend/app/core/config.py`)

- `MONGODB_URL`
- `DATABASE_NAME`
- `SECRET_KEY`
- `ALGORITHM`
- `ACCESS_TOKEN_EXPIRE_MINUTES`
- `REFRESH_TOKEN_EXPIRE_DAYS`
- `REDIS_URL`
- `CORS_ORIGINS`
- `GEMINI_API_KEY`
- `GEMINI_MODEL`
- `UPLOAD_DIR`
- `MAX_UPLOAD_SIZE_MB`
- `RAINFALL_YELLOW_THRESHOLD_MM`
- `RAINFALL_ORANGE_THRESHOLD_MM`
- `RAINFALL_RED_THRESHOLD_MM`
- `BLAST_YELLOW_THRESHOLD`
- `BLAST_ORANGE_THRESHOLD`
- `BLAST_REEVAL_THRESHOLD`
- `DGMS_PPV_LIMIT_MM_S`
- `CRACK_RISK_FLAG_THRESHOLD`
- `CRACK_RISK_CRITICAL_THRESHOLD`
- `WATER_REPORT_YELLOW_THRESHOLD`
- `ZONE_PROXIMITY_ALERT_METERS`
- `VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- `VAPID_CLAIMS_SUBJECT`
- `MODEL_ARTIFACTS_DIR`
- `CRACK_MODEL_PATH`
- `CRACK_MODEL_URL`
- `MODEL_CACHE_DIR`
- `MODEL_DOWNLOAD_TIMEOUT_SEC`

## 15. Uploads and Storage Behavior

- Backend creates upload folders if missing on startup.
- Static uploaded media is exposed under `/uploads` route.
- Report and crack-report submissions support multipart forms.

## 16. Scripts and Operations

### 16.1 Seed Script

`backend/scripts/seed_db.py`:
- Seeds zones, users, alerts, reports, crack reports, weather, and historical events from JSON files.
- Resets collections before seeding.
- Creates default admin credential pattern in seeded dataset.

### 16.2 Zone/Alert Append Script

`backend/scripts/append_zones.py`:
- Appends predefined zone and alert entries to seed data JSON files.

### 16.3 Rule Test Helper

`backend/test_rules.py`:
- Scripted smoke flow for login and basic weather/crack-report API interactions.

## 17. Container and Runtime

`backend/Dockerfile` behavior:
- Installs build tools (`gcc`, `g++`).
- Installs Python dependencies.
- Copies backend source.
- Starts server with `uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}`.

## 18. End-to-End Workflow Examples

### 18.1 Crack Report Escalation Flow

1. User submits crack report (image + metadata).
2. Backend scores image through crack AI service.
3. Critical/verified logic updates report state.
4. Alerts and notifications are generated for targeted users.
5. Rule engine re-evaluates zone risk profile.
6. Frontend receives updates via websocket/push.

### 18.2 Blast/Weather Driven Risk Update

1. Blast event or weather record is posted.
2. Rule engine recomputes features for impacted zone(s).
3. ML risk prediction runs; fallback formula used if model unavailable.
4. Zone risk fields are updated in database.
5. Escalation alert created if risk level increases.

## 19. Known Legacy/Compatibility Notes

- There are both `/api/blasts` and `/api/blast-events` APIs. They coexist.
- `ExplorationLog` keeps legacy fields for old historical records.
- Multiple model3 directory naming variants are supported for backward compatibility.
- `src/pages/Upload/index.jsx` is present but not currently routed.
- IoT Sensors route exists but is currently lighter than core operational modules.

## 20. Practical Summary

This project is a production-oriented mine safety platform with:
- Full React command-center frontend.
- FastAPI + Mongo backend with role-aware access.
- Real-time and push-based operational notifications.
- ML-assisted risk intelligence for zones, blasts, cracks, and rainfall.
- End-to-end workflows for incident intake, escalation, and response.
