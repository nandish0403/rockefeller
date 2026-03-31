# MineSafe AI — Rockefeller Mine Safety Platform

AI-powered landslide and rockfall prediction platform for open-pit mines in Maharashtra, India.

The platform helps miners and engineers identify high-risk zones using geospatial data, weather conditions, geological information, and machine learning.

The system is designed for daily command center use across three operational roles:
- Admin
- Safety Officer
- Field Worker

---

## Features

### 3D Mine Visualisation
Interactive mine map showing safe and dangerous zones coloured by risk level (green / yellow / orange / red).

### UI Styling
The interface uses Inter typography with a dark-first monitoring visual style.

Dashboard layout note:
- The Dashboard page follows the provided Rockefeller Sentinel HTML layout closely (same box structure and section ordering).
- Sidebar navigation structure is unchanged.
- Sidebar navigation is now independently scrollable so Profile and Logout remain accessible when many menu items are present.
- The existing interactive mine map implementation is preserved and reused inside the redesigned map panel.
- The in-page dashboard title strip was removed to keep the content canvas clean.
- Risk Distribution, 7-Day Risk Trend, and Rainfall Snapshot cards are forced to equal heights for consistent rectangles.
- Subtle staggered entrance animations were added to improve visual polish without changing functionality.

Operations pages layout note:
- Blasts was redesigned to a split command layout (left: new blast entry, right: recent blast telemetry table) inspired by the provided HTML while preserving create/list API behavior.
- Explorations was redesigned to a split geology-log layout (left: exploration form with water controls, right: recent logs and saturation analysis) while preserving create/list API behavior.
- Admin was redesigned as a control-center layout with KPI tiles, users management grid, quick actions, security heatmap, 7-day alert volumes, and a recent activity log.
- Motion polish was added across these pages using subtle fade/rise/pulse animations without changing operational workflows.
- Admin visual colors are aligned with the same warm dark palette used across Dashboard, Blasts, and Explorations (no standalone blue/cyan theme).
- The `/admin` route uses the existing shared app shell again (original sidebar and header preserved).
- Admin page content keeps the control-center sections, and page actions/buttons are wired to clickable interactions.

### Risk Prediction
Predicts landslide probability using a weighted-sum formula and an ML model (XGBoost) trained on terrain, rainfall, soil type, blast activity, and historical events.

```
Risk = 0.40 × rainfall  +  0.20 × slope  +  0.15 × soil_factor
     + 0.15 × blast_activity  +  0.10 × historical_landslides

0 – 0.3  →  Green  (safe)
0.3 – 0.6  →  Yellow  (moderate)
0.6 – 1.0  →  Red  (high risk)
```

### Worker Reporting
Workers can upload photos of cracks, water seepage, or unstable rock formations.
Reporting is handled through Crack Reports and Field Report workflows; the dedicated `/upload` page is no longer used.

### Real-Time Alerts
Alerts users about high-risk zones, heavy rainfall, and blast anomalies via in-app WebSocket and browser push notifications.

### Blast Monitoring
Logs mining blasts, checks DGMS PPV compliance, detects anomalies, and re-evaluates zone risk automatically.

### District Rainfall Forecast
Prophet-based per-district rainfall forecasts drive proactive zone risk flags.

---

## Tech Stack

### Frontend
- React 18 + Vite
- Material UI
- Deck.gl v9 + react-map-gl + MapLibre GL (2D/3D map rendering)
- React Leaflet (interactive zone map)
- Recharts
- Framer Motion
- Axios

### Backend
- FastAPI
- Beanie ODM + MongoDB
- JWT authentication
- WebSocket event delivery
- Web Push (pywebpush / VAPID)

Backend data model notes:
- Prediction/history-heavy collections use Mongo indexes (`risk_predictions`, `blast_events`, `zones`) for faster summary/list reads while preserving full historical records.

### Machine Learning
- Python · scikit-learn · XGBoost (zone risk model)
- Prophet (district rainfall forecast)
- CNN / Keras (crack image classifier)
- Isolation Forest (blast anomaly detection)

---

## Architecture

```
React (Vite)  →  FastAPI  →  MongoDB
                    │
          ┌─────────┼──────────┐
          │         │          │
     ML models   Weather    WebSocket / Push
   (XGBoost,    (IMD/NDMA    notifications
    Prophet,     collector)
    CNN, IForest)
```

---

## Repository Structure

```
src/          frontend app (React)
backend/app/  API routes, models, services, realtime logic
backend/scripts/  seed and utility scripts
dataset/      model pickle files and training data
uploads/      report and crack-report media storage
```

---

## Model Artifacts

