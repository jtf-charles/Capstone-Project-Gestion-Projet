from sqlalchemy import Column, Integer, ForeignKey
from ..extensions import db

class Couverture(db.Model):
    __tablename__ = "couverture"

    # D’après le schéma FastAPI, la table de lien possède (iddepartement, idprojet)
    # On utilise une PK composite, qui correspond bien aux tables de liens.
    idprojet = Column(Integer, ForeignKey("projet.idprojet"), primary_key=True, index=True, nullable=False)
    iddepartement = Column(Integer, ForeignKey("departement.iddepartement"), primary_key=True, index=True, nullable=False)
