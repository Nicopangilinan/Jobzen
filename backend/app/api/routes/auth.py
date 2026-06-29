import secrets
from fastapi import APIRouter, Depends, HTTPException, Response, Request
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.session import get_db
from app.models.user import User
from app.core.security import create_access_token
from app.core.oauth import build_google_auth_url, exchange_code_for_token, get_google_user_info
from app.config import get_settings
from app.api.deps import CurrentUser
from app.schemas.user import UserResponse

settings = get_settings()
router = APIRouter(prefix="/auth", tags=["auth"])


@router.get("/google")
async def google_login():
    """Step 1: Redirect the browser to Google's OAuth consent screen."""
    state = secrets.token_urlsafe(32)
    url = build_google_auth_url(state)
    return RedirectResponse(url)


@router.get("/google/callback")
async def google_callback(
    request: Request,
    response: Response,
    code: str,
    db: AsyncSession = Depends(get_db),
):
    """Step 2: Google redirects here with a code. Exchange it for a user + JWT cookie."""
    # Exchange code → access token
    try:
        token_data = await exchange_code_for_token(code)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Token exchange failed: {e}")

    # Fetch user profile from Google
    try:
        user_info = await get_google_user_info(token_data["access_token"])
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to fetch user info: {e}")

    google_id = user_info.get("sub")
    email = user_info.get("email")
    name = user_info.get("name", email)
    avatar_url = user_info.get("picture")

    if not google_id or not email:
        raise HTTPException(status_code=400, detail="Incomplete profile from Google")

    # Upsert user in DB
    result = await db.execute(select(User).where(User.google_id == google_id))
    user = result.scalar_one_or_none()

    if user is None:
        user = User(google_id=google_id, email=email, name=name, avatar_url=avatar_url)
        db.add(user)
    else:
        user.name = name
        user.avatar_url = avatar_url

    await db.commit()
    await db.refresh(user)

    # Issue JWT in HTTP-only cookie
    token = create_access_token(str(user.id))
    response = RedirectResponse(url=f"{settings.frontend_url}/dashboard")
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        secure=settings.environment == "production",
        samesite="lax",
        max_age=settings.jwt_expire_minutes * 60,
    )
    return response


@router.post("/logout")
async def logout(response: Response):
    """Clear the JWT cookie to log the user out."""
    response.delete_cookie("access_token")
    return {"message": "Logged out successfully"}


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: CurrentUser):
    """Return the currently authenticated user's profile."""
    return current_user
