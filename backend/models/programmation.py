# app/models/programmation.py
from sqlalchemy import Column, Integer, ForeignKey
from ..extensions import db

class Programmation(db.Model):
    __tablename__ = "programmation"

    idprogrammation = Column(Integer, primary_key=True, index=True, autoincrement=True)
    idactivite = Column(Integer, ForeignKey("activite.idactivite"), nullable=False, index=True)
    idexercice_budgetaire = Column(Integer, ForeignKey("exercice_budgetaire.idexercice_budgetaire"),
                                   nullable=False, index=True)
