# app/models/activite.py
from __future__ import annotations
from ..extensions import db


class Activite(db.Model):
    __tablename__ = "activite"

    idactivite = db.Column(db.Integer, primary_key=True, autoincrement=True, index=True)
    idprojet   = db.Column(db.Integer, db.ForeignKey("projet.idprojet"), nullable=True, index=True)

    titre_act             = db.Column(db.String(150), nullable=False)
    description_act       = db.Column(db.String(150), nullable=True)
    dateDemarragePrevue_act = db.Column(db.Date, nullable=True)
    dateFinPrevue_act       = db.Column(db.Date, nullable=True)


    def __repr__(self) -> str:
        return f"<Activite id={self.idactivite} projet={self.idprojet} titre={self.titre_act!r}>"

    def to_dict(self) -> dict:
        """Forme consommée par le frontend / swagger (mêmes clés que FastAPI)."""
        return {
            "idprojet": self.idprojet,
            "idactivite": self.idactivite,
            "titre_act": self.titre_act,
            "description_act": self.description_act,
            "dateDemarragePrevue_act": (
                self.dateDemarragePrevue_act.isoformat() if self.dateDemarragePrevue_act else None
            ),
            "dateFinPrevue_act": (
                self.dateFinPrevue_act.isoformat() if self.dateFinPrevue_act else None
            ),
        }
