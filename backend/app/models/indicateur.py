# app/models/indicateur.py
from sqlalchemy import Column, Integer, String, Float
from ..extensions import db

class Indicateur(db.Model):
    __tablename__ = "indicateur"

    idindicateur = Column(Integer, primary_key=True, index=True, autoincrement=True)
    libelle_indicateur = Column(String(150), nullable=False, index=True)

    # niveaux (peuvent être NULL en base)
    niveau_base   = Column(Float, nullable=True)
    niveau_cible  = Column(Float, nullable=True)
    niveau_actuel = Column(Float, nullable=True)
