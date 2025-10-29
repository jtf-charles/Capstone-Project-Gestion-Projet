# app/routes/responsabilites.py
from __future__ import annotations
from typing import Optional, Dict, Any, List
from flask import Blueprint, request, jsonify
from sqlalchemy import text
from app.extensions import db
from flasgger import swag_from

bp_responsabilites = Blueprint(
    "responsabilites",
    __name__,
    url_prefix="/api/v1/responsabilites",
)

# ───────────── Helpers ─────────────

_SQL_SELECT_JOIN = """
SELECT
  r.idresponsabilites,
  r.idactivite,
  r.idpersonnel,
  r.date_debut_act,
  r.date_fin_act,
  a.titre_act,
  p.nom_personnel
FROM responsabilites r
LEFT JOIN activite  a ON a.idactivite  = r.idactivite
JOIN personnel      p ON p.idpersonnel = r.idpersonnel
"""

def _iso_dates(row: Dict[str, Any], fields: List[str]) -> Dict[str, Any]:
    """Force les dates en 'YYYY-MM-DD'."""
    out = dict(row)
    for f in fields:
        v = out.get(f)
        if v is None:
            continue
        # v peut être date, datetime, ou string -> on normalise
        try:
            out[f] = getattr(v, "date", lambda: v)() if hasattr(v, "time") else v
            out[f] = getattr(out[f], "isoformat", lambda: str(out[f]))()
        except Exception:
            # dernier recours : garder tel quel
            out[f] = str(v)
    return out

def _get_one(rid: int) -> Optional[Dict[str, Any]]:
    row = db.session.execute(
        text(_SQL_SELECT_JOIN + " WHERE r.idresponsabilites = :id LIMIT 1"),
        {"id": rid},
    ).mappings().fetchone()
    return _iso_dates(dict(row), ["date_debut_act", "date_fin_act"]) if row else None

def _exists_personnel(idpersonnel: int) -> bool:
    return bool(
        db.session.execute(
            text("SELECT 1 FROM personnel WHERE idpersonnel = :id LIMIT 1"),
            {"id": idpersonnel},
        ).first()
    )

def _exists_activite(idactivite: int) -> bool:
    return bool(
        db.session.execute(
            text("SELECT 1 FROM activite WHERE idactivite = :id LIMIT 1"),
            {"id": idactivite},
        ).first()
    )

def _validate_input(payload: Dict[str, Any]) -> Optional[str]:
    idpersonnel = payload.get("idpersonnel")
    if idpersonnel is None or not isinstance(idpersonnel, int) or idpersonnel <= 0:
        return "idpersonnel est obligatoire et doit être > 0."
    d1 = payload.get("date_debut_act")
    d2 = payload.get("date_fin_act")
    if d1 and d2 and str(d1) > str(d2):
        return "date_fin_act doit être >= date_debut_act."
    return None

# ───────────── Schemas Swagger ─────────────

ResponsabiliteOutSchema = {
    "type": "object",
    "properties": {
        "idresponsabilites": {"type": "integer"},
        "idactivite": {"type": "integer", "nullable": True},
        "idpersonnel": {"type": "integer"},
        "date_debut_act": {"type": "string", "format": "date", "nullable": True},
        "date_fin_act": {"type": "string", "format": "date", "nullable": True},
        "titre_act": {"type": "string", "nullable": True},
        "nom_personnel": {"type": "string", "nullable": True},
    },
    "required": ["idresponsabilites", "idpersonnel"],
}

ResponsabiliteInSchema = {
    "type": "object",
    "properties": {
        "idactivite": {"type": "integer", "nullable": True},
        "idpersonnel": {"type": "integer"},
        "date_debut_act": {"type": "string", "format": "date", "nullable": True},
        "date_fin_act": {"type": "string", "format": "date", "nullable": True},
    },
    "required": ["idpersonnel"],
    "additionalProperties": False,
}

ResponsabiliteExample = {
    "idactivite": 1,
    "idpersonnel": 3,
    "date_debut_act": "2025-10-28",
    "date_fin_act": "2025-11-15"
}

# ───────────── Endpoints ─────────────

@bp_responsabilites.get("/")
@swag_from({
    "tags": ["responsabilites"],
    "summary": "List Responsabilites",
    "produces": ["application/json"],
    "parameters": [
        {"in": "query", "name": "idactivite", "schema": {"type": "integer"}, "description": "Filtrer par idactivite"},
        {"in": "query", "name": "idpersonnel", "schema": {"type": "integer"}, "description": "Filtrer par idpersonnel"},
        {"in": "query", "name": "start_from", "schema": {"type": "string", "format": "date"}, "description": "date_debut_act >= start_from"},
        {"in": "query", "name": "end_to", "schema": {"type": "string", "format": "date"}, "description": "date_fin_act <= end_to"},
        {"in": "query", "name": "skip", "schema": {"type": "integer"}, "default": 0},
        {"in": "query", "name": "limit", "schema": {"type": "integer", "maximum": 500}, "default": 100},
    ],
})
def list_responsabilites():
    idactivite = request.args.get("idactivite", type=int)
    idpersonnel = request.args.get("idpersonnel", type=int)
    start_from = request.args.get("start_from")
    end_to = request.args.get("end_to")
    skip = request.args.get("skip", default=0, type=int)
    limit = min(request.args.get("limit", default=100, type=int), 500)

    sql = _SQL_SELECT_JOIN + " WHERE 1=1"
    params: Dict[str, Any] = {}

    if idactivite is not None:
        sql += " AND r.idactivite = :idactivite"
        params["idactivite"] = idactivite
    if idpersonnel is not None:
        sql += " AND r.idpersonnel = :idpersonnel"
        params["idpersonnel"] = idpersonnel
    if start_from:
        sql += " AND (r.date_debut_act IS NULL OR r.date_debut_act >= :start_from)"
        params["start_from"] = start_from
    if end_to:
        sql += " AND (r.date_fin_act IS NULL OR r.date_fin_act <= :end_to)"
        params["end_to"] = end_to

    sql += " ORDER BY r.idresponsabilites DESC LIMIT :limit OFFSET :skip"
    params.update({"limit": limit, "skip": skip})

    rows = db.session.execute(text(sql), params).mappings().all()
    data = [_iso_dates(dict(r), ["date_debut_act", "date_fin_act"]) for r in rows]
    return jsonify(data)

