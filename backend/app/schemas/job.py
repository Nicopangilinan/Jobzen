import uuid
from datetime import datetime, date
from pydantic import BaseModel
from app.models.job import WorkType, JobStatus


class JobCreate(BaseModel):
    company_name: str
    job_title: str
    job_url: str | None = None
    location: str | None = None
    salary_min: int | None = None
    salary_max: int | None = None
    currency: str = "USD"
    work_type: WorkType = WorkType.remote
    status: JobStatus = JobStatus.applied
    date_applied: date | None = None
    notes: str | None = None
    job_description: str | None = None
    is_active: bool = True


class JobUpdate(BaseModel):
    company_name: str | None = None
    job_title: str | None = None
    job_url: str | None = None
    location: str | None = None
    salary_min: int | None = None
    salary_max: int | None = None
    currency: str | None = None
    work_type: WorkType | None = None
    status: JobStatus | None = None
    date_applied: date | None = None
    notes: str | None = None
    job_description: str | None = None
    is_active: bool | None = None


class JobResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    company_name: str
    job_title: str
    job_url: str | None = None
    location: str | None = None
    salary_min: int | None = None
    salary_max: int | None = None
    currency: str
    work_type: WorkType
    status: JobStatus
    date_applied: date | None = None
    notes: str | None = None
    job_description: str | None = None
    company_logo_url: str | None = None
    ai_match_score: float | None = None
    ai_match_explanation: str | None = None
    is_active: bool = True
    last_checked_at: datetime | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class JobScrapeRequest(BaseModel):
    url: str
