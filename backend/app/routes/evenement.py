# app/routes/evenement.py
from __future__ import annotations

from typing import Optional, Dict, Any, List
from datetime import date, datetime

from flask import Blueprint, jsonify, request
from sqlalchemy import text
from sqlalchemy.orm import Session

# adapte si ton chemin diffère
from ..extensions import db  # db.session : Session

bp_evenement = Blueprint("evenement", __name__, url_prefix="/api/v1/evenement")

# ──────────────────────────────────────────────────────────────────────────────
# Helpers (dates → YYYY-MM-DD)
# ──────────────────────────────────────────────────────────────────────────────

def _to_iso_date(v) -> Optional[str]:
    """Retourne 'YYYY-MM-DD' (ou None). Supporte date/datetime/str."""
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
    """Normalise les champs date listés en YYYY-MM-DD dans un dict résultat."""
    out = dict(row)
    for f in fields:
        if f in out:
            out[f] = _to_iso_date(out[f])
    return out

# ──────────────────────────────────────────────────────────────────────────────
# SQL helpers
# ──────────────────────────────────────────────────────────────────────────────

_SQL_SELECT = """
SELECT
  e.idevenement,
  e.idactivite,
  e.idcommande,
  e.idsoumissionnaire,
  e.idpersonnel,
  e.idtransaction,
  e.idprojet,
  e.type_evenement,
  e.date_evenement,
  e.date_prevue,
  e.description_evenement,
  e.statut_evenement,
  e.date_realisee,
  COALESCE(COUNT(a.idarchive), 0) AS nb_documents
FROM evenement e
LEFT JOIN archive a ON a.idevenement = e.idevenement
"""

_DATE_FIELDS = ["date_evenement", "date_prevue", "date_realisee"]

def _one(session: Session, eid: int) -> Optional[Dict[str, Any]]:
    row = session.execute(
        text(_SQL_SELECT + " WHERE e.idevenement = :id GROUP BY e.idevenement"),
        {"id": eid},
    ).mappings().fetchone()
    return _iso_row(dict(row), _DATE_FIELDS) if row else None

def _normalize_fk(v: Optional[int]) -> Optional[int]:
    """Transforme 0 / '' / None en NULL pour les FK facultatives."""
    if v in (None, "", 0, "0"):
        return None
    try:
        return int(v)
    except Exception:
        return None

def _fk_exists(session: Session, table: str, idcol: str, v: Optional[int]) -> bool:
    """Teste l'existence d'une valeur de FK si non NULL."""
    if v is None:
        return True
    sql = f"SELECT 1 FROM {table} WHERE {idcol} = :v LIMIT 1"
    return session.execute(text(sql), {"v": v}).first() is not None

def _validate_foreign_keys_or_400(session: Session, p: Dict[str, Any]):
    """Lève 400 si une FK renseignée n’existe pas (évite un 500 MySQL 1452)."""
    from werkzeug.exceptions import BadRequest
    checks = [
        ("activite", "idactivite", p.get("idactivite")),
        ("commande", "idcommande", p.get("idcommande")),
        ("soumissionnaire", "idsoumissionnaire", p.get("idsoumissionnaire")),
        ("personnel", "idpersonnel", p.get("idpersonnel")),
        ("transaction", "idtransaction", p.get("idtransaction")),
        ("projet", "idprojet", p.get("idprojet")),
    ]
    for table, col, val in checks:
        if val is not None and not _fk_exists(session, table, col, val):
            raise BadRequest(f"{col}={val} inexistant dans {table}.")

# ──────────────────────────────────────────────────────────────────────────────
# GET /  — liste avec filtres
# ──────────────────────────────────────────────────────────────────────────────