@bp_responsabilites.get("/<int:idresponsabilites>")
@swag_from({
    "tags": ["responsabilites"],
    "summary": "Get Responsabilite",
    "parameters": [
        {"in": "path", "name": "idresponsabilites", "required": True, "schema": {"type": "integer"}},
    ],
})
def get_responsabilite(idresponsabilites: int):
    obj = _get_one(idresponsabilites)
    if not obj:
        return jsonify({"detail": "Responsabilite introuvable."}), 404
    return jsonify(obj)

@bp_responsabilites.post("/")
@swag_from({
    "tags": ["responsabilites"],
    "summary": "Create Responsabilite",
    "consumes": ["application/json"],
    "produces": ["application/json"],
    "parameters": [
        {"in": "body", "name": "body", "required": True, "schema": ResponsabiliteInSchema, "example": ResponsabiliteExample}
    ],
})
def create_responsabilite():
    body = request.get_json(silent=True) or {}

    msg = _validate_input(body)
    if msg:
        return jsonify({"detail": msg}), 400

    if not _exists_personnel(body["idpersonnel"]):
        return jsonify({"detail": "idpersonnel inexistant."}), 400
    if body.get("idactivite") is not None and not _exists_activite(body["idactivite"]):
        return jsonify({"detail": "idactivite inexistante."}), 400

    db.session.execute(
        text("""
            INSERT INTO responsabilites (
                idactivite, idpersonnel, date_debut_act, date_fin_act
            ) VALUES (:idactivite, :idpersonnel, :date_debut_act, :date_fin_act)
        """),
        {
            "idactivite": body.get("idactivite"),
            "idpersonnel": body["idpersonnel"],
            "date_debut_act": body.get("date_debut_act"),
            "date_fin_act": body.get("date_fin_act"),
        },
    )
    db.session.commit()

    new_id = db.session.execute(text("SELECT LAST_INSERT_ID() AS id")).mappings().one()["id"]
    return jsonify(_get_one(int(new_id))), 201

@bp_responsabilites.put("/<int:idresponsabilites>")
@swag_from({
    "tags": ["responsabilites"],
    "summary": "Update Responsabilite",
    "consumes": ["application/json"],
    "produces": ["application/json"],
    "parameters": [
        {"in": "path", "name": "idresponsabilites", "required": True, "schema": {"type": "integer"}},
        {"in": "body", "name": "body", "required": True, "schema": ResponsabiliteInSchema, "example": ResponsabiliteExample},
    ],
})
def update_responsabilite(idresponsabilites: int):
    if not _get_one(idresponsabilites):
        return jsonify({"detail": "Responsabilite introuvable."}), 404

    body = request.get_json(silent=True) or {}
    msg = _validate_input(body)
    if msg:
        return jsonify({"detail": msg}), 400

    if not _exists_personnel(body["idpersonnel"]):
        return jsonify({"detail": "idpersonnel inexistant."}), 400
    if body.get("idactivite") is not None and not _exists_activite(body["idactivite"]):
        return jsonify({"detail": "idactivite inexistante."}), 400

    db.session.execute(
        text("""
            UPDATE responsabilites
               SET idactivite = :idactivite,
                   idpersonnel = :idpersonnel,
                   date_debut_act = :date_debut_act,
                   date_fin_act = :date_fin_act
             WHERE idresponsabilites = :id
        """),
        {
            "id": idresponsabilites,
            "idactivite": body.get("idactivite"),
            "idpersonnel": body["idpersonnel"],
            "date_debut_act": body.get("date_debut_act"),
            "date_fin_act": body.get("date_fin_act"),
        },
    )
    db.session.commit()
    return jsonify(_get_one(idresponsabilites))

@bp_responsabilites.delete("/<int:idresponsabilites>")
@swag_from({
    "tags": ["responsabilites"],
    "summary": "Delete Responsabilite",
    "produces": ["application/json"],
    "parameters": [
        {"in": "path", "name": "idresponsabilites", "required": True, "schema": {"type": "integer"}},
    ],
})
def delete_responsabilite(idresponsabilites: int):
    res = db.session.execute(
        text("DELETE FROM responsabilites WHERE idresponsabilites = :id"),
        {"id": idresponsabilites},
    )
    db.session.commit()
    deleted = res.rowcount > 0
    return jsonify({
        "deleted": deleted,
        "idresponsabilites": idresponsabilites,
        "reason": None if deleted else "Aucune ligne supprimée.",
    }), (200 if deleted else 404)
