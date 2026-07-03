from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # Database
    database_url: str

    # Auth
    jwt_secret: str
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 10080  # 7 days
    google_client_id: str = ""
    google_client_secret: str = ""

    # App
    frontend_url: str = "http://localhost:3000"
    backend_url: str = "http://localhost:8000"
    environment: str = "development"

    # AI
    anthropic_api_key: str = ""
    gemini_api_key: str = ""
    ollama_api_url: str = "http://host.docker.internal:11434"
    ollama_model: str = "mistral"

    # Email
    smtp_host: str = "smtp.gmail.com"
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""

    # Logo API
    logodev_api_key: str = ""

    # Job status scheduler
    enable_in_process_scheduler: bool = False
    job_status_sweep_hour: int = 2
    job_status_sweep_minute: int = 0
    job_status_check_delay_seconds: int = 6
    cron_secret: str = ""

    model_config = {"env_file": ".env", "case_sensitive": False}


@lru_cache
def get_settings() -> Settings:
    return Settings()
