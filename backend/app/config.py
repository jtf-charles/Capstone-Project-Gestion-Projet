# app/config.py
from typing import List, Optional, ClassVar
from pathlib import Path
import os

from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field


class Settings(BaseSettings):
    # ----- Pydantic v2 config (remplace totalement la classe imbriquée `Config`) -----
    model_config = SettingsConfigDict(
        env_file=".env",
        extra="ignore",
        arbitrary_types_allowed=True,
    )

    # ----- App -----
    APP_NAME: str = "API"
    APP_VERSION: str = "v0.0.1"
    DEBUG: bool = True

    # ----- Auth -----
    JWT_SECRET: str = "CHANGE_ME"
    JWT_ALG: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 60

    # ----- CORS / DB -----
    BACKEND_CORS_ORIGINS: List[str] = []
    DATABASE_URL: Optional[str] = None

    # ----- Fichiers -----
    # Constante de classe (ignorée par Pydantic)
    BASE_DIR: ClassVar[Path] = Path(__file__).resolve().parents[2]

    # Racine de stockage (champ géré par Pydantic)
    STORAGE_ROOT: Path = Field(
        default_factory=lambda: Path(
            os.getenv("STORAGE_ROOT", str(Settings.BASE_DIR / "app" / "storage"))
        )
    )

    MEDIA_URL_PREFIX: str = os.getenv("MEDIA_URL_PREFIX", "/media")
    PROTECT_MEDIA: bool = False


# instance prête à l’emploi
settings = Settings()

# compat : si ailleurs on fait `from app.config import Config`
Config = Settings
config = settings  