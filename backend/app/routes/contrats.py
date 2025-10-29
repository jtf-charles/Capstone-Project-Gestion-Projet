# app/routes/contrats.py
from __future__ import annotations

from typing import Optional, Dict, Any, List
from datetime import date, datetime
from flask import Blueprint, request, jsonify
from sqlalchemy import text
from app.extensions import db
from flasgger import swag_from

bp_contrats = Blueprint(
    "contrats",
    __name__,
    url_prefix="/api/v1/contrats",
)

# ───────────────────────── Helpers (dates ISO) ─────────────────────────

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

# ───────────────────────── SQL helpers ─────────────────────────

_SQL_JOIN = """
SELECT
  c.idcontrat,
  c.idpersonnel,
  c.date_signature,
  c.date_debut_contrat,
  c.date_fin_contrat,
  c.duree_contrat,
  c.montant_contrat,
  p.nom_personnel
FROM contrat c
LEFT JOIN personnel p ON p.idpersonnel = c.idpersonnel
"""

def _one(cid: int) -> Optional[Dict[str, Any]]:
    row = db.session.execute(
        text(_SQL_JOIN + " WHERE c.idcontrat = :id LIMIT 1"),
        {"id": cid},
    ).mappings().fetchone()
    return _iso_row(dict(row), ["date_signature", "date_debut_contrat", "date_fin_contrat"]) if row else None

def _exists_personnel(idpersonnel: int) -> bool:
    return bool(
        db.session.execute(
            text("SELECT 1 FROM personnel WHERE idpersonnel = :id LIMIT 1"),
            {"id": idpersonnel},
        ).first()
    )

# ───────────────────────── Schemas Swagger (dict) ─────────────────────────

ContratOutSchema = {
    "type": "object",
    "properties": {
        "idcontrat": {"type": "integer"},
        "idpersonnel": {"type": "integer", "nullable": True},
        "date_signature": {"type": "string", "format": "date", "nullable": True},
        "date_debut_contrat": {"type": "string", "format": "date", "nullable": True},
        "date_fin_contrat": {"type": "string", "format": "date", "nullable": True},
        "duree_contrat": {"type": "integer", "nullable": True},
        "montant_contrat": {"type": "number", "nullable": True},
        "nom_personnel": {"type": "string", "nullable": True},
    },
    "required": ["idcontrat"],
}

ContratInSchema = {
    "type": "object",
    "properties": {
        "idpersonnel": {"type": "integer", "nullable": True},
        "date_signature": {"type": "string", "format": "date", "nullable": True},
        "date_debut_contrat": {"type": "string", "format": "date", "nullable": True},
        "date_fin_contrat": {"type": "string", "format": "date", "nullable": True},
        "duree_contrat": {"type": "integer", "nullable": True, "minimum": 0},
        "montant_contrat": {"type": "number", "nullable": True, "minimum": 0},
    },
    "additionalProperties": False,
}

ContratExample = {
    "idpersonnel": 3,
    "date_signature": "2025-10-28",
    "date_debut_contrat": "2025-10-28",
    "date_fin_contrat": "2025-12-31",
    "duree_contrat": 60,
    "montant_contrat": 12500.0
}

# ───────────────────────── Endpoints ─────────────────────────

@bp_contrats.get("/")
@swag_from({
    "tags": ["contrats"],
    "summary": "List Contrats",
    "produces": ["application/json"],
    "parameters": [
        {"in": "query", "name": "idpersonnel", "schema": {"type": "integer"}, "description": "Filtrer par idpersonnel"},
        {"in": "query", "name": "start_from", "schema": {"type": "string", "format": "date"}, "description": "date_debut_contrat >= start_from"},
        {"in": "query", "name": "end_to", "schema": {"type": "string", "format": "date"}, "description": "date_fin_contrat <= end_to"},
        {"in": "query", "name": "min_montant", "schema": {"type": "number"}, "description": "montant_contrat >= min_montant"},
        {"in": "query", "name": "max_montant", "schema": {"type": "number"}, "description": "montant_contrat <= max_montant"},
        {"in": "query", "name": "skip", "schema": {"type": "integer"}, "default": 0},
        {"in": "query", "name": "limit", "schema": {"type": "integer", "maximum": 500}, "default": 100},
    ],
    "responses": {
        "200": {
            "description": "Successful Response",
            "content": {"application/json": {"schema": {"type": "array", "items": ContratOutSchema}}}
        }
    }
})
def list_contrats():
    idpersonnel = request.args.get("idpersonnel", type=int)
    start_from = request.args.get("start_from")
    end_to = request.args.get("end_to")
    min_montant = request.args.get("min_montant")
    max_montant = request.args.get("max_montant")
    skip = request.args.get("skip", default=0, type=int)
    limit = min(request.args.get("limit", default=100, type=int), 500)

    sql = _SQL_JOIN + " WHERE 1=1"
    params: Dict[str, Any] = {}

    if idpersonnel is not None:
        sql += " AND c.idpersonnel = :idpersonnel"
        params["idpersonnel"] = idpersonnel
    if start_from:
        sql += " AND (c.date_debut_contrat IS NULL OR c.date_debut_contrat >= :start_from)"
        params["start_from"] = start_from
    if end_to:
        sql += " AND (c.date_fin_contrat IS NULL OR c.date_fin_contrat <= :end_to)"
        params["end_to"] = end_to
    if min_montant is not None:
        sql += " AND (c.montant_contrat IS NULL OR c.montant_contrat >= :min_montant)"
        params["min_montant"] = min_montant
    if max_montant is not None:
        sql += " AND (c.montant_contrat IS NULL OR c.montant_contrat <= :max_montant)"
        params["max_montant"] = max_montant

    sql += " ORDER BY c.idcontrat DESC LIMIT :limit OFFSET :skip"
    params.update({"limit": limit, "skip": skip})

    rows = db.session.execute(text(sql), params).mappings().all()
    data = [
        _iso_row(dict(r), ["date_signature", "date_debut_contrat", "date_fin_contrat"])
        for r in rows
    ]
    return jsonify(data)


