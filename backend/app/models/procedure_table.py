# app/models/procedure_table.py
from sqlalchemy import Column, Integer, String
from ..extensions import db

class ProcedureTable(db.Model):
    __tablename__ = "procedure_table"

    idprocedure   = Column(Integer, primary_key=True, index=True, autoincrement=True)
    type_procedure = Column(String(150), nullable=True, index=True)
