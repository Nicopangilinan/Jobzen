from fastapi import APIRouter, Header, HTTPException, status

from app.config import get_settings
from app.core.job_status import sweep_active_job_statuses

router = APIRouter(prefix="/cron", tags=["cron"])


@router.get("/daily-job-status-sweep")
async def daily_job_status_sweep(
    x_cron_secret: str | None = Header(default=None, alias="x-cron-secret"),
    authorization: str | None = Header(default=None, alias="authorization"),
):
    """
    Trigger the daily job-status sweep.

    Intended to be called by an external scheduler (e.g., Vercel Cron).
    """
    settings = get_settings()
    bearer_secret = None
    if authorization:
        scheme, _, token = authorization.partition(" ")
        if scheme.lower() == "bearer" and token:
            bearer_secret = token

    provided_secret = x_cron_secret or bearer_secret

    if not settings.cron_secret or provided_secret != settings.cron_secret:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unauthorized")

    await sweep_active_job_statuses()
    return {"ok": True}
