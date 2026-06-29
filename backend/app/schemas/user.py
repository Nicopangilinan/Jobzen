import uuid
from datetime import datetime
from pydantic import BaseModel, EmailStr


class UserResponse(BaseModel):
    id: uuid.UUID
    email: EmailStr
    name: str
    avatar_url: str | None = None
    profile_summary: str | None = None
    resume_text: str | None = None
    dark_mode: bool
    email_notifications: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class UserUpdate(BaseModel):
    name: str | None = None
    profile_summary: str | None = None
    resume_text: str | None = None
    dark_mode: bool | None = None
    email_notifications: bool | None = None
