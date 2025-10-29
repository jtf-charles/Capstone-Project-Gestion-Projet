from sqlalchemy import Column, Integer, Date, ForeignKey
from ..extensions import db

class Archive(db.Model):
    __tablename__ = "archive"

    idarchive = Column(Integer, primary_key=True, index=True, autoincrement=True)
    idevenement = Column(Integer, ForeignKey("evenement.idevenement"), nullable=False, index=True)
    iddocument = Column(Integer, ForeignKey("document.iddocument"), nullable=False, index=True)
    date_archive = Column(Date, nullable=True)