@bp_contrats.get("/<int:idcontrat>")
@swag_from({
    "tags": ["contrats"],
    "summary": "Get Contrat",
    "produces": ["application/json"],
    "parameters": [
        {"in": "path", "name": "idcontrat", "required": True, "schema": {"type": "integer"}}
    ],
    "responses": {
        "200": {"description": "Successful Response", "content": {"application/json": {"schema": ContratOutSchema}}},
        "404": {"description": "Not found"},
    }
})
def get_contrat(idcontrat: int):
    obj = _one(idcontrat)
    if not obj:
        return jsonify({"detail": "Contrat introuvable."}), 404
    return jsonify(obj)


@bp_contrats.post("/")
@swag_from({
    "tags": ["contrats"],
    "summary": "Create Contrat",
    "consumes": ["application/json"],
    "produces": ["application/json"],
    "parameters": [
        {"in": "body", "name": "body", "required": True, "schema": ContratInSchema, "example": ContratExample}
    ],
    "responses": {
        "201": {"description": "Created", "content": {"application/json": {"schema": ContratOutSchema}}},
        "400": {"description": "Bad Request (FK/validation)"},
    }
})
def create_contrat():
    body = request.get_json(silent=True) or {}

    # FK optionnelle (si fournie, doit exister)
    if body.get("idpersonnel") is not None and not _exists_personnel(body["idpersonnel"]):
        return jsonify({"detail": "idpersonnel inexistant."}), 400

    db.session.execute(
        text("""
            INSERT INTO contrat (
                idpersonnel,
                date_signature,
                date_debut_contrat,
                date_fin_contrat,
                duree_contrat,
                montant_contrat
            ) VALUES (
                :idpersonnel,
                :date_signature,
                :date_debut_contrat,
                :date_fin_contrat,
                :duree_contrat,
                :montant_contrat
            )
        """),
        {
            "idpersonnel": body.get("idpersonnel"),
            "date_signature": body.get("date_signature"),
            "date_debut_contrat": body.get("date_debut_contrat"),
            "date_fin_contrat": body.get("date_fin_contrat"),
            "duree_contrat": body.get("duree_contrat"),
            "montant_contrat": body.get("montant_contrat"),
        },
    )
    db.session.commit()

    new_id = db.session.execute(text("SELECT LAST_INSERT_ID() AS id")).mappings().one()["id"]
    out = _one(int(new_id))
    return jsonify(out), 201


@bp_contrats.put("/<int:idcontrat>")
@swag_from({
    "tags": ["contrats"],
    "summary": "Update Contrat",
    "consumes": ["application/json"],
    "produces": ["application/json"],
    "parameters": [
        {"in": "path", "name": "idcontrat", "required": True, "schema": {"type": "integer"}},
        {"in": "body", "name": "body", "required": True, "schema": ContratInSchema, "example": ContratExample},
    ],
    "responses": {
        "200": {"description": "Successful Response", "content": {"application/json": {"schema": ContratOutSchema}}},
        "404": {"description": "Not found"},
        "400": {"description": "Bad Request (FK/validation)"},
    }
})
def update_contrat(idcontrat: int):
    if not _one(idcontrat):
        return jsonify({"detail": "Contrat introuvable."}), 404

    body = request.get_json(silent=True) or {}

    if body.get("idpersonnel") is not None and not _exists_personnel(body["idpersonnel"]):
        return jsonify({"detail": "idpersonnel inexistant."}), 400

    db.session.execute(
        text("""
            UPDATE contrat
               SET idpersonnel        = :idpersonnel,
                   date_signature     = :date_signature,
                   date_debut_contrat = :date_debut_contrat,
                   date_fin_contrat   = :date_fin_contrat,
                   duree_contrat      = :duree_contrat,
                   montant_contrat    = :montant_contrat
             WHERE idcontrat          = :id
        """),
        {
            "id": idcontrat,
            "idpersonnel": body.get("idpersonnel"),
            "date_signature": body.get("date_signature"),
            "date_debut_contrat": body.get("date_debut_contrat"),
            "date_fin_contrat": body.get("date_fin_contrat"),
            "duree_contrat": body.get("duree_contrat"),
            "montant_contrat": body.get("montant_contrat"),
        },
    )
    db.session.commit()
    return jsonify(_one(idcontrat))


@bp_contrats.delete("/<int:idcontrat>")
@swag_from({
    "tags": ["contrats"],
    "summary": "Delete Contrat",
    "produces": ["application/json"],
    "parameters": [
        {"in": "path", "name": "idcontrat", "required": True, "schema": {"type": "integer"}}
    ],
    "responses": {
        "200": {"description": "Successful Response", "content": {"application/json": {"schema": {"type": "string"}}}},
        "404": {"description": "Not found"},
    }
})
def delete_contrat(idcontrat: int):
    res = db.session.execute(
        text("DELETE FROM contrat WHERE idcontrat = :id"),
        {"id": idcontrat},
    )
    db.session.commit()
    if res.rowcount == 0:
        return jsonify("Aucune ligne supprimée."), 404
    return jsonify("OK")
