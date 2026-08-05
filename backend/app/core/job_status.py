import asyncio
import logging
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.core.services import check_job_active
from app.db.session import AsyncSessionLocal
from app.models.job import Job, JobStatus

logger = logging.getLogger(__name__)


async def refresh_job_listing_status(db: AsyncSession, job: Job, html: str | None = None) -> dict[str, str | bool | None]:
    """Refresh and persist a single job listing status."""
    if not job.job_url:
        raise ValueError("Cannot verify status because this job has no posting URL.")

    status_data = await check_job_active(job.job_url, html=html)
    new_is_active = status_data.get("is_active", True)
    job.is_active = new_is_active
    job.last_checked_at = datetime.now(timezone.utc)

    if not new_is_active:
        if job.status in (JobStatus.applied, JobStatus.interviewing):
            job.status = JobStatus.withdrawn
    else:
        # If job is confirmed active again, restore status if it was marked withdrawn by a past false positive
        if job.status == JobStatus.withdrawn:
            job.status = JobStatus.applied

    await db.commit()
    await db.refresh(job)

    status_value = job.status.value if isinstance(job.status, JobStatus) else str(job.status)
    return {
        "is_active": job.is_active,
        "reason": status_data.get("reason", "Unknown"),
        "status": status_value,
        "engine": status_data.get("engine", "Unknown"),
        "last_checked_at": job.last_checked_at.isoformat() if job.last_checked_at else None,
    }


async def sweep_active_job_statuses() -> None:
    """Silently refresh all active jobs that still have a URL."""
    settings = get_settings()

    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(Job)
            .where(Job.is_active.is_(True))
            .where(Job.job_url.is_not(None))
            .order_by(Job.updated_at.asc())
        )
        jobs = result.scalars().all()

        for index, job in enumerate(jobs):
            if not job.job_url:
                continue

            try:
                await refresh_job_listing_status(db, job)
            except Exception:
                logger.exception("Failed refreshing listing status for job %s", job.id)
                await db.rollback()

            if index < len(jobs) - 1:
                await asyncio.sleep(settings.job_status_check_delay_seconds)
