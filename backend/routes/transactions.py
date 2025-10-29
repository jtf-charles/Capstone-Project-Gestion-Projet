# app/routes/transactions.py
from flask import Blueprint, jsonify, request
from sqlalchemy import text
from ..extensions import db

transactions_bp = Blueprint(
    "transactions", __name__, url_prefix="/api/v1/transactions"
)

@transactions_bp.route("/projets/<int:idprojet>/transactions", methods=["GET"])
def list_transactions_by_project(idprojet: int):
    """
    List Transactions By Project
    ---
    tags:
      - transactions
    parameters:
      - in: path
        name: idprojet
        required: true
        schema:
          type: integer
      - in: query
        name: scope
        description: "personnel = t.idpersonnel IS NOT NULL | activite = t.idactivite IS NOT NULL"
        required: false
        schema:
          type: string
          enum: [personnel, activite]
          default: personnel
    responses:
      200:
        description: Successful Response
        content:
          application/json:
            schema:
              type: array
              items:
                type: object
      400:
        description: Bad Request
      500:
        description: Server Error
    """
    try:
        scope = (request.args.get("scope") or "personnel").strip().lower()
        if scope not in {"personnel", "activite"}:
            return jsonify({"detail": "scope doit être 'personnel' ou 'activite'"}), 400

        if scope == "personnel":
            sql = text("""
                SELECT
                    t.idtransaction,
                    p.nom_personnel,
                    p.type_personnel,
                    t.date_transaction,
                    t.type_transaction,
                    t.commentaire,
                    t.montant_transaction,
                    t.devise,
                    t.type_paiement,
                    t.idpersonnel,
                    t.idactivite
                FROM transaction t
                JOIN personnel p ON p.idpersonnel = t.idpersonnel
                WHERE t.idprojet = :pid
                  AND t.idpersonnel IS NOT NULL
                ORDER BY t.date_transaction
            """)
        else:  # activite
            sql = text("""
                SELECT
                    t.idtransaction,
                    a.titre_act,
                    t.date_transaction,
                    t.type_transaction,
                    t.commentaire,
                    t.montant_transaction,
                    t.devise,
                    t.idpersonnel,
                    t.idactivite
                FROM transaction t
                JOIN activite a ON a.idactivite = t.idactivite
                WHERE t.idprojet = :pid
                  AND t.idactivite IS NOT NULL
                  AND a.idprojet = :pid
                ORDER BY t.date_transaction
            """)

        rows = db.session.execute(sql, {"pid": idprojet}).mappings().all()
        return jsonify([dict(r) for r in rows]), 200

    except Exception:
        return jsonify({"detail": "Erreur serveur"}), 500


