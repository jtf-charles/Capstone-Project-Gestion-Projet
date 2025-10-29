# app/models/evenement.py
from sqlalchemy import Column, Integer, String, Date, ForeignKey
from ..extensions import db

class Evenement(db.Model):
    __tablename__ = "evenement"

    idevenement = Column(Integer, primary_key=True, index=True, autoincrement=True)

    idactivite      = Column(Integer, ForeignKey("activite.idactivite", onupdate="SET NULL", ondelete="SET NULL"), nullable=True, index=True)
    idcommande      = Column(Integer, ForeignKey("commande.idcommande", onupdate="SET NULL", ondelete="SET NULL"), nullable=True, index=True)
    idsoumissionnaire = Column(Integer, ForeignKey("soumissionnaire.idsoumissionnaire", onupdate="SET NULL", ondelete="SET NULL"), nullable=True, index=True)
    idpersonnel     = Column(Integer, ForeignKey("personnel.idpersonnel", onupdate="SET NULL", ondelete="SET NULL"), nullable=True, index=True)
    idtransaction   = Column(Integer, ForeignKey("transaction.idtransaction", onupdate="SET NULL", ondelete="SET NULL"), nullable=True, index=True)
    idprojet        = Column(Integer, ForeignKey("projet.idprojet", onupdate="SET NULL", ondelete="SET NULL"), nullable=True, index=True)
    iddocument      = Column(Integer, ForeignKey("document.iddocument", onupdate="SET NULL", ondelete="SET NULL"), nullable=True, index=True)

    type_evenement        = Column(String(150), nullable=False)
    date_evenement        = Column(Date, nullable=True)
    date_prevue           = Column(Date, nullable=True)
    description_evenement = Column(String(150), nullable=True)
    statut_evenement      = Column(String(150), nullable=True)
    date_realisee         = Column(Date, nullable=True)
