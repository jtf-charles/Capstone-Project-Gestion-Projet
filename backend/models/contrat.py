from sqlalchemy import Column, Integer, Date, ForeignKey
from ..extensions import db

class Contrat(db.Model):
    __tablename__ = "contrat"

    idcontrat      = Column(Integer, primary_key=True, autoincrement=True)
    idpersonnel    = Column(Integer, ForeignKey("personnel.idpersonnel"), nullable=False, index=True)

    date_signature    = Column(Date, nullable=True)
    date_debut_contrat= Column(Date, nullable=True)
    date_fin_contrat  = Column(Date, nullable=True)
    duree_contrat     = Column(Integer, nullable=True)
