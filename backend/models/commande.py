# app/models/commande.py
from sqlalchemy import Column, Integer, String, DECIMAL, ForeignKey
from ..extensions import db

class Commande(db.Model):
    __tablename__ = "commande"

    idcommande       = Column(Integer, primary_key=True, index=True, autoincrement=True)
    idprocedure      = Column(Integer, ForeignKey("procedure_table.idprocedure"), nullable=True, index=True)
    idprojet         = Column(Integer, ForeignKey("projet.idprojet"),         nullable=True, index=True)

    montant_commande = Column(DECIMAL(20, 2), nullable=False)
    libelle_commande = Column(String(150), nullable=True)
    nature_commande  = Column(String(150), nullable=True)
    type_commande    = Column(String(150), nullable=True)
