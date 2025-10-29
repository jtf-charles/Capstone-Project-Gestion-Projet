# app/api/v1/transactions.py
from datetime import date, datetime
from decimal import Decimal, InvalidOperation
from typing import Any, Dict, Optional, List

from flask import Blueprint, jsonify, request
from sqlalchemy import text
from sqlalchemy.orm import Session
from flasgger import swag_from

from ..extensions import db  # db.session

bp_transactions = Blueprint("transaction", __name__, url_prefix="/api/v1/transactions")

# ------------------------ Normalisation des dates -----------------------------

def _to_iso_date(v) -> Optional[str]:
    if v is None:
        return None
    if isinstance(v, datetime):
        return v.date().isoformat()
    if isinstance(v, date):
        return v.isoformat()
    s = str(v)
    if len(s) >= 10 and s[4] == "-" and s[7] == "-":
        return s[:10]
    try:
        return s.split(" ")[0].split("T")[0]
    except Exception:
        return s

def _iso_row(row: Dict[str, Any], fields: List[str]) -> Dict[str, Any]:
    out = dict(row)
    for f in fields:
        if f in out:
            out[f] = _to_iso_date(out[f])
    return out

# ------------------------ Helpers SQL & validations ---------------------------

_SQL_JOIN = """
SELECT
  t.idtransaction,
  t.idpersonnel,
  t.idactivite,
  t.montant_transaction,
  t.type_transaction,
  t.receveur_type,
  t.type_paiement,
  t.date_transaction,
  t.commentaire,
  t.devise,
  t.idprojet,
  p.nom_personnel,
  a.titre_act,
  pr.code_projet
FROM transaction t
LEFT JOIN personnel p ON p.idpersonnel = t.idpersonnel
LEFT JOIN activite  a ON a.idactivite  = t.idactivite
LEFT JOIN projet   pr ON pr.idprojet   = t.idprojet
"""

def _one_join(session: Session, idtrans: int) -> Dict[str, Any]:
    row = session.execute(
        text(_SQL_JOIN + " WHERE t.idtransaction = :id"),
        {"id": idtrans},
    ).mappings().first()
    if not row:
        return {}
    return _iso_row(dict(row), ["date_transaction"])

def _decimal_or_400(v: Any, field: str) -> Decimal:
    from werkzeug.exceptions import BadRequest
    try:
        return Decimal(str(v))
    except (InvalidOperation, TypeError):
        raise BadRequest(description=f"{field} doit être un nombre valide.")

def raise_bad_request(msg: str):
    from werkzeug.exceptions import BadRequest
    raise BadRequest(description=msg)

def _validate_fk(session: Session, payload: Dict[str, Any]) -> None:
    if payload.get("idpersonnel") is not None:
        ok = session.execute(
            text("SELECT 1 FROM personnel WHERE idpersonnel=:id LIMIT 1"),
            {"id": payload["idpersonnel"]},
        ).first()
        if not ok:
            raise_bad_request("personnel inexistant.")
    if payload.get("idactivite") is not None:
        ok = session.execute(
            text("SELECT 1 FROM activite WHERE idactivite=:id LIMIT 1"),
            {"id": payload["idactivite"]},
        ).first()
        if not ok:
            raise_bad_request("activite inexistante.")
    if payload.get("idprojet") is not None:
        ok = session.execute(
            text("SELECT 1 FROM projet WHERE idprojet=:id LIMIT 1"),
            {"id": payload["idprojet"]},
        ).first()
        if not ok:
            raise_bad_request("projet inexistant.")

# ------------------------ Specs Swagger (dicts Python) ------------------------

_body_schema = {
    "type": "object",
    "properties": {
        "idpersonnel":         {"type": "integer"},
        "idactivite":          {"type": "integer"},
        "montant_transaction": {"type": "number"},
        "type_transaction":    {"type": "string"},
        "receveur_type":       {"type": "string"},
        "type_paiement":       {"type": "string"},
        "date_transaction":    {"type": "string", "description": "YYYY-MM-DD"},
        "commentaire":         {"type": "string"},
        "devise":              {"type": "string"},
        "idprojet":            {"type": "integer"},
    },
    "required": ["montant_transaction"],
}

