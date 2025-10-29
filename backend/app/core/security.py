# app/core/security.py
from datetime import datetime, timedelta, timezone
from typing import Any, Optional
from jose import jwt
from passlib.context import CryptContext
from app.config import settings

# ✅ préfère bcrypt_sha256, garde bcrypt en secondaire pour compat rétro
pwd_context = CryptContext(
    schemes=["bcrypt_sha256", "bcrypt"],
    deprecated="auto",
)

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain: str, hashed: str) -> bool:
    ok = pwd_context.verify(plain, hashed)
    # Optionnel : si l'ancien hash a besoin d'une mise à niveau, on peut le réécrire
    # (à faire seulement si tu as la session DB ici ; sinon saute)
    # if ok and pwd_context.needs_update(hashed):
    #     user.password_hash = pwd_context.hash(plain)
    #     db.session.commit()
    return ok

def create_access_token(subject: str, role: str, expires_minutes: int | None = None) -> str:
    expire = datetime.now(timezone.utc) + timedelta(
        minutes=expires_minutes or settings.JWT_EXPIRE_MINUTES
    )
    payload: dict[str, Any] = {"sub": subject, "role": role, "exp": expire}
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALG)
