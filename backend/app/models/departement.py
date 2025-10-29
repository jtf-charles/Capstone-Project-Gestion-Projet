from __future__ import annotations
from ..extensions import db


class Departement(db.Model):
    __tablename__ = "departement"

    iddepartement = db.Column(db.Integer, primary_key=True, autoincrement=True, index=True)
    departement   = db.Column(db.String(150), nullable=False, index=True)

    # backref("departement") défini côté Site (optionnel)
    def __repr__(self) -> str:
        return f"<Departement id={self.iddepartement} name={self.departement!r}>"
