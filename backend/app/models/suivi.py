# app/models/suivi.py
from sqlalchemy import Column, Integer, ForeignKey, Index
from sqlalchemy.orm import relationship
from ..extensions import db

class Suivi(db.Model):
    __tablename__ = "suivi"

    idsuivi = Column(Integer, primary_key=True, index=True, autoincrement=True)

    # FK -> indicateur.idindicateur (nullable en base dans ton schéma)
    idindicateur = Column(
        Integer,
        ForeignKey("indicateur.idindicateur"),
        nullable=True,
        index=True,
    )

    # FK -> activite.idactivite (requis)
    idactivite = Column(
        Integer,
        ForeignKey("activite.idactivite"),
        nullable=False,
        index=True,
    )

    # (facultatif) relations ORM — utiles si tu fais des jointures via ORM
    indicateur = relationship("Indicateur", lazy="joined", foreign_keys=[idindicateur])
    activite   = relationship("Activite",   lazy="joined", foreign_keys=[idactivite])

    def __repr__(self) -> str:
        return f"<Suivi idsuivi={self.idsuivi} idactivite={self.idactivite} idindicateur={self.idindicateur}>"

# Index combiné recommandé pour les recherches par (idactivite, idindicateur)
Index("ix_suivi_activite_indicateur", Suivi.idactivite, Suivi.idindicateur)
