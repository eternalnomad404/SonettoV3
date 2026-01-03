"""
Core configuration module.

Loads environment variables using Pydantic Settings.
All database credentials and app configuration come from .env file.
"""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Application settings loaded from environment variables.
    
    Required variables:
    - DATABASE_URL: PostgreSQL connection string
    - MONGO_URL: MongoDB connection string (optional for now)
    """
    
    # MongoDB
    MONGO_URL: str
    
    # PostgreSQL
    DATABASE_URL: str
    
    # Sarvam AI
    SARVAM_API_KEY: str
    
    # App metadata
    APP_NAME: str = "Sonetto API"
    VERSION: str = "1.0.0"
    
    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=True
    )


# Global settings instance
settings = Settings()
