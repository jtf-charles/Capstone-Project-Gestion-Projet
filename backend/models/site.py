from __future__ import annotations
from ..extensions import db


class Site(db.Model):
    __tablename__ = "site"

    idsite        = db.Column(db.Integer, primary_key=True, autoincrement=True, index=True)
    iddepartement = db.Column(db.Integer, db.ForeignKey("departement.iddepartement"), nullable=True, index=True)
    localite      = db.Column(db.String(150), nullable=True, index=True)

    # Relations (facultatives mais pratiques)
    departement = db.relationship(
        "Departement",
        backref=db.backref("sites", lazy="dynamic"),
        foreign_keys=[iddepartement],
        lazy="joined",
        viewonly=True,
    )

    def __repr__(self) -> str:
        return f"<Site id={self.idsite} loc={self.localite!r} dep={self.iddepartement}>"
