# app/routes/soumissions.py
from __future__ import annotations

from typing import Optional, Dict, Any, List
from flask import Blueprint, request, jsonify
from sqlalchemy import text
from app.extensions import db
from flasgger import swag_from
from datetime import date, datetime

bp_soumissions = Blueprint(
    "soumissions",
    __name__,
    url_prefix="/api/v1/soumissions",
)

# ──────────────────────────────────────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────────────────────────────────────

def _to_iso_date(v) -> Optional[str]:
    """Retourne une date formatée 'YYYY-MM-DD' (ou None). Supporte date/datetime/str."""
    if v is None:
        return None
    # objets date/datetime
    if isinstance(v, datetime):
        return v.date().isoformat()
    if isinstance(v, date):
        return v.isoformat()
    # chaînes : on garde les 10 premiers caractères s'ils correspondent au pattern
    s = str(v)
    # cas 'YYYY-MM-DD ...' ou 'YYYY-MM-DDTHH:MM:SS'
    if len(s) >= 10 and s[4] == "-" and s[7] == "-":
        return s[:10]
    # dernier recours : essaye un parse très tolérant
    try:
        # beaucoup de drivers renvoient déjà 'YYYY-MM-DD HH:MM:SS' → on tronque
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

_SQL_JOIN = """
SELECT
  s.idsoumission,
  s.idsoumissionnaire,
  s.idcommande,
  s.date_soumission,
  s.statut_soumission,
  sn.nom_Soum,
  c.libelle_commande
FROM soumission s
LEFT JOIN soumissionnaire sn ON sn.idsoumissionnaire = s.idsoumissionnaire
JOIN commande c              ON c.idcommande        = s.idcommande
"""

def _one(sid: int) -> Optional[Dict[str, Any]]:
    row = db.session.execute(
        text(_SQL_JOIN + " WHERE s.idsoumission = :id LIMIT 1"),
        {"id": sid},
    ).mappings().fetchone()
    return _iso_row(dict(row), ["date_soumission"]) if row else None

def _exists_commande(idcommande: int) -> bool:
    return bool(
        db.session.execute(
            text("SELECT 1 FROM commande WHERE idcommande = :id LIMIT 1"),
            {"id": idcommande},
        ).first()
    )

def _exists_soumissionnaire(idsoumissionnaire: int) -> bool:
    return bool(
        db.session.execute(
            text("SELECT 1 FROM soumissionnaire WHERE idsoumissionnaire = :id LIMIT 1"),
            {"id": idsoumissionnaire},
        ).first()
    )

# ──────────────────────────────────────────────────────────────────────────────
# Schemas (réutilisés dans la doc)
# ──────────────────────────────────────────────────────────────────────────────

SoumissionOutSchema = {
    "type": "object",
    "properties": {
        "idsoumission": {"type": "integer"},
        "idsoumissionnaire": {"type": "integer", "nullable": True},
        "idcommande": {"type": "integer"},
        "date_soumission": {"type": "string", "format": "date"},
        "statut_soumission": {"type": "string"},
        "nom_Soum": {"type": "string", "nullable": True},
        "libelle_commande": {"type": "string", "nullable": True},
    },
    "required": ["idsoumission", "idcommande", "date_soumission", "statut_soumission"],
}

SoumissionInSchema = {
    "type": "object",
    "properties": {
        "idsoumissionnaire": {"type": "integer", "nullable": True},
        "idcommande": {"type": "integer"},
        "date_soumission": {"type": "string", "format": "date"},
        "statut_soumission": {"type": "string", "default": "en cours"},
    },
    "required": ["idcommande", "date_soumission"],
    "additionalProperties": False,
}

SoumissionCreateExample = {
    "idsoumissionnaire": 1,
    "idcommande": 5,
    "date_soumission": "2025-10-28",
    "statut_soumission": "en cours",
}

# ──────────────────────────────────────────────────────────────────────────────
# Endpoints
# ──────────────────────────────────────────────────────────────────────────────