spec_list_by_project = {
    "tags": ["transaction"],
    "parameters": [
        {"in": "path", "name": "idprojet", "required": True, "type": "integer"},
        {
            "in": "query", "name": "scope", "required": False, "type": "string",
            "enum": ["personnel", "activite"], "default": "personnel",
            "description": "personnel -> idpersonnel IS NOT NULL ; activite -> idactivite IS NOT NULL (et cohérence avec activite.idprojet)"
        },
    ],
    "responses": {"200": {"description": "Successful Response"}}
}

spec_list = {
    "tags": ["transaction"],
    "parameters": [
        {"in": "query", "name": "idprojet", "type": "integer"},
        {"in": "query", "name": "idactivite", "type": "integer"},
        {"in": "query", "name": "idpersonnel", "type": "integer"},
        {"in": "query", "name": "type_transaction", "type": "string"},
        {"in": "query", "name": "type_paiement", "type": "string"},
        {"in": "query", "name": "receveur_type", "type": "string"},
        {"in": "query", "name": "date_from", "type": "string", "description": "YYYY-MM-DD"},
        {"in": "query", "name": "date_to",   "type": "string", "description": "YYYY-MM-DD"},
        {"in": "query", "name": "skip", "type": "integer", "default": 0},
        {"in": "query", "name": "limit","type": "integer", "default": 100},
    ],
    "responses": {"200": {"description": "Successful Response"}}
}

spec_get = {
    "tags": ["transaction"],
    "parameters": [{"in": "path", "name": "idtransaction", "required": True, "type": "integer"}],
    "responses": {"200": {"description": "Successful Response"}, "404": {"description": "Not found"}}
}

spec_post = {
    "tags": ["transaction"],
    "consumes": ["application/json"],
    "parameters": [{"in": "body", "name": "payload", "required": True, "schema": _body_schema}],
    "responses": {"201": {"description": "Created"}, "400": {"description": "Validation error"}}
}

spec_put = {
    "tags": ["transaction"],
    "consumes": ["application/json"],
    "parameters": [
        {"in": "path", "name": "idtransaction", "required": True, "type": "integer"},
        {"in": "body", "name": "payload", "required": True, "schema": _body_schema},
    ],
    "responses": {
        "200": {"description": "Successful Response"},
        "404": {"description": "Not found"},
        "400": {"description": "Validation error"},
    },
}

spec_delete = {
    "tags": ["transaction"],
    "parameters": [{"in": "path", "name": "idtransaction", "required": True, "type": "integer"}],
    "responses": {"200": {"description": "Successful Response"}}
}

# ------------------------------- Endpoints ------------------------------------

@bp_transactions.get("/projets/<int:idprojet>/transactions")
@swag_from(spec_list_by_project)
def list_transactions_by_project(idprojet: int):
    scope = request.args.get("scope", "personnel")
    session: Session = db.session

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
    else:
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

    rows = session.execute(sql, {"pid": idprojet}).mappings().all()
    return jsonify([_iso_row(dict(r), ["date_transaction"]) for r in rows])

@bp_transactions.get("/")
@swag_from(spec_list)
def list_transactions():
    args = request.args
    where = ["1=1"]
    params: Dict[str, Any] = {}

    def add_eq(field: str, col: str):
        v = args.get(field)
        if v not in (None, ""):
            where.append(f"{col} = :{field}")
            params[field] = int(v) if isinstance(v, str) and v.isdigit() else v

    add_eq("idprojet", "t.idprojet")
    add_eq("idactivite", "t.idactivite")
    add_eq("idpersonnel", "t.idpersonnel")
    add_eq("type_transaction", "t.type_transaction")
    add_eq("type_paiement", "t.type_paiement")
    add_eq("receveur_type", "t.receveur_type")

    date_from = args.get("date_from")
    date_to   = args.get("date_to")
    if date_from:
        where.append("t.date_transaction >= :dfrom")
        params["dfrom"] = _to_iso_date(date_from)
    if date_to:
        where.append("t.date_transaction <= :dto")
        params["dto"] = _to_iso_date(date_to)

    limit = min(int(args.get("limit", 100)), 500)
    skip  = int(args.get("skip", 0))

    sql = f"""
        {_SQL_JOIN}
        WHERE {" AND ".join(where)}
        ORDER BY t.idtransaction DESC
        LIMIT :limit OFFSET :skip
    """
    params.update({"limit": limit, "skip": skip})

    session: Session = db.session
    rows = session.execute(text(sql), params).mappings().all()
    return jsonify([_iso_row(dict(r), ["date_transaction"]) for r in rows])

