from sqlalchemy import Integer, String, Date, Numeric
from ..extensions import db

class Projet(db.Model):
    __tablename__ = "projet"

    idprojet = db.Column(Integer, primary_key=True, autoincrement=True)
    code_projet = db.Column(String(100), nullable=False)
    initule_projet = db.Column(String(100))
    description_projet = db.Column(String(255))
    date_demarrage_prevue = db.Column(Date)
    date_fin_prevue = db.Column(Date)
    date_demarrage_reelle = db.Column(Date)
    date_fin_reelle_projet = db.Column(Date)
    etat = db.Column(String(30), nullable=False)
    budget_previsionnel = db.Column(Numeric(15, 2), nullable=False)
    devise = db.Column(String(10), default="HTG")

    def to_dict(self):
        # sérialisation "front-friendly"
        def d(x):  # Decimal -> float (ou str si tu préfères)
            return float(x) if x is not None else None
        def iso(dte):
            return dte.isoformat() if dte else None

        return {
            "idprojet": self.idprojet,
            "code_projet": self.code_projet,
            "initule_projet": self.initule_projet,
            "description_projet": self.description_projet,
            "date_demarrage_prevue": iso(self.date_demarrage_prevue),
            "date_fin_prevue": iso(self.date_fin_prevue),
            "date_demarrage_reelle": iso(self.date_demarrage_reelle),
            "date_fin_reelle_projet": iso(self.date_fin_reelle_projet),
            "etat": self.etat,
            "budget_previsionnel": d(self.budget_previsionnel),
            "devise": self.devise,
        }
