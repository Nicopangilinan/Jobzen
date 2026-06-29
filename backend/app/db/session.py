from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.pool import NullPool
from app.config import get_settings

settings = get_settings()

_is_dev = settings.environment == "development"

# In serverless runtimes (like Vercel), connection pooling can cause too many open connections
# across concurrent lambdas. Prefer NullPool outside local dev.
_engine_kwargs = {
    "echo": _is_dev,
    "pool_pre_ping": True,
}
if _is_dev:
    _engine_kwargs.update({"pool_size": 10, "max_overflow": 20})
else:
    _engine_kwargs.update({"poolclass": NullPool})

engine = create_async_engine(settings.database_url, **_engine_kwargs)

AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


async def get_db():
    """FastAPI dependency — yields an async DB session."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
