# app/models/exercice_budgetaire.py
from sqlalchemy import Column, Integer, String, Date
from ..extensions import db

class ExerciceBudgetaire(db.Model):
    __tablename__ = "exercice_budgetaire"

    idexercice_budgetaire = Column(Integer, primary_key=True, index=True, autoincrement=True)
    # YEAR(4) côté MySQL → on le mappe en String(4) côté ORM ; tu peux aussi mettre Integer si ta colonne est INT
    annee = Column(String(4), nullable=False, index=True)
    date_debut_exe = Column(Date, nullable=False)
    date_fin_exe = Column(Date, nullable=False)
