from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from beanie import PydanticObjectId
from app.core.database import init_db, close_db
from app.core.security import decode_token
from app.api.routes.auth          import router as auth_router
from app.api.routes.zones         import router as zones_router
from app.api.routes.zones         import risk_levels_router
from app.api.routes.alerts        import router as alerts_router
from app.api.routes.reports       import router as reports_router
from app.api.routes.crack_reports import router as crack_reports_router
from app.api.routes.blast_events  import router as blast_events_router
from app.api.routes.weather       import router as weather_router
from app.api.routes.rainfall      import router as rainfall_router
from app.api.routes.notifications import router as notifications_router
from app.api.routes.push          import router as push_router
from app.api.routes.emergency     import router as emergency_router
from app.api.routes.presence      import router as presence_router
from app.api.routes.history       import router as history_router
from app.api.routes.users         import router as users_router
from app.api.routes.predictions   import router as predictions_router
from app.services.ml_models import preload_models, district_model_count
from app.services.crack_ai import preload_crack_model
from app.services.forecast_runner import run_daily_risk_forecast
from app.websocket.manager import ws_manager
from app.models.user import User
from app.core.config import settings
import os

@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()

    # Pull latest real-world data on every startup
    try:
        from app.ml.collectors.imd_collector  import run as imd_run
        await imd_run()
    except Exception as e:
        print(f"[Startup] Collector error (non-fatal): {e}")

    # Pre-load ML models into memory if available.
    try:
        preload_models()
        print("[Startup] Rockefeller models loaded ✅")
        print(f"[Startup] District rainfall models found: {district_model_count()} ✅")
    except Exception as e:
        print(f"[Startup] Rockefeller model preload failed (non-fatal): {e}")

    try:
        preload_crack_model()
        print("[Startup] Crack classifier model loaded ✅")
    except Exception as e:
        print(f"[Startup] Crack classifier preload failed (non-fatal): {e}")

    try:
        rows = await run_daily_risk_forecast()
        print(f"[Startup] Daily risk forecast generated for {rows} zones ✅")
    except Exception as e:
        print(f"[Startup] Daily risk forecast skipped (non-fatal): {e}")

    yield
    await close_db()

app = FastAPI(title="GeoAlert API", version="2.0.0", lifespan=lifespan)

cors_origins = [origin.strip() for origin in settings.CORS_ORIGINS.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

os.makedirs("uploads/reports",       exist_ok=True)
os.makedirs("uploads/crack_reports", exist_ok=True)

app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

app.include_router(auth_router)
app.include_router(zones_router)
app.include_router(risk_levels_router)
app.include_router(alerts_router)
app.include_router(reports_router)
app.include_router(crack_reports_router)
app.include_router(blast_events_router)
app.include_router(weather_router)
app.include_router(rainfall_router)
app.include_router(notifications_router)
app.include_router(push_router)
app.include_router(emergency_router)
app.include_router(presence_router)
app.include_router(history_router)
app.include_router(users_router)
app.include_router(predictions_router)


@app.websocket("/ws/{user_id}")
async def user_notifications_ws(websocket: WebSocket, user_id: str):
    token = websocket.query_params.get("token")
    if not token:
        await websocket.close(code=4401)
        return

    payload = decode_token(token)
    if not payload:
        await websocket.close(code=4401)
        return

    try:
        auth_user = await User.get(PydanticObjectId(payload.get("sub")))
    except Exception:
        await websocket.close(code=4401)
        return

    if not auth_user:
        await websocket.close(code=4401)
        return

    if str(auth_user.id) != user_id and auth_user.role != "admin":
        await websocket.close(code=4403)
        return

    await ws_manager.connect(user_id, websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        await ws_manager.disconnect(user_id, websocket)
    except Exception:
        await ws_manager.disconnect(user_id, websocket)

@app.get("/api/health")
async def health():
    return {"status": "ok", "version": "2.0.0"}
