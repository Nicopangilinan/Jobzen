from datetime import datetime, timedelta, timezone
from typing import Any
import uuid
from jose import JWTError, jwt
from app.config import get_settings

settings = get_settings()


def create_access_token(subject: str | Any, expires_delta: timedelta | None = None) -> str:
    """Create a signed JWT access token."""
    expire = (
        datetime.now(timezone.utc) + expires_delta
        if expires_delta
        else datetime.now(timezone.utc) + timedelta(minutes=settings.jwt_expire_minutes)
    )
    payload = {
        "exp": expire,
        "sub": str(subject),
        "jti": str(uuid.uuid4()),
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def decode_access_token(token: str) -> dict | None:
    """Verify and decode a JWT token. Returns None if invalid."""
    try:
        return jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
    except JWTError:
        return None
