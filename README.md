# Rockefeller Mine Safety Platform

Rockefeller is an end-to-end mine safety operations platform that combines geospatial monitoring, field incident reporting, realtime alerts, weather-aware forecasting, and ML-assisted risk intelligence.

The system is designed for daily command center use across three operational roles:
- Admin
- Safety Officer
- Field Worker

## Why This Project Matters

Mining incidents are rarely caused by one signal. Rockefeller brings multiple signals into one workflow:
- Zone risk and terrain context
- Crack and field reports from workers
- Blast event compliance and anomaly checks
- Rainfall trends and forecast-based risk elevation
- Notification fan-out to the right people in real time

## What Is Included

### Core Safety Operations
- Role-based authentication and protected route access
- Zone map with risk-based styling and drill-down
- Alerts lifecycle management: active, acknowledged, resolved
- Crack report submission, verification, and rejection workflows
- General field reports with media and metadata
- Full report detail view at reports/:id

### Realtime and Response
- Per-user WebSocket channel for instant in-app updates
- Browser push notifications using VAPID subscriptions
- Emergency broadcast flow for one-click zone escalation
- Worker presence check-in and check-out with live headcount

### Intelligence and Forecasting
- ML-assisted zone risk prediction
- Blast event logger with PPV monitoring and re-evaluation trigger
- District rainfall forecast integration
- Zone-level rainfall risk flags for proactive attention
- Historical landslide replay controls on map view
- Zone comparison tool for side-by-side analytics decisions

### Monitoring and Admin Tools
- IoT Sensor Dashboard page with live telemetry presentation
- Admin panel for pending crack report decisions
- Notification center with unread counts and read controls

## Tech Stack

### Frontend
- React 18 + Vite
- Material UI
- React Router
- Recharts
- React Leaflet
- Axios
- Framer Motion

### Backend
- FastAPI
- Beanie ODM
- MongoDB
- JWT authentication
- WebSocket event delivery
- Web Push (pywebpush)
- ML integration (XGBoost, Prophet, scikit-learn)

## Architecture Summary

- Frontend handles secure UX, route protection, data visualization, and realtime UI updates.
- Backend is source of truth for auth, role enforcement, incident state transitions, and notification fan-out.
- WebSocket and push channels complement API polling for low-latency incident communication.

## Repository Structure

- src/: frontend app
- backend/app/: API, models, services, and realtime logic
- backend/scripts/: seed and utility scripts
- dataset/: model files and data assets
- uploads/: report and crack-report media storage

## Prerequisites

- Node.js 18 or newer
- Python 3.10 or newer
- MongoDB running locally or remotely

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
.\env\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Default API URL: http://localhost:8000

## Important API Surface

### Authentication
- POST /api/auth/login
- GET /api/auth/me

### Incidents and Operations
- GET /api/alerts
- PATCH /api/alerts/{id}/acknowledge
- PATCH /api/alerts/{id}/resolve
- POST /api/crack-reports
- PATCH /api/crack-reports/{id}/verify
- PATCH /api/crack-reports/{id}/reject
- POST /api/blast-events
- POST /api/emergency/broadcast
- PATCH /api/presence/me/check-in
- PATCH /api/presence/me/check-out
- GET /api/presence/headcount

### Reports and Intelligence
- GET /api/reports
- GET /api/reports/{report_id}
- GET /api/zones/{zone_id}/forecast
- GET /api/rainfall/forecast/{district}
- GET /api/rainfall/zone-risk-flags
- GET /api/history

### Notifications
- GET /api/notifications
- PATCH /api/notifications/{id}/read
- PATCH /api/notifications/read-all
- GET /api/push/vapid-public-key
- POST /api/push/subscribe
- WebSocket: /ws/{user_id}?token=<jwt>

## Environment Notes

Backend .env should include:
- MONGODB_URL
- DATABASE_NAME
- SECRET_KEY
- ALGORITHM
- VAPID_PUBLIC_KEY
- VAPID_PRIVATE_KEY
- VAPID_CLAIMS_SUBJECT

## Operational Flow Example

1. Worker submits crack report.
2. Admin verifies report.
3. Backend creates alert and notifications.
4. Assigned workers receive realtime update via WebSocket.
5. Push notifications are sent to subscribed devices.
6. Zone details, analytics, and map replay reflect latest incident context.

## Troubleshooting

- If login fails, confirm backend is running at port 8000 and token is valid.
- If map or analytics look empty, verify MongoDB and seed data.
- If no push notifications arrive, confirm browser permission and VAPID keys.
- If forecast calls fail, verify dataset files and model loading on startup.

## License

Private internal project for operational and educational use.
