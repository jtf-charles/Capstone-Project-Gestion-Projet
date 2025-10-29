# Pydantic v2
from typing import Optional
from pydantic import BaseModel, Field
from datetime import date

class ProjetIn(BaseModel):
    code_projet: str = Field(min_length=1, max_length=100)
    initule_projet: Optional[str] = None
    description_projet: Optional[str] = None
    date_demarrage_prevue: Optional[date] = None
    date_fin_prevue: Optional[date] = None
    date_demarrage_reelle: Optional[date] = None
    date_fin_reelle_projet: Optional[date] = None
    etat: str = Field(min_length=1, max_length=30)
    budget_previsionnel: float
    devise: Optional[str] = "HTG"

class ProjetOut(ProjetIn):
    idprojet: int