@bp_transactions.get("/<int:idtransaction>")
@swag_from(spec_get)
def get_transaction(idtransaction: int):
    session: Session = db.session
    row = _one_join(session, idtransaction)
    if not row:
        return jsonify({"detail": "Transaction introuvable."}), 404
    return jsonify(row)

@bp_transactions.post("/")
@swag_from(spec_post)
def create_transaction():
    payload: Dict[str, Any] = request.get_json(silent=True) or {}

    if "montant_transaction" not in payload:
        raise_bad_request("montant_transaction est obligatoire.")
    montant = _decimal_or_400(payload.get("montant_transaction"), "montant_transaction")
    if montant < 0:
        raise_bad_request("montant_transaction doit être >= 0")

    payload["montant_transaction"] = str(montant)
    payload["date_transaction"] = _to_iso_date(payload.get("date_transaction"))

    session: Session = db.session
    _validate_fk(session, payload)

    ins = text("""
        INSERT INTO transaction(
            idpersonnel, idactivite, montant_transaction, type_transaction,
            receveur_type, type_paiement, date_transaction, commentaire,
            devise, idprojet
        ) VALUES (
            :idpersonnel, :idactivite, :montant_transaction, :type_transaction,
            :receveur_type, :type_paiement, :date_transaction, :commentaire,
            :devise, :idprojet
        )
    """)
    session.execute(ins, payload)
    session.commit()
    new_id = session.execute(text("SELECT LAST_INSERT_ID() AS id")).mappings().one()["id"]
    return jsonify(_one_join(session, int(new_id))), 201

@bp_transactions.put("/<int:idtransaction>")
@swag_from(spec_put)
def update_transaction(idtransaction: int):
    session: Session = db.session
    exists = session.execute(
        text("SELECT 1 FROM transaction WHERE idtransaction=:id LIMIT 1"),
        {"id": idtransaction},
    ).first()
    if not exists:
        return jsonify({"detail": "Transaction introuvable."}), 404

    payload: Dict[str, Any] = request.get_json(silent=True) or {}

    if "montant_transaction" not in payload:
        raise_bad_request("montant_transaction est obligatoire.")
    montant = _decimal_or_400(payload.get("montant_transaction"), "montant_transaction")
    if montant < 0:
        raise_bad_request("montant_transaction doit être >= 0")

    payload["montant_transaction"] = str(montant)
    payload["date_transaction"] = _to_iso_date(payload.get("date_transaction"))

    _validate_fk(session, payload)

    upd = text("""
        UPDATE transaction
           SET idpersonnel = :idpersonnel,
               idactivite = :idactivite,
               montant_transaction = :montant_transaction,
               type_transaction = :type_transaction,
               receveur_type = :receveur_type,
               type_paiement = :type_paiement,
               date_transaction = :date_transaction,
               commentaire = :commentaire,
               devise = :devise,
               idprojet = :idprojet
         WHERE idtransaction = :id
    """)
    payload["id"] = idtransaction
    session.execute(upd, payload)
    session.commit()
    return jsonify(_one_join(session, idtransaction))

@bp_transactions.delete("/<int:idtransaction>")
@swag_from(spec_delete)
def delete_transaction(idtransaction: int):
    session: Session = db.session

    cnt = session.execute(
        text("SELECT COUNT(*) AS c FROM evenement WHERE idtransaction = :id"),
        {"id": idtransaction},
    ).scalar()
    if cnt and int(cnt) > 0:
        return jsonify({
            "deleted": False,
            "idtransaction": idtransaction,
            "reason": "Impossible de supprimer : transaction déjà liée à au moins un événement.",
        })

    res = session.execute(
        text("DELETE FROM transaction WHERE idtransaction = :id"),
        {"id": idtransaction},
    )
    session.commit()
    return jsonify({
        "deleted": res.rowcount > 0,
        "idtransaction": idtransaction,
        "reason": None if res.rowcount > 0 else "Aucune ligne supprimée.",
    })