@bp_evenement.get("/")
def list_evenements():
    """
    List Evenements
    ---
    tags:
      - evenement
    parameters:
      - in: query
        name: q
        description: Recherche plein texte sur type_evenement / description_evenement
        type: string
        required: false
      - in: query
        name: start_from
        description: date_evenement >= start_from (YYYY-MM-DD)
        type: string
        format: date
        required: false
      - in: query
        name: end_to
        description: date_evenement <= end_to (YYYY-MM-DD)
        type: string
        format: date
        required: false
      - in: query
        name: skip
        type: integer
        default: 0
      - in: query
        name: limit
        type: integer
        default: 100
        maximum: 500
    responses:
      200:
        description: Successful Response
        schema:
          type: array
          items:
            type: object
    """
    args = request.args
    where = ["1=1"]
    params: Dict[str, Any] = {}

    q = args.get("q")
    if q:
        where.append("(e.type_evenement LIKE :q OR e.description_evenement LIKE :q)")
        params["q"] = f"%{q}%"

    start_from = args.get("start_from")
    end_to = args.get("end_to")
    if start_from:
        where.append("e.date_evenement >= :dfrom")
        params["dfrom"] = start_from
    if end_to:
        where.append("e.date_evenement <= :dto")
        params["dto"] = end_to

    limit = min(int(args.get("limit", 100)), 500)
    skip = int(args.get("skip", 0))

    sql = f"""
        {_SQL_SELECT}
        WHERE {" AND ".join(where)}
        GROUP BY e.idevenement
        ORDER BY e.idevenement DESC
        LIMIT :limit OFFSET :skip
    """
    params.update({"limit": limit, "skip": skip})

    session: Session = db.session
    rows = session.execute(text(sql), params).mappings().all()
    out = [_iso_row(dict(r), _DATE_FIELDS) for r in rows]
    return jsonify(out)

# ──────────────────────────────────────────────────────────────────────────────
# GET /{idevenement}
# ──────────────────────────────────────────────────────────────────────────────

@bp_evenement.get("/<int:idevenement>")
def get_evenement(idevenement: int):
    """
    Get Evenement
    ---
    tags:
      - evenement
    parameters:
      - in: path
        name: idevenement
        required: true
        type: integer
    responses:
      200:
        description: Successful Response
        schema:
          type: object
      404:
        description: Événement introuvable.
    """
    session: Session = db.session
    obj = _one(session, idevenement)
    if not obj:
        return jsonify({"detail": "Événement introuvable."}), 404
    return jsonify(obj)

# ──────────────────────────────────────────────────────────────────────────────
# POST /  — body JSON (Swagger 2.0: parameter in: body)
# ──────────────────────────────────────────────────────────────────────────────

@bp_evenement.post("/")
def create_evenement():
    """
    Create Evenement
    ---
    tags:
      - evenement
    consumes:
      - application/json
    parameters:
      - in: body
        name: payload
        required: true
        schema:
          type: object
          properties:
            idactivite:         {type: integer}
            idcommande:         {type: integer}
            idsoumissionnaire:  {type: integer}
            idpersonnel:        {type: integer}
            idtransaction:      {type: integer}
            idprojet:           {type: integer}
            type_evenement:     {type: string}
            date_evenement:     {type: string, format: date}
            date_prevue:        {type: string, format: date}
            description_evenement: {type: string}
            statut_evenement:   {type: string}
            date_realisee:      {type: string, format: date}
    responses:
      201:
        description: Successful Response
        schema:
          type: object
      400:
        description: Validation error
    """
    from werkzeug.exceptions import BadRequest

    payload: Dict[str, Any] = request.get_json(silent=True) or {}
    if not payload.get("type_evenement"):
        raise BadRequest("type_evenement est obligatoire.")

    # Normaliser FKs facultatives
    for k in ("idactivite", "idcommande", "idsoumissionnaire",
              "idpersonnel", "idtransaction", "idprojet"):
        payload[k] = _normalize_fk(payload.get(k))

    session: Session = db.session
    _validate_foreign_keys_or_400(session, payload)

    ins = text("""
        INSERT INTO evenement (
          idactivite, idcommande, idsoumissionnaire, idpersonnel, idtransaction, idprojet,
          type_evenement, date_evenement, date_prevue, description_evenement,
          statut_evenement, date_realisee
        ) VALUES (
          :idactivite, :idcommande, :idsoumissionnaire, :idpersonnel, :idtransaction, :idprojet,
          :type_evenement, :date_evenement, :date_prevue, :description_evenement,
          :statut_evenement, :date_realisee
        )
    """)

    result = session.execute(ins, payload)
    new_id = getattr(result, "lastrowid", None)
    if not new_id:
        new_id = session.execute(text("SELECT LAST_INSERT_ID()")).scalar()
    session.commit()

    row = _one(session, int(new_id))
    return jsonify(row), 201