`model1_best_phase2.keras` is the crack classifier model.  
It is intentionally gitignored. Place it at either:
- `backend/dataset/model1_best_phase2.keras`
- `dataset/model1_best_phase2.keras`

You can also keep model files completely outside the repository by setting environment variables:
- `MODEL_ARTIFACTS_DIR` : directory containing `model1_best_phase2.keras`, `model2_model.pkl`, `model2_scaler.pkl`, `model2_encoder.pkl`, and `model4_blast_anomaly.pkl`
- `CRACK_MODEL_PATH` : optional full file path override for crack model only
- `CRACK_MODEL_URL` : optional URL for auto-download fallback in deployment
- `MODEL_CACHE_DIR` : local cache directory used when downloading from `CRACK_MODEL_URL`
- `MODEL_DOWNLOAD_TIMEOUT_SEC` : download timeout in seconds

Resolution order for crack model loading:
1. `CRACK_MODEL_PATH` (if set)
2. `<MODEL_ARTIFACTS_DIR>/model1_best_phase2.keras` (if `MODEL_ARTIFACTS_DIR` set)
3. `backend/dataset/model1_best_phase2.keras`
4. `dataset/model1_best_phase2.keras`
5. Download from `CRACK_MODEL_URL` into `MODEL_CACHE_DIR`

Git safety:
- Only the crack classifier artifact (`model1_best_phase2.keras`) is ignored by default because of its large size.
- If any model files were already tracked previously, remove them from git index once with:
     `git rm --cached <path-to-model-file>`

District rainfall forecast pickles (model3) are resolved from the first existing folder among:
- `dataset/model3_district_models`
- `dataset/model 3 district models`
- `dataset/model 3 distict models`

---

## Prerequisites

- Node.js 18 or newer
- Python 3.10 or newer
- MongoDB running locally or remotely

---

## Quick Start

### 1) Frontend

```bash
npm install
npm run dev
```

Default dev URL: http://localhost:5173

### 2) Backend

