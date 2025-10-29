from sqlalchemy import Column, Integer, ForeignKey,Date
from ..extensions import db

class Responsabilites(db.Model):
    __tablename__ = "responsabilites"

    idresponsabilite = Column(Integer, primary_key=True, autoincrement=True)
    idpersonnel      = Column(Integer, ForeignKey("personnel.idpersonnel"), nullable=False, index=True)
    idactivite       = Column(Integer, ForeignKey("activite.idactivite"),  nullable=False, index=True)
    date_debut_act = Column(Date, nullable=True)
    date_fin_act   = Column(Date, nullable=True)