@bp_soumissions.get("/")
@swag_from({
    "tags": ["soumissions"],
    "summary": "List Soumissions",
    "produces": ["application/json"],
    "parameters": [
        {"in": "query", "name": "idsoumissionnaire", "schema": {"type": "integer"}, "description": "Filtrer par idsoumissionnaire"},
        {"in": "query", "name": "idcommande", "schema": {"type": "integer"}, "description": "Filtrer par idcommande"},
        {"in": "query", "name": "statut", "schema": {"type": "string"}, "description": "Filtrer par statut_soumission"},
        {"in": "query", "name": "start_from", "schema": {"type": "string", "format": "date"}, "description": "date_soumission >= start_from"},
        {"in": "query", "name": "end_to", "schema": {"type": "string", "format": "date"}, "description": "date_soumission <= end_to"},
        {"in": "query", "name": "skip", "schema": {"type": "integer"}, "default": 0},
        {"in": "query", "name": "limit", "schema": {"type": "integer", "maximum": 500}, "default": 100},
    ],
    "responses": {
        "200": {
            "description": "Successful Response",
            "content": {"application/json": {"schema": {"type": "array", "items": SoumissionOutSchema}}}
        }
    }
})
def list_soumissions():
    idsoumissionnaire = request.args.get("idsoumissionnaire", type=int)
    idcommande = request.args.get("idcommande", type=int)
    statut = request.args.get("statut")
    start_from = request.args.get("start_from")
    end_to = request.args.get("end_to")
    skip = request.args.get("skip", default=0, type=int)
    limit = min(request.args.get("limit", default=100, type=int), 500)

    sql = _SQL_JOIN + " WHERE 1=1"
    params: Dict[str, Any] = {}

    if idsoumissionnaire is not None:
        sql += " AND s.idsoumissionnaire = :idsoumissionnaire"
        params["idsoumissionnaire"] = idsoumissionnaire
    if idcommande is not None:
        sql += " AND s.idcommande = :idcommande"
        params["idcommande"] = idcommande
    if statut:
        sql += " AND s.statut_soumission = :statut"
        params["statut"] = statut
    if start_from:
        sql += " AND s.date_soumission >= :start_from"
        params["start_from"] = start_from
    if end_to:
        sql += " AND s.date_soumission <= :end_to"
        params["end_to"] = end_to

    sql += " ORDER BY s.idsoumission DESC LIMIT :limit OFFSET :skip"
    params.update({"limit": limit, "skip": skip})

    rows = db.session.execute(text(sql), params).mappings().all()
    data = [_iso_row(dict(r), ["date_soumission"]) for r in rows]
    return jsonify(data)


@bp_soumissions.get("/<int:idsoumission>")
@swag_from({
    "tags": ["soumissions"],
    "summary": "Get Soumission",
    "produces": ["application/json"],
    "parameters": [
        {"in": "path", "name": "idsoumission", "required": True, "schema": {"type": "integer"}}
    ],
    "responses": {
        "200": {"description": "Successful Response", "content": {"application/json": {"schema": SoumissionOutSchema}}},
        "404": {"description": "Not found"},
    }
})
def get_soumission(idsoumission: int):
    obj = _one(idsoumission)
    if not obj:
        return jsonify({"detail": "Soumission introuvable."}), 404
    return jsonify(obj)