# ──────────────────────────────────────────────────────────────────────────────
# PUT /{idevenement} — body JSON (Swagger 2.0: parameter in: body)
# ──────────────────────────────────────────────────────────────────────────────

@bp_evenement.put("/<int:idevenement>")
def update_evenement(idevenement: int):
    """
    Update Evenement
    ---
    tags:
      - evenement
    consumes:
      - application/json
    parameters:
      - in: path
        name: idevenement
        required: true
        type: integer
      - in: body
        name: payload
        required: true
        schema:
          type: object
          properties:
            idactivite:         {type: integer}
            idcommande:         {type: integer}
            idsoumissionnaire:  {type: integer}
            idpersonnel:        {type: integer}
            idtransaction:      {type: integer}
            idprojet:           {type: integer}
            type_evenement:     {type: string}
            date_evenement:     {type: string, format: date}
            date_prevue:        {type: string, format: date}
            description_evenement: {type: string}
            statut_evenement:   {type: string}
            date_realisee:      {type: string, format: date}
    responses:
      200:
        description: Successful Response
        schema:
          type: object
      404:
        description: Événement introuvable.
      400:
        description: Validation error
    """
    session: Session = db.session
    if not _one(session, idevenement):
        return jsonify({"detail": "Événement introuvable."}), 404

    payload: Dict[str, Any] = request.get_json(silent=True) or {}

    for k in ("idactivite", "idcommande", "idsoumissionnaire",
              "idpersonnel", "idtransaction", "idprojet"):
        payload[k] = _normalize_fk(payload.get(k))

    _validate_foreign_keys_or_400(session, payload)

    upd = text("""
        UPDATE evenement
           SET idactivite = :idactivite,
               idcommande = :idcommande,
               idsoumissionnaire = :idsoumissionnaire,
               idpersonnel = :idpersonnel,
               idtransaction = :idtransaction,
               idprojet = :idprojet,
               type_evenement = :type_evenement,
               date_evenement = :date_evenement,
               date_prevue = :date_prevue,
               description_evenement = :description_evenement,
               statut_evenement = :statut_evenement,
               date_realisee = :date_realisee
         WHERE idevenement = :id
    """)
    payload["id"] = idevenement
    session.execute(upd, payload)
    session.commit()

    row = _one(session, idevenement)
    return jsonify(row)

# ──────────────────────────────────────────────────────────────────────────────
# DELETE /{idevenement}
# ──────────────────────────────────────────────────────────────────────────────

@bp_evenement.delete("/<int:idevenement>")
def delete_evenement(idevenement: int):
    """
    Delete Evenement
    ---
    tags:
      - evenement
    parameters:
      - in: path
        name: idevenement
        required: true
        type: integer
    responses:
      200:
        description: Successful Response
        schema:
          type: object
          properties:
            deleted:
              type: boolean
            idevenement:
              type: integer
            reason:
              type: string
              x-nullable: true
    """
    session: Session = db.session

    # Blocage si lié à au moins un document
    cnt = session.execute(
        text("SELECT COUNT(*) AS c FROM archive WHERE idevenement = :id"),
        {"id": idevenement},
    ).scalar()
    if cnt and int(cnt) > 0:
        return jsonify({
            "deleted": False,
            "idevenement": idevenement,
            "reason": "Impossible de supprimer : événement déjà lié à au moins un document (archive).",
        })

    res = session.execute(
        text("DELETE FROM evenement WHERE idevenement = :id"),
        {"id": idevenement},
    )
    session.commit()
    return jsonify({
        "deleted": res.rowcount > 0,
        "idevenement": idevenement,
        "reason": None if res.rowcount > 0 else "Aucune ligne supprimée.",
    })
