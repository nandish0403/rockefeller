from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.core.database import init_db, close_db
from app.api.routes.auth          import router as auth_router
from app.api.routes.zones         import router as zones_router
from app.api.routes.alerts        import router as alerts_router
from app.api.routes.reports       import router as reports_router
from app.api.routes.crack_reports import router as crack_reports_router
from app.api.routes.blast_events  import router as blast_events_router
from app.api.routes.weather       import router as weather_router
import os

@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()

    # Pull latest real-world data on every startup
    try:
        from app.ml.collectors.imd_collector  import run as imd_run
        from app.ml.collectors.ndma_collector import run as ndma_run
        await imd_run()
        await ndma_run()
    except Exception as e:
        print(f"[Startup] Collector error (non-fatal): {e}")

    # Pre-load ML model into memory if trained
    try:
        from app.ml.model2_risk_predictor.predict import _load
        _load()
        print("[Startup] ML model loaded ✅")
    except Exception:
        print("[Startup] ML model not trained yet — using threshold fallback ✅")

    yield
    await close_db()

app = FastAPI(title="GeoAlert API", version="2.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

os.makedirs("uploads/reports",       exist_ok=True)
os.makedirs("uploads/crack_reports", exist_ok=True)

app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

app.include_router(auth_router)
app.include_router(zones_router)
app.include_router(alerts_router)
app.include_router(reports_router)
app.include_router(crack_reports_router)
app.include_router(blast_events_router)
app.include_router(weather_router)

@app.get("/api/health")
async def health():
    return {"status": "ok", "version": "2.0.0"}
