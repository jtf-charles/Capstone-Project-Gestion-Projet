# app/models/soumissionnaire.py
from sqlalchemy import Column, Integer, String
from ..extensions import db

class Soumissionnaire(db.Model):
    __tablename__ = "soumissionnaire"

    idsoumissionnaire = Column(Integer, primary_key=True, index=True, autoincrement=True)
    nom_soum          = Column(String(150), nullable=False, index=True)
    nif_soum          = Column(String(150), nullable=True)
    adresse_soum      = Column(String(150), nullable=True)
    telephone_soum    = Column(String(150), nullable=True)
    statut_soum       = Column(String(150), nullable=True)
    email_soum        = Column(String(150), nullable=True)