```bash
cd backend
python -m venv env
source env/bin/activate          # Windows: .\env\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Default API URL: http://localhost:8000

### 3) Seed database (optional)

```bash
cd backend
python scripts/seed_db.py
```

---

## Environment Variables

Create `backend/.env`:

```
MONGODB_URL=mongodb://localhost:27017
DATABASE_NAME=rockefeller
SECRET_KEY=changeme
ALGORITHM=HS256
CORS_ORIGINS=http://localhost:5173,https://rockefeller-production.up.railway.app
GEMINI_API_KEY=
GEMINI_MODEL=gemini-3.1-pro-preview
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_CLAIMS_SUBJECT=mailto:admin@rockefeller.local
MODEL_ARTIFACTS_DIR=
CRACK_MODEL_PATH=
CRACK_MODEL_URL=
MODEL_CACHE_DIR=runtime_models
MODEL_DOWNLOAD_TIMEOUT_SEC=30
```

Create root `.env` for deployed frontend API base URL:

```env
VITE_API_URL=https://rockefeller-production.up.railway.app
VITE_MAPTILER_KEY=your_maptiler_key
```

Create root `.env.local` for local frontend development:

```env
VITE_API_URL=http://localhost:8000
VITE_MAPTILER_KEY=your_maptiler_key
```

Frontend API calls read this through `src/config/api.js`.
Map view satellite + 3D terrain tiles read `VITE_MAPTILER_KEY`.

---

## API Reference

### Authentication
| Method | Path | Description |
|--------|------|-------------|
| POST | /api/auth/login | Obtain JWT |
| GET  | /api/auth/me   | Current user |

### Zones and Risk
| Method | Path | Description |
|--------|------|-------------|
| GET    | /api/zones | List all zones (filterable by district, risk_level, status) |
| GET    | /api/zones/{id} | Zone detail |
| GET    | /api/zones/{id}/forecast | Tomorrow's predicted risk |
| PATCH  | /api/zones/{id} | Update zone (officer / admin) |
| GET    | /api/risk-levels | Fleet-wide risk level summary + per-zone breakdown |

### Predictions
| Method | Path | Description |
|--------|------|-------------|
| GET    | /api/predictions/summary | Fleet summary: risk distribution, average hazard score, model availability |
| GET    | /api/predictions/zones | Zone-wise prediction rows with hazard score, rainfall 7-day forecast, blast anomaly, factor breakdown (optimized for dashboard loading) |
| GET    | /api/predictions/zones/{zone_id} | Detailed prediction snapshot for one zone |

Prediction data wiring notes:
- `predict_zone_risk` resolves `blast_count_7d` and `avg_blast_intensity` from live `BlastEvent` data (last 7 days for the zone) when `zone_id` is provided.
- Model thresholds and artifact files remain unchanged.

### Field Data Entry
| Method | Path | Description |
|--------|------|-------------|
| POST   | /api/blasts | Submit blast event, run Model 4 anomaly detection, persist anomaly result, and auto-raise alert on warning/critical anomaly |
| GET    | /api/blasts | List blast events with `zone_id`, `district`, `date_from`, `date_to`, `anomaly_only`, `limit` filters |
| GET    | /api/blasts/{id} | Blast event detail with anomaly breakdown |
| POST   | /api/explorations | Submit exploration log, update zone saturation index (when water encountered), and trigger zone-only re-forecast in background |
| GET    | /api/explorations | List exploration logs with `zone_id`, `district`, `date_from`, `date_to`, `water_only`, `limit` filters |
| GET    | /api/explorations/{id} | Exploration log detail |

Exploration log compatibility notes:
- The exploration model keeps legacy fields alongside the new operational fields so existing historical documents remain readable after the schema update.

### Alerts
| Method | Path | Description |
|--------|------|-------------|
| GET    | /api/alerts | Active / historical alerts |
| POST   | /api/alerts | Create manual alert (officer) |
| PATCH  | /api/alerts/{id}/acknowledge | Acknowledge |
| PATCH  | /api/alerts/{id}/resolve | Resolve (admin only) |

Frontend role behavior for alerts:
- Field worker: read-only alerts view (no acknowledge/resolve/emergency controls)
- Safety officer: acknowledge + emergency controls
- Admin: acknowledge + resolve + emergency controls

### Reports and Images
| Method | Path | Description |
|--------|------|-------------|
| GET    | /api/reports | Field reports |
| POST   | /api/reports | Upload field report with photo |
| POST   | /api/reports/generate-ai-draft | Generate AI draft text for field report form |
| GET    | /api/reports/{id} | Report detail |
| GET    | /api/crack-reports | Crack reports |
| POST   | /api/crack-reports | Submit crack report with `submission_mode=ai` or `submission_mode=admin` |
| PATCH  | /api/crack-reports/{id}/verify | Verify (admin) |
| PATCH  | /api/crack-reports/{id}/notify-critical | Send critical crack notification to assigned workers |
| PATCH  | /api/crack-reports/{id}/reject | Reject (admin) |

### Blast Events
| Method | Path | Description |
|--------|------|-------------|
| GET    | /api/blast-events | Blast log |
| POST   | /api/blast-events | Log a blast (triggers PPV check + anomaly detection) |

### Weather
| Method | Path | Description |
|--------|------|-------------|
| GET    | /api/weather | Weather records |
| POST   | /api/weather | Ingest weather reading (triggers risk update) |
| GET    | /api/rainfall/forecast/{district} | District rainfall forecast |
| GET    | /api/rainfall/zone-risk-flags | Zones flagged by forecast rainfall |

### Presence and Emergency
| Method | Path | Description |
|--------|------|-------------|
| PATCH  | /api/presence/me/check-in | Worker check-in |
| PATCH  | /api/presence/me/check-out | Worker check-out |
| GET    | /api/presence/headcount | Live headcount |
| POST   | /api/emergency/broadcast | One-click zone escalation |

### Notifications
| Method | Path | Description |
|--------|------|-------------|
| GET    | /api/notifications | In-app notifications |
| PATCH  | /api/notifications/{id}/read | Mark read |
| PATCH  | /api/notifications/read-all | Mark all read |
| POST   | /api/push/subscribe | Register push subscription |
| WS     | /ws/{user_id}?token=\<jwt\> | Realtime event stream |

---

## Operational Flow

1. Worker submits crack report with photo.
2. Crack AI classifier scores the image.
3. Admin verifies the report.
4. Backend creates alert and notifies assigned workers via WebSocket and push.
5. Rule engine re-evaluates zone risk (ML model → simple formula fallback).
6. Zone map, analytics, and history reflect the latest risk context.

---

## Troubleshooting

- **Login fails** — confirm backend is running on port 8000 and `SECRET_KEY` matches.
- **Map is empty** — run `seed_db.py` and verify MongoDB connection.
- **No push notifications** — check browser permission and VAPID key configuration.
- **Forecast errors** — verify your district model `.pkl` files exist in one of the supported model3 folders listed in Model Artifacts.

---

## Future Improvements

- Real-time sensor integration (IoT accelerometers, piezometers)
- Drone monitoring and satellite imagery analysis
- Mobile application for field workers
- Live rainfall simulation overlay

---

## License

Private internal project for operational and educational use.
