# app/routes/procedures.py
from __future__ import annotations

from typing import Optional, Dict, Any
from flask import Blueprint, request, jsonify
from sqlalchemy import text
from app.extensions import db
from flasgger import swag_from

bp_procedures = Blueprint(
    "procedures",
    __name__,
    url_prefix="/api/v1/procedures",
)

# ───────────────────────── SQL helpers ─────────────────────────

_SQL_SELECT = """
SELECT
  p.idprocedure,
  p.type_procedure,
  COALESCE(COUNT(c.idcommande), 0) AS nb_commandes
FROM procedure_table p
LEFT JOIN commande c ON c.idprocedure = p.idprocedure
"""

def _one(pid: int) -> Optional[Dict[str, Any]]:
    row = db.session.execute(
        text(_SQL_SELECT + " WHERE p.idprocedure = :id GROUP BY p.idprocedure"),
        {"id": pid},
    ).mappings().fetchone()
    return dict(row) if row else None

# ───────────────────────── Schemas Swagger (dict) ─────────────────────────

ProcedureOutSchema = {
    "type": "object",
    "properties": {
        "idprocedure": {"type": "integer"},
        "type_procedure": {"type": "string"},
        "nb_commandes": {"type": "integer"},
    },
    "required": ["idprocedure", "type_procedure"],
}

ProcedureInSchema = {
    "type": "object",
    "properties": {
        "type_procedure": {"type": "string"},
    },
    "required": ["type_procedure"],
    "additionalProperties": False,
}

ProcedureExample = {"type_procedure": "Appel d'offres ouvert"}

# ───────────────────────── Endpoints ─────────────────────────

@bp_procedures.get("/")
@swag_from({
    "tags": ["procedures"],
    "summary": "List Procedures",
    "produces": ["application/json"],
    "parameters": [
        {"in": "query", "name": "q", "schema": {"type": "string"}, "description": "Recherche partielle sur type_procedure"},
        {"in": "query", "name": "skip", "schema": {"type": "integer"}, "default": 0},
        {"in": "query", "name": "limit", "schema": {"type": "integer", "maximum": 500}, "default": 100},
    ],
    "responses": {
        "200": {"description": "Successful Response",
                "content": {"application/json": {"schema": {"type": "array", "items": ProcedureOutSchema}}}}
    }
})
def list_procedures():
    q = request.args.get("q")
    skip = request.args.get("skip", default=0, type=int)
    limit = min(request.args.get("limit", default=100, type=int), 500)

    sql = _SQL_SELECT + " WHERE 1=1"
    params: Dict[str, Any] = {}

    if q:
        sql += " AND p.type_procedure LIKE :q"
        params["q"] = f"%{q}%"

    sql += " GROUP BY p.idprocedure ORDER BY p.idprocedure DESC LIMIT :limit OFFSET :skip"
    params.update({"limit": limit, "skip": skip})

    rows = db.session.execute(text(sql), params).mappings().all()
    return jsonify([dict(r) for r in rows])


@bp_procedures.get("/<int:idprocedure>")
@swag_from({
    "tags": ["procedures"],
    "summary": "Get Procedure",
    "produces": ["application/json"],
    "parameters": [
        {"in": "path", "name": "idprocedure", "required": True, "schema": {"type": "integer"}}
    ],
    "responses": {
        "200": {"description": "Successful Response",
                "content": {"application/json": {"schema": ProcedureOutSchema}}},
        "404": {"description": "Not found"},
    }
})
def get_procedure(idprocedure: int):
    obj = _one(idprocedure)
    if not obj:
        return jsonify({"detail": "Procédure introuvable."}), 404
    return jsonify(obj)


@bp_procedures.post("/")
@swag_from({
    "tags": ["procedures"],
    "summary": "Create Procedure",
    "consumes": ["application/json"],
    "produces": ["application/json"],
    "parameters": [
        {"in": "body", "name": "body", "required": True, "schema": ProcedureInSchema, "example": ProcedureExample}
    ],
    "responses": {
        "201": {"description": "Created",
                "content": {"application/json": {"schema": ProcedureOutSchema}}},
        "400": {"description": "Bad Request"},
    }
})
def create_procedure():
    body = request.get_json(silent=True) or {}
    type_proc = (body.get("type_procedure") or "").strip()
    if not type_proc:
        return jsonify({"detail": "type_procedure est obligatoire."}), 400

    db.session.execute(
        text("INSERT INTO procedure_table (type_procedure) VALUES (:type_procedure)"),
        {"type_procedure": type_proc},
    )
    db.session.commit()

    new_id = db.session.execute(text("SELECT LAST_INSERT_ID() AS id")).mappings().one()["id"]
    out = _one(int(new_id))
    return jsonify(out), 201


@bp_procedures.put("/<int:idprocedure>")
@swag_from({
    "tags": ["procedures"],
    "summary": "Update Procedure",
    "consumes": ["application/json"],
    "produces": ["application/json"],
    "parameters": [
        {"in": "path", "name": "idprocedure", "required": True, "schema": {"type": "integer"}},
        {"in": "body", "name": "body", "required": True, "schema": ProcedureInSchema, "example": ProcedureExample},
    ],
    "responses": {
        "200": {"description": "Successful Response",
                "content": {"application/json": {"schema": ProcedureOutSchema}}},
        "404": {"description": "Not found"},
        "400": {"description": "Bad Request"},
    }
})
def update_procedure(idprocedure: int):
    if not _one(idprocedure):
        return jsonify({"detail": "Procédure introuvable."}), 404

    body = request.get_json(silent=True) or {}
    type_proc = (body.get("type_procedure") or "").strip()
    if not type_proc:
        return jsonify({"detail": "type_procedure est obligatoire."}), 400

    db.session.execute(
        text("""
            UPDATE procedure_table
               SET type_procedure = :type_procedure
             WHERE idprocedure   = :id
        """),
        {"type_procedure": type_proc, "id": idprocedure},
    )
    db.session.commit()
    return jsonify(_one(idprocedure))


@bp_procedures.delete("/<int:idprocedure>")
@swag_from({
    "tags": ["procedures"],
    "summary": "Delete Procedure",
    "produces": ["application/json"],
    "parameters": [
        {"in": "path", "name": "idprocedure", "required": True, "schema": {"type": "integer"}}
    ],
    "responses": {
        "200": {"description": "Successful Response",
                "content": {"application/json": {"schema": {"type": "string"}}}},
        "422": {"description": "Validation Error"},
    }
})
def delete_procedure(idprocedure: int):
    # règle métier: interdire s'il y a des commandes liées
    cnt = db.session.execute(
        text("SELECT COUNT(*) AS c FROM commande WHERE idprocedure = :id"),
        {"id": idprocedure},
    ).scalar()
    if cnt and int(cnt) > 0:
        return jsonify("Impossible de supprimer : des commandes sont associées à cette procédure."), 422

    res = db.session.execute(
        text("DELETE FROM procedure_table WHERE idprocedure = :id"),
        {"id": idprocedure},
    )
    db.session.commit()
    if res.rowcount == 0:
        return jsonify("Aucune ligne supprimée."), 404
    return jsonify("OK")
