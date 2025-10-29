from enum import Enum as PyEnum

from sqlalchemy import Column, Integer, String, Enum, TIMESTAMP, text
from app.extensions import db


class RoleEnum(str, PyEnum):
    admin = "admin"
    regular = "regular"


class Utilisateur(db.Model):
    __tablename__ = "utilisateur"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(100), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(Enum(RoleEnum), nullable=False)
    created_at = Column(
        TIMESTAMP,
        nullable=False,
        server_default=text("CURRENT_TIMESTAMP"),
    )
