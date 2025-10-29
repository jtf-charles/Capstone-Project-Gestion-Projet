# app/models/soumission.py
from sqlalchemy import Column, Integer, String, Date, ForeignKey
from ..extensions import db

class Soumission(db.Model):
    __tablename__ = "soumission"

    idsoumission      = Column(Integer, primary_key=True, index=True, autoincrement=True)
    idsoumissionnaire = Column(Integer, ForeignKey("soumissionnaire.idsoumissionnaire"), nullable=True, index=True)
    idcommande        = Column(Integer, ForeignKey("commande.idcommande"), nullable=False, index=True)

    date_soumission   = Column(Date, nullable=False)
    statut_soumission = Column(String(100), nullable=True, default="en cours")
