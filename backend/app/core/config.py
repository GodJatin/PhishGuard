from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "PhishGuard API"
    VERSION: str = "1.0.0"
    DESCRIPTION: str = "Smart Phishing URL Detection System API"
    
    API_V1_STR: str = "/api/v1"
    
    SUPABASE_URL: str
    SUPABASE_SERVICE_ROLE_KEY: str
    DATABASE_URL: str = ""
    FRONTEND_URL: str = "http://localhost:3000"

    class Config:
        env_file = ".env"

settings = Settings()
