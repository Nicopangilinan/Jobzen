from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # Database
    database_url: str = "postgresql+asyncpg://jobtracker:jobtracker_pass@db:5432/jobtracker"
    postgres_user: str = "jobtracker"
    postgres_password: str = "jobtracker_pass"
    postgres_db: str = "jobtracker"

    # Auth
    google_client_id: str = "797452142799-1i7etrovbb74ddh58tinm9um6v3v8fje.apps.googleusercontent.com"
    google_client_secret: str = "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"
    jwt_secret: str = "change-me-in-production"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 10080  # 7 days

    # App
    frontend_url: str = "http://localhost:3000"
    backend_url: str = "http://localhost:8000"
    environment: str = "development"

    # AI
    anthropic_api_key: str = ""
    ollama_api_url: str = "http://host.docker.internal:11434"
    ollama_model: str = "mistral"

    # Email
    smtp_host: str = "smtp.gmail.com"
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""

    # Logo API
    logodev_api_key: str = ""

    model_config = {"env_file": ".env", "case_sensitive": False}


@lru_cache
def get_settings() -> Settings:
    return Settings()
