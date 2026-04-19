# Rockefeller Mobile App Agent Prompt (Current Project - April 2026)

Use this exact prompt with your coding agent.

## Prompt

You are a senior Flutter engineer. Build a production-ready Flutter mobile app for the existing Rockefeller (MineSafe AI) platform.

Important context:
- The web platform already exists (React + FastAPI + MongoDB + ML services).
- The Flutter app must integrate with the same backend and business logic.
- Do not build a mock/demo app. Use real APIs, auth, roles, and realtime flows.
- Keep architecture scalable and clean for long-term maintenance.

## Product Goal

Deliver a role-aware mobile operations app for mine safety with these core pillars:
- Zone risk monitoring
- Alerts and escalation
- Blast and exploration workflows
- Field report and crack report workflows
- Prediction and analytics visibility
- Realtime notifications and emergency broadcast

## Backend Source of Truth

Use backend API as single source of truth.

Base URLs:
- Local: http://localhost:8000
- Production: https://rockefeller-production.up.railway.app

Health check:
- GET /api/health

## Required Flutter Stack

- Flutter 3.22+
- Dart 3+
- dio (HTTP)
- flutter_secure_storage (JWT)
- riverpod (preferred) or bloc
- go_router
- websocket_channel
- freezed + json_serializable (typed models)
- firebase_messaging or flutter_local_notifications (local/push UX layer)

## Authentication and Session

Implement:
- POST /api/auth/login
- GET /api/auth/me

Rules:
- Store JWT in secure storage only.
- Inject Authorization: Bearer <token> on protected APIs.
- On 401/403: clear session and return to login.
- Restore session on app start.

## Roles and Access

Support these roles:
- admin
- safety_officer
- field_worker

Behavior rules:
- field_worker: read-only alerts view, no resolve actions.
- safety_officer: acknowledge alerts + emergency controls.
- admin: acknowledge + resolve + full admin controls.

## Feature Scope (Must Work)

Build these functional modules in Flutter:

1. Dashboard
- KPI summary
- risk overview
- recent alerts
- quick operational status

2. Map and Zones
- zone list/map visualization
- zone details
- risk level and forecast context

3. Alerts
- list active/acknowledged/resolved alerts
- acknowledge/resolve flows by role permissions

4. Reports
- field reports list/detail
- create field report with multipart upload
- AI draft generation via POST /api/reports/generate-ai-draft

5. Crack Reports
- crack reports list/detail
- submit crack report (submission_mode=ai or admin)
- verify/review actions for allowed roles

6. Blasts
- create blast event
- list recent blast telemetry
- show anomaly status returned by backend

7. Explorations
- create exploration logs
- list exploration history

8. Predictions and Analytics
- show prediction summary and zone-level prediction views
- show analytics pages with backend-fed data

9. Profile
- user profile and relevant preferences

10. Admin (role-restricted)
- admin operational actions that already exist in backend contract

## Notification System (Critical Requirement)

Implement notifications end-to-end so it works when admin sends blast-related alerts.

1. In-app notification center
- GET /api/notifications
- PATCH /api/notifications/{id}/read
- PATCH /api/notifications/read-all

2. Realtime websocket
- Connect: /ws/{user_id}?token=<jwt>
- Auto reconnect with exponential backoff.
- On reconnect, re-fetch latest notifications.

3. Event handling
- notification event: add to notification list, increment unread count, show in-app banner.
- emergency_broadcast event: show high-priority full-screen alert dialog.

4. Admin blast alert behavior (must work)
- When admin submits blast data (POST /api/blasts), app must handle resulting alert/anomaly updates.
- If backend raises warning/critical anomaly, all relevant users should receive realtime notification updates in app.
- Admin must also be able to send emergency broadcast (POST /api/emergency/broadcast).
- Broadcast must appear to recipients immediately via websocket and in notification center.

5. Push integration
- GET /api/push/vapid-public-key
- POST /api/push/subscribe
- Register device subscription once per user session lifecycle.

## API Coverage (Minimum)

Implement typed API clients for:
- /api/auth/*
- /api/zones, /api/zones/{id}, /api/zones/{id}/forecast, /api/risk-levels
- /api/alerts and alert actions
- /api/reports and AI draft endpoint
- /api/crack-reports and review actions
- /api/blasts
- /api/explorations
- /api/predictions/summary, /api/predictions/zones, /api/predictions/zones/{zone_id}
- /api/notifications
- /api/push/*
- /api/emergency/broadcast
- /api/presence/* (if exposed in current backend)
- /api/history (if exposed in current backend)

## App Architecture Requirements

Use a clean feature-first structure:

lib/
- core/ (network, auth, storage, error handling)
- features/
  - auth/
  - dashboard/
  - map_zones/
  - alerts/
  - reports/
  - crack_reports/
  - blasts/
  - explorations/
  - predictions/
  - notifications/
  - profile/
  - admin/
- shared/ (widgets, theme, utils)
- app_router.dart
- main.dart

Engineering rules:
- Strict typed models for request/response.
- Centralized API error mapping from backend detail field.
- Retry for transient network failures.
- Offline-safe UI states (empty/loading/error).
- Role guards on routes and actions.
- No hardcoded business data in UI.

## UX and Reliability Requirements

- Fast launch and smooth navigation.
- Responsive for both phone and tablet.
- Clear severity colors for risk and alerts.
- Accessible text sizes and tap targets.
- Handle partial API failures without crashing whole screen.

## Definition of Done

The Flutter app is done only when all of the following are true:
- Login/session restore works.
- All listed modules are functional against real backend APIs.
- Admin blast alert and emergency broadcast notification flow works end-to-end.
- Realtime notifications update without manual refresh.
- Role-based permissions are enforced in UI behavior.
- App has stable error handling and loading states.

## Delivery Output Expected From Agent

1. Flutter project structure and dependencies.
2. Implemented screens and navigation.
3. API service layer with typed DTOs/models.
4. Auth and secure session handling.
5. Realtime notification + push wiring.
6. Short setup/run notes and any env vars needed.
