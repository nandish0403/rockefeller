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
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_CLAIMS_SUBJECT=mailto:admin@rockefeller.local
```

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

### Alerts
| Method | Path | Description |
|--------|------|-------------|
| GET    | /api/alerts | Active / historical alerts |
| POST   | /api/alerts | Create manual alert (officer) |
| PATCH  | /api/alerts/{id}/acknowledge | Acknowledge |
| PATCH  | /api/alerts/{id}/resolve | Resolve |

### Reports and Images
| Method | Path | Description |
|--------|------|-------------|
| GET    | /api/reports | Field reports |
| POST   | /api/reports | Upload field report with photo |
| GET    | /api/reports/{id} | Report detail |
| GET    | /api/crack-reports | Crack reports |
| POST   | /api/crack-reports | Submit crack report with photo |
| PATCH  | /api/crack-reports/{id}/verify | Verify (admin) |
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
- **Forecast errors** — verify `dataset/model 3 district models/` pickle files are present.

---

## Future Improvements

- Real-time sensor integration (IoT accelerometers, piezometers)
- Drone monitoring and satellite imagery analysis
- Mobile application for field workers
- Live rainfall simulation overlay

---

## License

Private internal project for operational and educational use.
