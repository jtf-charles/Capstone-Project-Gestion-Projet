from sqlalchemy import Column, Integer, String, ForeignKey
from ..extensions import db

class Personnel(db.Model):
    __tablename__ = "personnel"

    idpersonnel = Column(Integer, primary_key=True, index=True, autoincrement=True)
    idsoumission = Column(
        Integer,
        ForeignKey("soumission.idsoumission", onupdate="CASCADE", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    nom_personnel       = Column(String(150), nullable=False, index=True)
    fonction_personnel  = Column(String(150), nullable=True)
    email_personnel     = Column(String(150), nullable=True)
    telephone_personnel = Column(String(150), nullable=True)
    type_personnel      = Column(String(150), nullable=True)
