from sqlalchemy import Column, Integer, String, Date
from ..extensions import db

class Document(db.Model):
    __tablename__ = "document"

    iddocument = Column(Integer, primary_key=True, index=True, autoincrement=True)
    chemin = Column(String(150), nullable=False)               # chemin/URL
    date_ajout = Column(Date, nullable=False)
    titre_document = Column(String(150), nullable=False)
    description_document = Column(String(150), nullable=True)
