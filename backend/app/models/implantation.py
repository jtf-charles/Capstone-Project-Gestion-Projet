from __future__ import annotations
from ..extensions import db


class Implantation(db.Model):
    __tablename__ = "implantation"

    idimplementation = db.Column(db.Integer, primary_key=True, autoincrement=True, index=True)
    idsite           = db.Column(db.Integer, db.ForeignKey("site.idsite"), nullable=True, index=True)
    idactivite       = db.Column(db.Integer, db.ForeignKey("activite.idactivite"), nullable=True, index=True)

    # Relations utiles (sans obligation de les utiliser dans tes requêtes)
    site = db.relationship(
        "Site",
        backref=db.backref("implantations", lazy="dynamic"),
        foreign_keys=[idsite],
        lazy="joined",
        viewonly=True,
    )
    activite = db.relationship(
        "Activite",
        backref=db.backref("implantations", lazy="dynamic"),
        foreign_keys=[idactivite],
        lazy="joined",
        viewonly=True,
    )

    def __repr__(self) -> str:
        return f"<Implantation id={self.idimplementation} site={self.idsite} act={self.idactivite}>"
