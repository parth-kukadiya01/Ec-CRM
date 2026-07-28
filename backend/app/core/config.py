import os
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "CRM System"
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = "SUPER_SECRET_CRM_KEY_987654321_CHANGE_IN_PROD"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7 # 7 days
    
    # PostgreSQL database crm_project connection default
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/crm_project"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=True
    )

settings = Settings()
