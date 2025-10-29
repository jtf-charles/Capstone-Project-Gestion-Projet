# app/routes/soumissionnaires.py
from __future__ import annotations

from typing import Optional, Dict, Any, List
from flask import Blueprint, request, jsonify
from sqlalchemy import text
from flasgger import swag_from
from app.extensions import db

bp_soumissionnaires = Blueprint(
    "soumissionnaires",
    __name__,
    url_prefix="/api/v1/soumissionnaires",
)

# ──────────────────────────────────────────────────────────────────────────────
# SQL helpers
# ──────────────────────────────────────────────────────────────────────────────

_SQL_SELECT = """
SELECT
  s.idsoumissionnaire,
  s.nom_Soum,
  s.nif_soum,
  s.adresse_soum,
  s.telephone_soum,
  s.statut_soum,
  s.email_soum,
  COALESCE(COUNT(so.idsoumission), 0) AS nb_soumissions
FROM soumissionnaire s
LEFT JOIN soumission so
  ON so.idsoumissionnaire = s.idsoumissionnaire
"""

def _one(sid: int) -> Optional[Dict[str, Any]]:
    row = db.session.execute(
        text(_SQL_SELECT + " WHERE s.idsoumissionnaire = :id GROUP BY s.idsoumissionnaire"),
        {"id": sid},
    ).mappings().fetchone()
    return dict(row) if row else None


# ──────────────────────────────────────────────────────────────────────────────
# Schemas (pour Swagger)
# ──────────────────────────────────────────────────────────────────────────────

SoumissionnaireOutSchema = {
    "type": "object",
    "properties": {
        "idsoumissionnaire": {"type": "integer"},
        "nom_Soum": {"type": "string"},
        "nif_soum": {"type": "string", "nullable": True},
        "adresse_soum": {"type": "string", "nullable": True},
        "telephone_soum": {"type": "string", "nullable": True},
        "statut_soum": {"type": "string", "nullable": True},
        "email_soum": {"type": "string", "nullable": True},
        "nb_soumissions": {"type": "integer"},
    },
    "required": ["idsoumissionnaire", "nom_Soum"],
}

SoumissionnaireInSchema = {
    "type": "object",
    "properties": {
        "nom_Soum": {"type": "string"},
        "nif_soum": {"type": "string"},
        "adresse_soum": {"type": "string"},
        "telephone_soum": {"type": "string"},
        "statut_soum": {"type": "string"},
        "email_soum": {"type": "string"},
    },
    "required": ["nom_Soum"],
    "additionalProperties": False,
}

SoumissionnaireCreateExample = {
    "nom_Soum": "ACME S.A.",
    "nif_soum": "001-234-567-8",
    "adresse_soum": "Delmas 33",
    "telephone_soum": "509-33-33-3333",
    "statut_soum": "actif",
    "email_soum": "contact@acme.ht",
}

# ──────────────────────────────────────────────────────────────────────────────
# Endpoints
# ──────────────────────────────────────────────────────────────────────────────

@bp_soumissionnaires.get("/")
@swag_from({
    "tags": ["soumissionnaires"],
    "summary": "List Soumissionnaires",
    "parameters": [
        {
            "in": "query", "name": "q", "schema": {"type": "string"},
            "description": "Recherche sur nom_Soum / NIF / email / téléphone / statut / adresse"
        },
        {"in": "query", "name": "skip", "schema": {"type": "integer"}, "default": 0},
        {"in": "query", "name": "limit", "schema": {"type": "integer", "maximum": 500}, "default": 100},
    ],
    "responses": {
        "200": {
            "description": "Successful Response",
            "content": {"application/json": {"schema": {"type": "array", "items": SoumissionnaireOutSchema}}},
        }
    }
})
def list_soumissionnaires():
    q = request.args.get("q")
    skip = request.args.get("skip", default=0, type=int)
    limit = min(request.args.get("limit", default=100, type=int), 500)

    sql = _SQL_SELECT + " WHERE 1=1"
    params: Dict[str, Any] = {}

    if q:
        sql += """
          AND (
            s.nom_Soum       LIKE :q OR
            s.nif_soum       LIKE :q OR
            s.email_soum     LIKE :q OR
            s.telephone_soum LIKE :q OR
            s.statut_soum    LIKE :q OR
            s.adresse_soum   LIKE :q
          )
        """
        params["q"] = f"%{q}%"

    sql += " GROUP BY s.idsoumissionnaire ORDER BY s.idsoumissionnaire DESC LIMIT :limit OFFSET :skip"
    params.update({"limit": limit, "skip": skip})

    rows = db.session.execute(text(sql), params).mappings().all()
    return jsonify([dict(r) for r in rows])


@bp_soumissionnaires.get("/<int:idsoumissionnaire>")
@swag_from({
    "tags": ["soumissionnaires"],
    "summary": "Get Soumissionnaire",
    "parameters": [
        {"in": "path", "name": "idsoumissionnaire", "required": True, "schema": {"type": "integer"}}
    ],
    "responses": {
        "200": {"description": "Successful Response", "content": {"application/json": {"schema": SoumissionnaireOutSchema}}},
        "404": {"description": "Not found"},
    }
})
def get_soumissionnaire(idsoumissionnaire: int):
    row = _one(idsoumissionnaire)
    if not row:
        return jsonify({"detail": "Soumissionnaire introuvable."}), 404
    return jsonify(row)