@bp_soumissions.post("/")
@swag_from({
    "tags": ["soumissions"],
    "summary": "Create Soumission",
    "consumes": ["application/json"],
    "produces": ["application/json"],
    "parameters": [
        {
            "in": "body",
            "name": "body",
            "required": True,
            "schema": SoumissionInSchema,
            "example": SoumissionCreateExample
        }
    ],
    "responses": {
        "201": {"description": "Created", "content": {"application/json": {"schema": SoumissionOutSchema}}},
        "400": {"description": "Bad Request (FK/validation)"},
    }
})
def create_soumission():
    body = request.get_json(silent=True) or {}

    idcommande = body.get("idcommande")
    if idcommande is None or not _exists_commande(idcommande):
        return jsonify({"detail": "idcommande inexistant."}), 400

    idsoumissionnaire = body.get("idsoumissionnaire")
    if idsoumissionnaire is not None and not _exists_soumissionnaire(idsoumissionnaire):
        return jsonify({"detail": "idsoumissionnaire inexistant."}), 400

    db.session.execute(
        text("""
            INSERT INTO soumission (
                idsoumissionnaire,
                idcommande,
                date_soumission,
                statut_soumission
            ) VALUES (
                :idsoumissionnaire,
                :idcommande,
                :date_soumission,
                :statut_soumission
            )
        """),
        {
            "idsoumissionnaire": idsoumissionnaire,
            "idcommande": idcommande,
            "date_soumission": body.get("date_soumission"),
            "statut_soumission": body.get("statut_soumission", "en cours"),
        },
    )
    db.session.commit()

    new_id = db.session.execute(text("SELECT LAST_INSERT_ID() AS id")).mappings().one()["id"]
    out = _one(int(new_id))  # _one() renvoie déjà la date normalisée
    return jsonify(out), 201


@bp_soumissions.put("/<int:idsoumission>")
@swag_from({
    "tags": ["soumissions"],
    "summary": "Update Soumission",
    "consumes": ["application/json"],
    "produces": ["application/json"],
    "parameters": [
        {"in": "path", "name": "idsoumission", "required": True, "schema": {"type": "integer"}},
        {
            "in": "body",
            "name": "body",
            "required": True,
            "schema": SoumissionInSchema,
            "example": SoumissionCreateExample
        }
    ],
    "responses": {
        "200": {"description": "Successful Response", "content": {"application/json": {"schema": SoumissionOutSchema}}},
        "404": {"description": "Not found"},
        "400": {"description": "Bad Request (FK/validation)"},
    }
})
def update_soumission(idsoumission: int):
    if not _one(idsoumission):
        return jsonify({"detail": "Soumission introuvable."}), 404

    body = request.get_json(silent=True) or {}

    idcommande = body.get("idcommande")
    if idcommande is None or not _exists_commande(idcommande):
        return jsonify({"detail": "idcommande inexistant."}), 400

    idsoumissionnaire = body.get("idsoumissionnaire")
    if idsoumissionnaire is not None and not _exists_soumissionnaire(idsoumissionnaire):
        return jsonify({"detail": "idsoumissionnaire inexistant."}), 400

    db.session.execute(
        text("""
            UPDATE soumission
               SET idsoumissionnaire = :idsoumissionnaire,
                   idcommande        = :idcommande,
                   date_soumission   = :date_soumission,
                   statut_soumission = :statut_soumission
             WHERE idsoumission      = :id
        """),
        {
            "id": idsoumission,
            "idsoumissionnaire": idsoumissionnaire,
            "idcommande": idcommande,
            "date_soumission": body.get("date_soumission"),
            "statut_soumission": body.get("statut_soumission", "en cours"),
        },
    )
    db.session.commit()
    return jsonify(_one(idsoumission))  # normalisé


@bp_soumissions.delete("/<int:idsoumission>")
@swag_from({
    "tags": ["soumissions"],
    "summary": "Delete Soumission",
    "produces": ["application/json"],
    "parameters": [
        {"in": "path", "name": "idsoumission", "required": True, "schema": {"type": "integer"}}
    ],
    "responses": {
        "200": {"description": "Successful Response", "content": {"application/json": {"schema": {"type": "string"}}}},
        "404": {"description": "Not found"},
    }
})
def delete_soumission(idsoumission: int):
    res = db.session.execute(
        text("DELETE FROM soumission WHERE idsoumission = :id"),
        {"id": idsoumission},
    )
    db.session.commit()
    if res.rowcount == 0:
        return jsonify("Aucune ligne supprimée."), 404
    return jsonify("OK")
