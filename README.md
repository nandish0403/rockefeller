# Rockefeller Mine Safety Dashboard

Rockefeller is a full-stack mine safety monitoring platform for Maharashtra operations. It combines live risk zones, alerts, reports, crack analysis, and administrative controls in a modern React dashboard backed by a FastAPI service.

## Features

- Role-based authentication (admin, safety officer, field worker)
- Interactive map with risk-based zone visualization
- Alert management and status tracking
- Crack report and field report workflows
- Analytics views and admin management panel
- Profile and operational overview dashboards

## Tech Stack

### Frontend

- React 18 + Vite
- Material UI (MUI)
- React Router
- Recharts
- Leaflet / React-Leaflet
- Axios

### Backend

- FastAPI
- Beanie ODM / MongoDB models
- JWT authentication
- Pydantic schemas

## Project Structure

- src: Frontend application
- backend/app: FastAPI backend source
- backend/scripts/data: Seed/mock JSON data
- dataset: Training and reference datasets

## Prerequisites

- Node.js 18+
- Python 3.10+
- pip
- Running MongoDB instance (required by backend)

## Frontend Setup

1. Install dependencies:

```bash
npm install
```

2. Start frontend dev server:

```bash
npm run dev
```

Frontend runs on Vite default port (usually 5173).

## Backend Setup

1. Open a terminal in backend folder:

```bash
cd backend
```

2. Create and activate virtual environment (if needed):

```bash
python -m venv env
.\env\Scripts\activate
```

3. Install backend dependencies:

```bash
pip install -r requirements.txt
```

4. Start API server:

```bash
uvicorn app.main:app --reload --port 8000
```

Backend runs on http://localhost:8000.

## Authentication Notes

- JWT token is stored in local storage.
- On reload, the app restores the previous session and revalidates the user.
- Use the sidebar Logout button to clear session and return to login.

## Common Scripts

### Frontend

- `npm run dev` - start development server
- `npm run build` - production build
- `npm run preview` - preview production build

### Backend

- `uvicorn app.main:app --reload --port 8000` - run API server

## Troubleshooting

- If login fails repeatedly, verify backend is running on port 8000.
- If data pages are empty, verify backend can access MongoDB and seed data.
- If map tiles do not load, verify internet access for CartoDB tiles.

## License

This project is private and intended for internal development use.
