# Rockefeller Sentinel Mobile

Mobile operations app for mine safety monitoring and incident response.

This Flutter app is the mobile client for Rockefeller MineSafe AI and integrates with the production backend for authentication, alerts, zones, reports, crack workflows, blast workflows, predictions, and realtime notifications.

## Table of Contents

- Overview
- Key Features
- Tech Stack
- Architecture
- Role Access Model
- API Integration
- Project Structure
- Prerequisites
- Quick Start
- Configuration
- Quality Checks
- Build Commands
- Troubleshooting
- Contribution Guide
- License

## Overview

Rockefeller Sentinel gives field and safety teams a tactical mobile interface to:

- Monitor risk zones on a live map
- Track and manage alerts by severity and status
- Submit and review operational reports
- Manage crack report lifecycle
- Record blast and exploration activity
- Receive realtime notifications and emergency broadcasts

## Key Features

- Secure auth flow with session restore
	- Login via backend auth endpoint
	- JWT token persisted in secure storage
	- Auto-redirect on unauthorized responses
- Command-center alerts UI
	- Search and filter alerts
	- Active, acknowledged, resolved tabs
	- Rich alert cards with severity, district, source, and action context
	- Role-aware action controls (acknowledge/resolve)
- Live map and zones
	- MapTiler dark map tiles with fallback to OpenStreetMap
	- Backend-driven zone overlays and markers
	- Auto-fit to available zone coordinates
- Realtime notifications
	- WebSocket connection per authenticated user
	- Event normalization for backend variants
	- Polling safety net to keep notification center fresh
- Feature modules
	- Dashboard
	- Map and Zones
	- Alerts
	- Reports
	- Crack Reports
	- Blasts
	- Explorations
	- Predictions
	- Notifications
	- Profile
	- Admin

## Tech Stack

- Framework: Flutter (Dart)
- State management: Riverpod
- Navigation: go_router
- Networking: Dio
- Realtime: web_socket_channel
- Storage: flutter_secure_storage
- Mapping: flutter_map + latlong2
- Logging: logger
- Serialization/codegen: freezed + json_serializable

## Architecture

The app follows a feature-first structure with shared core services:

- `lib/core`
	- Network client and interceptors
	- Providers and app state
	- Models
	- Theme and design system
	- Storage and error mapping
- `lib/features`
	- Screen-level modules by domain
- `lib/shared`
	- Reusable widgets and shell layout
- `lib/app_router.dart`
	- Route graph and auth redirects

Routing behavior:

- App starts at splash
- Session restore checks secure token and `/api/auth/me`
- Unauthenticated users are redirected to login
- Authenticated users are routed to dashboard shell

## Role Access Model

- `admin`
	- Full control (acknowledge, resolve, broadcast, admin actions)
- `safety_officer`
	- Can acknowledge operational alerts
- `field_worker`
	- Read-only for restricted operational actions

UI behavior is role-aware and enforces action visibility based on current role.

## API Integration

Default production base URL:

- `https://rockefeller-production.up.railway.app`

Primary API groups used by the app:

- `/api/auth/*`
- `/api/zones*`
- `/api/alerts*`
- `/api/reports*`
- `/api/crack-reports*`
- `/api/blasts*`
- `/api/explorations*`
- `/api/predictions*`
- `/api/notifications*`

Realtime channel:

- `wss://rockefeller-production.up.railway.app/ws/{user_id}?token={jwt}`

## Project Structure

```text
lib/
	core/
		error/
		models/
		network/
		providers/
		storage/
		theme/
	features/
		admin/
		alerts/
		auth/
		blasts/
		crack_reports/
		dashboard/
		explorations/
		map_zones/
		notifications/
		predictions/
		profile/
		reports/
	shared/
	app_router.dart
	main.dart
```

## Prerequisites

- Flutter SDK compatible with Dart `>=3.5.0 <4.0.0`
- Android Studio (recommended) with Android SDK installed
- JDK (project currently uses Android Studio JBR path in Gradle properties)
- A running emulator or physical Android device

## Quick Start

1. Install dependencies:

```bash
flutter pub get
```

2. Run app:

```bash
flutter run
```

3. Optional: override MapTiler key at runtime:

```bash
flutter run --dart-define=MAPTILER_API_KEY=YOUR_MAPTILER_KEY
```

## Configuration

### Map tiles

- Runtime define: `MAPTILER_API_KEY`
- If not provided, app uses default key currently set in map screen.

### API base URL

Configured in:

- `lib/core/network/api_client.dart` (`_baseUrl`)

### WebSocket base URL

Configured in:

- `lib/core/network/websocket_service.dart` (`_wsBaseUrl`)

### Android Gradle Java path

Configured in:

- `android/gradle.properties`

## Quality Checks

Run static checks:

```bash
flutter analyze
```

Run widget tests:

```bash
flutter test --reporter expanded test/widget_test.dart
```

## Build Commands

Debug APK:

```bash
flutter build apk --debug
```

Release APK:

```bash
flutter build apk --release
```

## Troubleshooting

### 1) Android dexing errors around image_picker

This project includes dependency overrides in `pubspec.yaml` for known compatibility issues:

- `image_picker_android: 0.8.13+15`
- `path_provider_foundation: 2.4.1`

After changing dependencies:

```bash
flutter clean
flutter pub get
flutter build apk --debug
```

### 2) Zones are not visible on map

- Confirm `/api/zones` returns records with usable coordinates
- Verify map status indicator and network logs
- Ensure token is valid and not expired

### 3) Frequent auth redirects or 401

- Token may be invalid or expired
- Log out and log in again to refresh session
- Confirm backend `/api/auth/me` works with current token

### 4) Realtime events not arriving

- Check websocket endpoint availability
- Ensure user id and JWT are present in secure storage
- Notification polling fallback still refreshes data periodically

## Contribution Guide

1. Create a feature branch
2. Implement changes with tests where relevant
3. Run `flutter analyze` and `flutter test`
4. Open a pull request with:
	 - What changed
	 - Why it changed
	 - Validation steps

## License

No license file is currently included in this repository.
Add a license before public distribution.
