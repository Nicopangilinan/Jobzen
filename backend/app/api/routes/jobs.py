from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from typing import Annotated
from app.db.session import get_db
from app.models.job import Job
from app.schemas.job import JobCreate, JobUpdate, JobResponse, JobScrapeRequest
from app.api.deps import CurrentUser
from app.core.services import scrape_job_url, calculate_match_score
from app.config import get_settings
import uuid
import urllib.parse

router = APIRouter(prefix="/jobs", tags=["jobs"])


@router.get("/", response_model=list[JobResponse])
async def list_jobs(
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
    status: str | None = None,
    work_type: str | None = None,
    limit: int = 100,
    offset: int = 0,
):
    """List all jobs for the current user, with optional status/work_type filters."""
    query = select(Job).where(Job.user_id == current_user.id)

    if status:
        query = query.where(Job.status == status)
    if work_type:
        query = query.where(Job.work_type == work_type)

    query = query.order_by(Job.created_at.desc()).limit(limit).offset(offset)
    result = await db.execute(query)
    return result.scalars().all()


@router.post("/", response_model=JobResponse, status_code=status.HTTP_201_CREATED)
async def create_job(
    payload: JobCreate,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    """Create a new job application."""
    job = Job(**payload.model_dump(), user_id=current_user.id)

    # Set company logo via logo.dev
    if payload.company_name:
        domain = _guess_domain(payload.company_name, payload.job_url)
        if domain:
            job.company_logo_url = _get_logodev_url(domain)

    db.add(job)
    await db.commit()
    await db.refresh(job)
    return job


@router.get("/{job_id}", response_model=JobResponse)
async def get_job(
    job_id: uuid.UUID,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    """Get a single job by ID (must belong to current user)."""
    result = await db.execute(
        select(Job).where(Job.id == job_id, Job.user_id == current_user.id)
    )
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job


@router.patch("/{job_id}", response_model=JobResponse)
async def update_job(
    job_id: uuid.UUID,
    payload: JobUpdate,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    """Partially update a job (PATCH — only send fields you want to change)."""
    result = await db.execute(
        select(Job).where(Job.id == job_id, Job.user_id == current_user.id)
    )
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(job, field, value)

    # Re-evaluate company logo if company name or URL changes
    if "company_name" in update_data or "job_url" in update_data:
        domain = _guess_domain(job.company_name, job.job_url)
        if domain:
            job.company_logo_url = _get_logodev_url(domain)

    await db.commit()
    await db.refresh(job)
    return job


@router.delete("/{job_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_job(
    job_id: uuid.UUID,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    """Delete a job and all its related records (cascade)."""
    result = await db.execute(
        select(Job).where(Job.id == job_id, Job.user_id == current_user.id)
    )
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    await db.delete(job)
    await db.commit()


@router.get("/stats/summary")
async def get_stats(current_user: CurrentUser, db: AsyncSession = Depends(get_db)):
    """Dashboard stats: counts per status + response rate."""
    result = await db.execute(
        select(Job.status, func.count(Job.id).label("count"))
        .where(Job.user_id == current_user.id)
        .group_by(Job.status)
    )
    rows = result.all()
    stats = {row.status: row.count for row in rows}
    total = sum(stats.values())
    responded = stats.get("interviewing", 0) + stats.get("offer", 0) + stats.get("rejected", 0)
    response_rate = round((responded / total * 100), 1) if total > 0 else 0.0

    return {
        "total": total,
        "applied": stats.get("applied", 0),
        "interviewing": stats.get("interviewing", 0),
        "offer": stats.get("offer", 0),
        "rejected": stats.get("rejected", 0),
        "withdrawn": stats.get("withdrawn", 0),
        "response_rate": response_rate,
    }


@router.post("/scrape")
async def scrape_job(
    payload: JobScrapeRequest,
    current_user: CurrentUser,
):
    """Scrape details from a job posting URL."""
    try:
        data = await scrape_job_url(payload.url)
        # Add logo
        company_name = data.get("company_name", "")
        if company_name:
            domain = _guess_domain(company_name, payload.url)
            if domain:
                data["company_logo_url"] = _get_logodev_url(domain)
        return data
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{job_id}/analyze", response_model=JobResponse)
async def analyze_job_match(
    job_id: uuid.UUID,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    """Calculate AI match score for a job application against user's profile summary."""
    result = await db.execute(
        select(Job).where(Job.id == job_id, Job.user_id == current_user.id)
    )
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    # Combine raw resume and manual profile summary updates
    source_parts = []
    if current_user.resume_text:
        source_parts.append(f"Candidate Resume History:\n{current_user.resume_text}")
    if current_user.profile_summary:
        source_parts.append(f"Candidate Profile Summary & Preferences:\n{current_user.profile_summary}")

    source_text = "\n\n".join(source_parts).strip()
    if not source_text:
        raise HTTPException(
            status_code=400,
            detail="Please upload a Resume/CV or write a Profile Summary in Settings first to calculate a match score."
        )

    if not job.job_description:
        raise HTTPException(
            status_code=400,
            detail="Cannot calculate score because this job has no job description. Please add one first."
        )

    match_data = await calculate_match_score(source_text, job.job_description)
    job.ai_match_score = match_data.get("ai_match_score", 0.0)
    job.ai_match_explanation = match_data.get("ai_match_explanation", "")

    await db.commit()
    await db.refresh(job)
    return job


# ── Helpers ───────────────────────────────────────────────────────────────────

def _get_logodev_url(domain: str) -> str:
    """Build logo.dev URL with API key for company logo fetching."""
    settings = get_settings()
    if not settings.logodev_api_key:
        return None
    return f"https://img.logo.dev/{domain}?token={settings.logodev_api_key}"


def _guess_domain(company_name: str, job_url: str | None = None) -> str | None:
    """Guess domain for logo fetching, prioritizing url hostname."""
    if job_url:
        try:
            parsed = urllib.parse.urlparse(job_url)
            netloc = parsed.netloc.lower()
            if netloc.startswith("www."):
                netloc = netloc[4:]
            
            # Avoid using generic platforms as the company domain
            generic_boards = {"linkedin.com", "indeed.com", "ziprecruiter.com", "glassdoor.com", "lever.co", "greenhouse.io", "myworkdayjobs.com"}
            if not any(board in netloc for board in generic_boards):
                return netloc
        except Exception:
            pass

    cleaned = company_name.lower().strip()
    cleaned = "".join(c for c in cleaned if c.isalnum() or c == " ")
    parts = cleaned.split()
    if parts:
        return f"{parts[0]}.com"
    return None
