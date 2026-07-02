from contextlib import asynccontextmanager
# pyrefly: ignore [missing-import]
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from app.config import get_settings
from app.api.routes import health, auth, jobs, users, cron
from app.core.job_status import sweep_active_job_statuses

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup / shutdown lifecycle."""
    print("🚀 Job Tracker API starting up...")
    scheduler = None
    if settings.enable_in_process_scheduler:
        scheduler = AsyncIOScheduler()
        scheduler.add_job(
            sweep_active_job_statuses,
            CronTrigger(
                hour=settings.job_status_sweep_hour,
                minute=settings.job_status_sweep_minute,
            ),
            id="daily-job-status-sweep",
            replace_existing=True,
        )
        scheduler.start()
        app.state.job_status_scheduler = scheduler
    yield
    if scheduler:
        scheduler.shutdown(wait=False)
    print("🛑 Job Tracker API shutting down...")


app = FastAPI(
    title="Job Tracker API",
    description="Full-stack job application tracker — Phase 1",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# ── CORS ─────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(health.router)
app.include_router(auth.router)
app.include_router(jobs.router, prefix="/api/v1")
app.include_router(users.router, prefix="/api/v1")
app.include_router(cron.router, prefix="/api/v1")


@app.get("/")
async def root():
    return {
        "message": "Job Tracker API",
        "docs": "/docs",
        "health": "/health",
    }
