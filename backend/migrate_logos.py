"""Update existing jobs from Clearbit to logo.dev URLs"""
import asyncio
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from app.models.job import Job
from app.config import get_settings

settings = get_settings()

async def migrate_logos():
    """Update all clearbit URLs to logo.dev URLs"""
    engine = create_async_engine(settings.database_url)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as session:
        # Get all jobs with clearbit URLs
        result = await session.execute(
            select(Job).where(Job.company_logo_url.like('%clearbit%'))
        )
        jobs = result.scalars().all()
        
        print(f"Found {len(jobs)} jobs with Clearbit URLs")
        
        for job in jobs:
            if job.company_name:
                # Extract domain from company name
                domain = job.company_name.lower().strip()
                domain = "".join(c for c in domain if c.isalnum() or c == " ")
                parts = domain.split()
                if parts:
                    domain = f"{parts[0]}.com"
                    if settings.logodev_api_key:
                        job.company_logo_url = f"https://img.logo.dev/{domain}?token={settings.logodev_api_key}"
                        print(f"Updated {job.company_name}: {job.company_logo_url}")
        
        await session.commit()
        print("Migration complete!")
    
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(migrate_logos())
