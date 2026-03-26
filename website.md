# Rockefeller Website Documentation

## 1. Overview

Rockefeller is a production-style mine safety website that unifies monitoring, reporting, forecasting, and emergency response into one authenticated interface.

Primary outcomes:
- Faster incident visibility
- Better decision support for escalation
- Clear command flow from field report to response

Supported roles:
- Admin
- Safety Officer
- Field Worker

## 2. Frontend System Design

### 2.1 Application Shell
- Protected routing and session restoration
- Sidebar navigation with role-aware sections
- Header breadcrumbs and notification entry point

### 2.2 Data Layer
- Axios-based API modules under src/api
- Central auth context for user and token state
- Notification context for inbox, unread count, and realtime events

### 2.3 Realtime Layer
- WebSocket connection per authenticated user
- Automatic reconnect behavior after disconnect
- Instant in-app notification insertion and unread badge updates

### 2.4 Push Layer
- Service worker registration
- VAPID key retrieval and subscription upload
- Out-of-tab notification support on compatible browsers

## 3. Backend System Design

### 3.1 API and Domain Logic
- FastAPI route modules for auth, zones, alerts, reports, crack reports, blast events, weather, rainfall, history, notifications, push, emergency, and presence
- Role-aware endpoint protection
- Transaction-style workflow for verify and reject actions

### 3.2 Persistence
- MongoDB collections managed through Beanie models
- Linked zone, report, alert, and notification records
- Push subscription storage per user

### 3.3 Startup Tasks
- Collector jobs for latest external data fetch
- ML model preload where available
- Daily risk forecast generation

## 4. Major Website Features

### 4.1 Dashboard
- Risk KPIs, current zone state, and trend blocks
- Entry points to operational modules

### 4.2 Map View
- Zone visualization with risk-based styling
- Historical landslide replay controls
- Seasonal summary support for selected period

### 4.3 Alerts
- Active and processed incident visibility
- Acknowledge and resolve actions by authorized users

### 4.4 Crack Reports
- Field worker incident capture
- Admin/officer verification and rejection actions
- Backend alert and notification fan-out after verification

### 4.5 Reports
- Field report listing and detail viewing
- Dedicated full report detail route for contextual incident review

### 4.6 Zone Details
- Deep per-zone operational panel
- Weather forecast view with rain trends
- Zone-level rainfall risk flags
- Forecast-backed risk interpretation support

### 4.7 Analytics
- Cross-zone charts and operational trends
- Zone comparison tool for side-by-side decision support

### 4.8 IoT Sensor Dashboard
- Sensor stream style presentation for operational telemetry
- Alerting cues for threshold-style conditions

### 4.9 Emergency Broadcast
- One-click targeted emergency broadcast
- Worker-facing fullscreen warning support via event stream

### 4.10 Worker Presence
- Worker check-in and check-out endpoints
- Live zone headcount visibility for emergency response context

## 5. Notification and Escalation Workflow

1. Incident enters system (report, crack verification, blast anomaly, or admin action).
2. Backend writes alert and notification records.
3. WebSocket broadcasts events to connected recipients.
4. Push notifications are sent to subscribed clients.
5. Users act from alert pages, map context, and report details.

## 6. Security Model

- JWT required for protected APIs and websocket entry
- Role-based restrictions for sensitive operations
- Push private key remains backend-only
- User channel isolation enforced for websocket events

## 7. Key Reliability Behaviors

- WebSocket auto-reconnect strategy
- Graceful operation when push permission is denied
- Non-blocking fallback UI for API failures
- Invalid push subscriptions can be rotated or removed by backend logic

## 8. API Consumption Contract

Base URL:
- http://localhost:8000

Frontend expectations:
- Send bearer token for protected routes
- Handle 401 by redirecting to login
- Handle empty and error states without crashing page flow

## 9. Environment Requirements

Backend .env values:
- MONGODB_URL
- DATABASE_NAME
- SECRET_KEY
- ALGORITHM
- VAPID_PUBLIC_KEY
- VAPID_PRIVATE_KEY
- VAPID_CLAIMS_SUBJECT

## 10. End-to-End Value

Rockefeller website now supports a full safety lifecycle:
- Capture incidents in the field
- Verify and escalate centrally
- Notify correct users in realtime
- Forecast and compare risk across zones
- Replay historical patterns for better planning
- Execute emergency communication with current worker presence awareness
