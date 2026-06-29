from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.schemas.user import UserResponse, UserUpdate
from app.api.deps import CurrentUser
from app.core.services import summarize_resume
from pypdf import PdfReader
import io
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me", response_model=UserResponse)
async def get_profile(current_user: CurrentUser):
    """Get the current user's profile."""
    return current_user


@router.patch("/me", response_model=UserResponse)
async def update_profile(
    payload: UserUpdate,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    """Update name, profile summary, or preferences."""
    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(current_user, field, value)
    await db.commit()
    await db.refresh(current_user)
    return current_user


@router.post("/me/upload-cv", response_model=UserResponse)
async def upload_cv(
    current_user: CurrentUser,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
):
    """Upload a CV PDF, extract text, summarize it, and save to profile."""
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF resumes are supported.")

    try:
        content = await file.read()
        pdf_file = io.BytesIO(content)
        reader = PdfReader(pdf_file)
        
        # Extract text from all pages
        text_parts = []
        for page in reader.pages:
            page_text = page.extract_text()
            if page_text:
                # Clean up malformed text from PDF extraction
                # Remove duplicate consecutive lines and excessive whitespace
                lines = [l.strip() for l in page_text.split('\n') if l.strip()]
                text_parts.extend(lines)
                
        resume_text = "\n".join(text_parts).strip()
        if not resume_text:
            raise HTTPException(status_code=400, detail="Failed to extract any text from the PDF. Ensure it is not scanned/image-only.")
            
        # Summarize CV
        summary = await summarize_resume(resume_text)
        
        # Save to database
        current_user.resume_text = resume_text
        current_user.profile_summary = summary
        
        await db.commit()
        await db.refresh(current_user)
        return current_user
    except Exception as e:
        logger.error(f"Error parsing CV: {e}")
        raise HTTPException(status_code=500, detail=f"Error parsing CV: {str(e)}")
