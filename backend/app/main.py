from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.core.database import init_db, close_db
from app.api.routes.auth import router as auth_router
from app.api.routes.zones import router as zones_router
from app.api.routes.alerts import router as alerts_router
import os

@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
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

os.makedirs("uploads/reports", exist_ok=True)
os.makedirs("uploads/crack_reports", exist_ok=True)

app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

app.include_router(auth_router)
app.include_router(zones_router)
app.include_router(alerts_router)

@app.get("/api/health")
async def health():
    return {"status": "ok", "service": "GeoAlert API", "version": "2.0.0"}
