# Daily Job Status Scheduler Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a once-daily backend scheduler that refreshes active job listing status overnight while preserving the existing manual single-job "Verify Listing" behavior.

**Architecture:** Reuse one shared async job-status refresh function for both the manual endpoint and the overnight sweep. Persist a new `last_checked_at` timestamp on each checked job, then start an APScheduler `AsyncIOScheduler` in FastAPI lifespan so one cron job runs daily and iterates active jobs with a six-second pause between requests.

**Tech Stack:** FastAPI, SQLAlchemy async ORM, Alembic, APScheduler, PostgreSQL

---

### Task 1: Add Persistence For Last Check Time

**Files:**
- Modify: `backend/app/models/job.py`
- Modify: `backend/app/schemas/job.py`
- Create: `backend/alembic/versions/<new_revision>_add_last_checked_at_to_jobs.py`

- [ ] **Step 1: Add the new ORM column**

```python
last_checked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
```

- [ ] **Step 2: Expose the field in API responses**

```python
class JobResponse(BaseModel):
    ...
    is_active: bool = True
    last_checked_at: datetime | None = None
    created_at: datetime
    updated_at: datetime
```

- [ ] **Step 3: Add an Alembic migration**

```python
def upgrade() -> None:
    op.add_column("jobs", sa.Column("last_checked_at", sa.DateTime(timezone=True), nullable=True))

def downgrade() -> None:
    op.drop_column("jobs", "last_checked_at")
```

- [ ] **Step 4: Run migration validation**

Run: `backend\.venv\Scripts\python.exe -m alembic upgrade head`
Expected: migration completes without SQL or import errors

### Task 2: Extract Shared Job Status Refresh Logic

**Files:**
- Modify: `backend/app/api/routes/jobs.py`
- Optionally create: `backend/app/core/job_status.py`

- [ ] **Step 1: Move duplicated check/update logic into one async helper**

```python
async def refresh_job_listing_status(
    db: AsyncSession,
    job: Job,
) -> dict[str, str | bool]:
    status_data = await check_job_active(job.job_url)
    job.is_active = status_data.get("is_active", True)
    job.last_checked_at = datetime.now(timezone.utc)

    if not job.is_active:
        job.status = JobStatus.withdrawn

    await db.commit()
    await db.refresh(job)
    return {
        "is_active": job.is_active,
        "reason": status_data.get("reason", "Unknown"),
        "status": job.status,
    }
```

- [ ] **Step 2: Update the manual endpoint to use the helper**

Run: manual endpoint still calls the same helper after loading the requested job
Expected: user-triggered "Verify Listing" behavior remains intact

### Task 3: Add The Once-Daily APScheduler Sweep

**Files:**
- Modify: `backend/app/main.py`
- Modify: `backend/app/config.py`
- Modify: `backend/app/db/session.py` if helper access needs direct session factory import

- [ ] **Step 1: Add configurable scheduler settings**

```python
job_status_sweep_hour: int = 2
job_status_sweep_minute: int = 0
job_status_check_delay_seconds: int = 6
```

- [ ] **Step 2: Implement a sweep coroutine**

```python
async def sweep_active_job_statuses() -> None:
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(Job).where(Job.is_active.is_(True), Job.job_url.is_not(None))
        )
        jobs = result.scalars().all()
        for index, job in enumerate(jobs):
            await refresh_job_listing_status(db, job)
            if index < len(jobs) - 1:
                await asyncio.sleep(settings.job_status_check_delay_seconds)
```

- [ ] **Step 3: Start and stop `AsyncIOScheduler` in lifespan**

```python
scheduler = AsyncIOScheduler()
scheduler.add_job(
    sweep_active_job_statuses,
    CronTrigger(hour=settings.job_status_sweep_hour, minute=settings.job_status_sweep_minute),
    id="daily-job-status-sweep",
    replace_existing=True,
)
scheduler.start()
...
scheduler.shutdown(wait=False)
```

- [ ] **Step 4: Make failure handling non-fatal**

```python
try:
    await refresh_job_listing_status(db, job)
except Exception:
    logger.exception("Failed refreshing status for job %s", job.id)
    await db.rollback()
```

### Task 4: Verify Behavior

**Files:**
- Validate modified backend files only

- [ ] **Step 1: Run Python compile checks**

Run: `backend\.venv\Scripts\python.exe -m compileall backend\app`
Expected: no syntax errors

- [ ] **Step 2: Re-run migration command on current head**

Run: `backend\.venv\Scripts\python.exe -m alembic upgrade head`
Expected: database remains on latest revision successfully

- [ ] **Step 3: Smoke check the manual endpoint path**

Run: inspect `backend/app/api/routes/jobs.py` response shape for `check-status`
Expected: still returns `is_active`, `reason`, and `status`, now also persists `last_checked_at`
