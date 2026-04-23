import asyncio
from contextlib import asynccontextmanager, suppress

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
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
from app.api.routes.blasts        import router as blasts_router
from app.api.routes.explorations  import router as explorations_router
from app.api.routes.weather       import router as weather_router
from app.api.routes.rainfall      import router as rainfall_router
from app.api.routes.notifications import router as notifications_router
from app.api.routes.push          import router as push_router
from app.api.routes.emergency     import router as emergency_router
from app.api.routes.presence      import router as presence_router
from app.api.routes.history       import router as history_router
from app.api.routes.users         import router as users_router
from app.api.routes.predictions   import router as predictions_router
from app.routers.groq_router import router as groq_router
from app.services.ml_models import preload_models, district_model_count
from app.services.crack_ai import preload_crack_model
from app.services.daily_refresh import run_refresh_pipeline, run_scheduled_refresh_loop
from app.websocket.manager import ws_manager
from app.models.user import User
from app.core.config import settings
import os

@asynccontextmanager
async def lifespan(app: FastAPI):
    scheduler_stop_event = asyncio.Event()
    scheduler_task: asyncio.Task | None = None

    await init_db()

    # Prepare crack model as part of startup lifecycle.
    try:
        preload_crack_model()
        print("[Startup] Crack classifier model loaded ✅")
    except Exception as e:
        print(f"[Startup] Crack classifier preload failed (non-fatal): {e}")

    # Pre-load ML models into memory if available.
    try:
        preload_models()
        print("[Startup] Rockefeller models loaded ✅")
        print(f"[Startup] District rainfall models found: {district_model_count()} ✅")
    except Exception as e:
        print(f"[Startup] Rockefeller model preload failed (non-fatal): {e}")

    try:
        result = await run_refresh_pipeline(trigger="startup")
        print(
            "[Startup] Data refresh complete ✅ "
            f"(weather={result['weather_records']}, predictions={result['predictions_written']})"
        )
    except Exception as e:
        print(f"[Startup] Data refresh failed (non-fatal): {e}")

    try:
        scheduler_task = asyncio.create_task(run_scheduled_refresh_loop(scheduler_stop_event))
        app.state.daily_refresh_stop_event = scheduler_stop_event
        app.state.daily_refresh_task = scheduler_task
        print(
            "[Startup] Daily refresh scheduler active ✅ "
            f"({settings.DAILY_REFRESH_HOUR:02d}:{settings.DAILY_REFRESH_MINUTE:02d} {settings.DAILY_REFRESH_TIMEZONE})"
        )
    except Exception as e:
        print(f"[Startup] Daily refresh scheduler failed to start (non-fatal): {e}")

    yield

    scheduler_stop_event.set()
    if scheduler_task:
        scheduler_task.cancel()
        with suppress(asyncio.CancelledError):
            await scheduler_task

    await close_db()

app = FastAPI(title="GeoAlert API", version="2.0.0", lifespan=lifespan)

def _normalize_origin(origin: str) -> str:
    return origin.strip().rstrip("/")


cors_origins = [
    _normalize_origin(origin)
    for origin in settings.CORS_ORIGINS.split(",")
    if origin.strip()
]
cors_origin_regex = settings.CORS_ORIGIN_REGEX.strip() or None

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_origin_regex=cors_origin_regex,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

os.makedirs(os.path.join(settings.UPLOAD_DIR, "reports"), exist_ok=True)
os.makedirs(os.path.join(settings.UPLOAD_DIR, "crack_reports"), exist_ok=True)

app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

app.include_router(auth_router)
app.include_router(zones_router)
app.include_router(risk_levels_router)
app.include_router(alerts_router)
app.include_router(reports_router)
app.include_router(crack_reports_router)
app.include_router(blast_events_router)
app.include_router(blasts_router)
app.include_router(explorations_router)
app.include_router(weather_router)
app.include_router(rainfall_router)
app.include_router(notifications_router)
app.include_router(push_router)
app.include_router(emergency_router)
app.include_router(presence_router)
app.include_router(history_router)
app.include_router(users_router)
app.include_router(predictions_router)
app.include_router(groq_router)


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