@bp_soumissionnaires.post("/")
@swag_from({
    "tags": ["soumissionnaires"],
    "summary": "Create Soumissionnaire",
    "consumes": ["application/json"],
    "produces": ["application/json"],
    "parameters": [
        {"in": "body", "name": "body", "required": True, "schema": SoumissionnaireInSchema, "example": SoumissionnaireCreateExample}
    ],
    "responses": {
        "201": {"description": "Created", "content": {"application/json": {"schema": SoumissionnaireOutSchema}}},
        "400": {"description": "Bad Request (validation)"},
    }
})
def create_soumissionnaire():
    body = request.get_json(silent=True) or {}
    nom = (body.get("nom_Soum") or "").strip()
    if not nom:
        return jsonify({"detail": "nom_Soum est obligatoire."}), 400

    db.session.execute(
        text("""
            INSERT INTO soumissionnaire
              (nom_Soum, nif_soum, adresse_soum, telephone_soum, statut_soum, email_soum)
            VALUES
              (:nom_Soum, :nif_soum, :adresse_soum, :telephone_soum, :statut_soum, :email_soum)
        """),
        {
            "nom_Soum": nom,
            "nif_soum": body.get("nif_soum"),
            "adresse_soum": body.get("adresse_soum"),
            "telephone_soum": body.get("telephone_soum"),
            "statut_soum": body.get("statut_soum"),
            "email_soum": body.get("email_soum"),
        },
    )
    db.session.commit()
    new_id = db.session.execute(text("SELECT LAST_INSERT_ID() AS id")).mappings().one()["id"]
    return jsonify(_one(int(new_id))), 201


@bp_soumissionnaires.put("/<int:idsoumissionnaire>")
@swag_from({
    "tags": ["soumissionnaires"],
    "summary": "Update Soumissionnaire",
    "consumes": ["application/json"],
    "produces": ["application/json"],
    "parameters": [
        {"in": "path", "name": "idsoumissionnaire", "required": True, "schema": {"type": "integer"}},
        {"in": "body", "name": "body", "required": True, "schema": SoumissionnaireInSchema, "example": SoumissionnaireCreateExample}
    ],
    "responses": {
        "200": {"description": "Successful Response", "content": {"application/json": {"schema": SoumissionnaireOutSchema}}},
        "400": {"description": "Bad Request (validation)"},
        "404": {"description": "Not found"},
    }
})
def update_soumissionnaire(idsoumissionnaire: int):
    if not _one(idsoumissionnaire):
        return jsonify({"detail": "Soumissionnaire introuvable."}), 404

    body = request.get_json(silent=True) or {}
    nom = (body.get("nom_Soum") or "").strip()
    if not nom:
        return jsonify({"detail": "nom_Soum est obligatoire."}), 400

    db.session.execute(
        text("""
            UPDATE soumissionnaire
               SET nom_Soum       = :nom_Soum,
                   nif_soum       = :nif_soum,
                   adresse_soum   = :adresse_soum,
                   telephone_soum = :telephone_soum,
                   statut_soum    = :statut_soum,
                   email_soum     = :email_soum
             WHERE idsoumissionnaire = :id
        """),
        {
            "id": idsoumissionnaire,
            "nom_Soum": nom,
            "nif_soum": body.get("nif_soum"),
            "adresse_soum": body.get("adresse_soum"),
            "telephone_soum": body.get("telephone_soum"),
            "statut_soum": body.get("statut_soum"),
            "email_soum": body.get("email_soum"),
        },
    )
    db.session.commit()
    return jsonify(_one(idsoumissionnaire))


@bp_soumissionnaires.delete("/<int:idsoumissionnaire>")
@swag_from({
    "tags": ["soumissionnaires"],
    "summary": "Delete Soumissionnaire",
    "parameters": [
        {"in": "path", "name": "idsoumissionnaire", "required": True, "schema": {"type": "integer"}},
    ],
    "responses": {
        "200": {"description": "Successful Response", "content": {"application/json": {"schema": {"type": "object"}}}},
    }
})
def delete_soumissionnaire(idsoumissionnaire: int):
    # règle métier : interdire la suppression si des soumissions sont liées
    cnt = db.session.execute(
        text("SELECT COUNT(*) AS c FROM soumission WHERE idsoumissionnaire = :id"),
        {"id": idsoumissionnaire},
    ).scalar()
    if cnt and int(cnt) > 0:
        return jsonify({
            "deleted": False,
            "idsoumissionnaire": idsoumissionnaire,
            "reason": "Impossible de supprimer : des soumissions sont associées à ce soumissionnaire.",
        })

    res = db.session.execute(
        text("DELETE FROM soumissionnaire WHERE idsoumissionnaire = :id"),
        {"id": idsoumissionnaire},
    )
    db.session.commit()
    return jsonify({
        "deleted": res.rowcount > 0,
        "idsoumissionnaire": idsoumissionnaire,
        "reason": None if res.rowcount > 0 else "Aucune ligne supprimée.",
    })
