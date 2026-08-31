import os
from typing import List, Union
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "CRM System"
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = "SUPER_SECRET_CRM_KEY_987654321_CHANGE_IN_PROD"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    ENVIRONMENT: str = "production"
    
    # PostgreSQL connection string default with fallback handling
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/crm_project"

    # CORS Origins (Comma-separated string in env e.g. "http://localhost:3000,https://app.crm.com" or "*")
    CORS_ORIGINS: Union[str, List[str]] = "*"

    # AWS S3 Configuration (leave empty to use local file storage)
    AWS_ACCESS_KEY_ID: str = ""
    AWS_SECRET_ACCESS_KEY: str = ""
    AWS_REGION: str = "ap-south-1"
    S3_BUCKET_NAME: str = ""
    S3_CDN_DOMAIN: str = ""  # Optional CloudFront domain (e.g. "cdn.yourdomain.com")

    @field_validator("CORS_ORIGINS", mode="after")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str):
            if v == "*":
                return ["*"]
            return [i.strip() for i in v.split(",") if i.strip()]
        return v

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=True
    )

settings = Settings()
