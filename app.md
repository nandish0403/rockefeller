# Rockefeller App Build Blueprint

## Build Directive

Use this document as implementation guidance for ongoing app development.
Operational flows must use real backend APIs, authenticated requests, and existing project patterns.

## Product Mission

Rockefeller enables mine operations teams to detect risk early, coordinate responses quickly, and maintain traceable decision history.

Core pillars:
- Monitoring
- Incident capture
- Escalation and communication
- Forecast-aware planning
- Historical pattern analysis

## Required Stack

### Frontend
- React + Vite
- Material UI
- React Router
- Recharts
- React Leaflet
- Axios

### Backend
- FastAPI
- Beanie + MongoDB
- JWT auth
- WebSocket realtime channel
- Web Push with VAPID
- ML-enabled forecasting and risk components

## Source-of-Truth Rule

Use backend data as the default source for all operational views.
Do not rely on mock data for production behavior when an API exists.

API base URL:
- http://localhost:8000

## Mandatory User Flows

### 1. Auth and Session
- Login via API
- Persist token safely in frontend state strategy
- Rehydrate user state on app startup
- Protect routes by role and auth status

### 2. Crack Report Lifecycle
- Worker submits crack report (optionally with photo)
- Admin or officer verifies or rejects
- Verify action must trigger alert and notification fan-out
- Reject action must inform submitter

### 3. Alerts Lifecycle
- Show alerts with status and severity
- Support acknowledge and resolve transitions where permitted
- Reflect latest state without stale UI

### 4. Notification Experience
- Header bell with unread badge
- Drawer list with read and unread visual state
- Mark single and mark all actions
- Realtime insertion on websocket events
- Optional toast for immediate awareness

### 5. Realtime and Push
- WebSocket connect per user with token
- Auto reconnect on disconnect
- Push subscription registration through backend VAPID key
- Graceful fallback when push permission is denied

### 6. Blast and Compliance
- Blast event logging from field workflows
- Include PPV and context fields
- Trigger risk re-evaluation when thresholds are exceeded

### 7. Emergency Response
- Admin emergency broadcast endpoint usage
- Worker-facing high-visibility alert presentation
- Integrate with current worker presence when available

### 8. Worker Presence
- Check-in and check-out operations
- Headcount visibility for admin decisions
- Accurate inside or outside state transitions

### 9. Forecast and Risk Intelligence
- Zone forecast integration using backend endpoints
- Rainfall forecast blocks with short horizon view
- Zone risk flags based on rainfall plus terrain cues

### 10. Analytics and Strategy
- Zone comparison tool for side-by-side metrics
- Trend charts for incidents and risk evolution

### 11. Historical Replay
- Historical landslide retrieval
- Replay controls by year and timeline selection
- Map highlight behavior tied to replay data

### 12. Reports Detail Continuity
- Reports list must navigate to dedicated detail route
- Detail page should surface report metadata, remarks, and contextual zone data

## Required Frontend Areas

- Dashboard
- Map View
- Zone Details
- Alerts
- Crack Reports
- Reports
- Report Details
- Analytics
- IoT Sensors
- Field Report
- Profile
- Admin

## API Coverage Reference

### Auth
- POST /api/auth/login
- GET /api/auth/me

### Zones and Forecast
- GET /api/zones
- GET /api/zones/{id}
- GET /api/zones/{zone_id}/forecast
- GET /api/rainfall/forecast/{district}
- GET /api/rainfall/zone-risk-flags

### Incidents
- GET /api/alerts
- PATCH /api/alerts/{id}/acknowledge
- PATCH /api/alerts/{id}/resolve
- GET /api/crack-reports
- POST /api/crack-reports
- PATCH /api/crack-reports/{id}/verify
- PATCH /api/crack-reports/{id}/reject
- POST /api/blast-events

### Reports
- GET /api/reports
- GET /api/reports/{report_id}
- POST /api/reports

### Emergency and Presence
- POST /api/emergency/broadcast
- PATCH /api/presence/me/check-in
- PATCH /api/presence/me/check-out
- GET /api/presence/headcount

### Notifications and Push
- GET /api/notifications
- PATCH /api/notifications/{id}/read
- PATCH /api/notifications/read-all
- GET /api/push/vapid-public-key
- POST /api/push/subscribe
- WebSocket /ws/{user_id}?token=<jwt>

### History
- GET /api/history

## Coding and UX Rules

- Reuse existing API clients in src/api
- Preserve current route and layout architecture
- Implement loading, empty, and error states for all async screens
- Keep role-restricted actions hidden or disabled when unauthorized
- Keep user feedback explicit for all mutation actions

## Security and Reliability Rules

- Require auth for protected operations
- Enforce role checks server side, never frontend only
- Never expose private push credentials in client code
- Recover from websocket interruptions automatically
- Keep UI functional even during partial backend outages

## Environment Configuration

Backend .env should define:
- MONGODB_URL
- DATABASE_NAME
- SECRET_KEY
- ALGORITHM
- VAPID_PUBLIC_KEY
- VAPID_PRIVATE_KEY
- VAPID_CLAIMS_SUBJECT

## Acceptance Checklist

- Worker can submit crack report
- Admin or officer can verify or reject
- Verification creates alert and recipient notifications
- Realtime updates appear without full page refresh
- Push notifications work for subscribed clients
- Emergency broadcast reaches intended workers
- Presence check-in affects headcount outputs
- Zone details show forecast-backed context
- Analytics provides comparison workflow
- Map supports historical replay
- Reports list opens functional full report detail page
