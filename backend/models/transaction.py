# app/models/transaction.py
from sqlalchemy import Column, Integer, String, Date, DECIMAL, ForeignKey
from ..extensions import db

class Transaction(db.Model):
    __tablename__ = "transaction"

    idtransaction = Column(Integer, primary_key=True, index=True, autoincrement=True)

    # FKs
    idpersonnel = Column(Integer, ForeignKey("personnel.idpersonnel",
                                             onupdate="SET NULL", ondelete="SET NULL"),
                         nullable=True, index=True)
    idactivite  = Column(Integer, ForeignKey("activite.idactivite",
                                             onupdate="SET NULL", ondelete="SET NULL"),
                         nullable=True, index=True)
    idprojet    = Column(Integer, ForeignKey("projet.idprojet",
                                             onupdate="SET NULL", ondelete="SET NULL"),
                         nullable=True, index=True)

    # Champs
    montant_transaction = Column(DECIMAL(20, 2), nullable=False)
    type_transaction    = Column(String(150), nullable=True)
    receveur_type       = Column(String(150), nullable=True)
    type_paiement       = Column(String(150), nullable=True)
    date_transaction    = Column(Date,        nullable=False)
    commentaire         = Column(String(150), nullable=True)
    devise              = Column(String(45),  nullable=False)

    def __repr__(self) -> str:
        return f"<Transaction id={self.idtransaction} projet={self.idprojet}>"

    def to_dict(self) -> dict:
        return {
            "idtransaction": int(self.idtransaction),
            "idpersonnel": self.idpersonnel,
            "idactivite": self.idactivite,
            "montant_transaction": str(self.montant_transaction),
            "type_transaction": self.type_transaction,
            "receveur_type": self.receveur_type,
            "type_paiement": self.type_paiement,
            "date_transaction": self.date_transaction.isoformat() if self.date_transaction else None,
            "commentaire": self.commentaire,
            "devise": self.devise,
            "idprojet": self.idprojet,
        }
