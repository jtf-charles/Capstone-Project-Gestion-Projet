# app/routes/commandes.py
from __future__ import annotations

from decimal import Decimal
from typing import Any, Dict, Optional, Iterable

from flask import Blueprint, jsonify, request
from sqlalchemy import text

from app.extensions import db
from flasgger import swag_from

bp_commandes = Blueprint(
    "commandes",
    __name__,
    url_prefix="/api/v1/commandes",
)

# ──────────────────────────────────────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────────────────────────────────────

_SQL_SELECT_JOIN = """
SELECT
  co.idcommande,
  co.idprocedure,
  co.idprojet,
  co.montant_commande,
  co.libelle_commande,
  co.nature_commande,
  co.type_commande,
  pr.type_procedure,
  pj.code_projet,
  pj.initule_projet,
  COALESCE(COUNT(s.idsoumission), 0) AS nb_soumissions
FROM commande co
LEFT JOIN procedure_table pr ON pr.idprocedure = co.idprocedure
LEFT JOIN projet pj          ON pj.idprojet     = co.idprojet
LEFT JOIN soumission s       ON s.idcommande    = co.idcommande
"""

def _to_dict(row: Any) -> Dict[str, Any]:
    """Convertit une RowMapping en dict JSON-sérialisable (Decimal -> float)."""
    d = dict(row)
    for k, v in d.items():
        if isinstance(v, Decimal):
            d[k] = float(v)
    return d

def _one(cid: int) -> Optional[Dict[str, Any]]:
    row = db.session.execute(
        text(_SQL_SELECT_JOIN + " WHERE co.idcommande = :id GROUP BY co.idcommande"),
        {"id": cid},
    ).mappings().fetchone()
    return _to_dict(row) if row else None

def _exists_procedure(idprocedure: int) -> bool:
    return bool(
        db.session.execute(
            text("SELECT 1 FROM procedure_table WHERE idprocedure = :id LIMIT 1"),
            {"id": idprocedure},
        ).first()
    )

def _exists_projet(idprojet: int) -> bool:
    return bool(
        db.session.execute(
            text("SELECT 1 FROM projet WHERE idprojet = :id LIMIT 1"),
            {"id": idprojet},
        ).first()
    )

def _ensure_non_negative(name: str, value: Any) -> Optional[str]:
    """Retourne un message d'erreur si la valeur numérique est négative."""
    if value is None:
        return None
    try:
        if Decimal(value) < 0:
            return f"{name} doit être >= 0."
    except Exception:
        return f"{name} invalide."
    return None

# ──────────────────────────────────────────────────────────────────────────────
# Schémas Swagger (réutilisés)
# ──────────────────────────────────────────────────────────────────────────────

CommandeOutSchema = {
    "type": "object",
    "properties": {
        "idcommande": {"type": "integer"},
        "idprocedure": {"type": "integer", "nullable": True},
        "idprojet": {"type": "integer", "nullable": True},
        "montant_commande": {"type": "number"},
        "libelle_commande": {"type": "string", "nullable": True},
        "nature_commande": {"type": "string", "nullable": True},
        "type_commande": {"type": "string", "nullable": True},
        # champs de confort
        "type_procedure": {"type": "string", "nullable": True},
        "code_projet": {"type": "string", "nullable": True},
        "initule_projet": {"type": "string", "nullable": True},
        "nb_soumissions": {"type": "integer"},
    },
    "required": ["idcommande", "montant_commande"],
}

CommandeInSchema = {
    "type": "object",
    "properties": {
        "idprocedure": {"type": "integer", "nullable": True},
        "idprojet": {"type": "integer", "nullable": True},
        "montant_commande": {"type": "number"},
        "libelle_commande": {"type": "string"},
        "nature_commande": {"type": "string"},
        "type_commande": {"type": "string"},
    },
    "required": ["montant_commande"],
    "additionalProperties": False,
}

CommandeCreateExample = {
    "idprocedure": 1,
    "idprojet": 2,
    "montant_commande": 15000,
    "libelle_commande": "Achat intrants agricoles",
    "nature_commande": "Bien",
    "type_commande": "Marché public",
}

# ──────────────────────────────────────────────────────────────────────────────
# Endpoints
# ──────────────────────────────────────────────────────────────────────────────

@bp_commandes.get("/")
@swag_from({
    "tags": ["commandes"],
    "summary": "List Commandes",
    "produces": ["application/json"],
    "parameters": [
        {"in": "query", "name": "idprocedure", "schema": {"type": "integer"}, "description": "Filtrer par idprocedure"},
        {"in": "query", "name": "idprojet", "schema": {"type": "integer"}, "description": "Filtrer par idprojet"},
        {"in": "query", "name": "q", "schema": {"type": "string"}, "description": "Recherche (libelle/nature/type)"},
        {"in": "query", "name": "min_montant", "schema": {"type": "number"}, "description": "montant_commande >= min"},
        {"in": "query", "name": "max_montant", "schema": {"type": "number"}, "description": "montant_commande <= max"},
        {"in": "query", "name": "skip", "schema": {"type": "integer"}, "default": 0},
        {"in": "query", "name": "limit", "schema": {"type": "integer", "maximum": 500}, "default": 100},
    ],
    "responses": {
        "200": {
            "description": "Successful Response",
            "content": {"application/json": {
                "schema": {"type": "array", "items": CommandeOutSchema}
            }},
        }
    }
})
def list_commandes():
    idprocedure = request.args.get("idprocedure", type=int)
    idprojet = request.args.get("idprojet", type=int)
    q = request.args.get("q")
    min_montant = request.args.get("min_montant", type=float)
    max_montant = request.args.get("max_montant", type=float)
    skip = request.args.get("skip", default=0, type=int)
    limit = min(request.args.get("limit", default=100, type=int), 500)

    sql = _SQL_SELECT_JOIN + " WHERE 1=1"
    params: Dict[str, Any] = {}

    if idprocedure is not None:
        sql += " AND co.idprocedure = :idprocedure"
        params["idprocedure"] = idprocedure
    if idprojet is not None:
        sql += " AND co.idprojet = :idprojet"
        params["idprojet"] = idprojet
    if q:
        sql += """
          AND (
            co.libelle_commande LIKE :q OR
            co.nature_commande  LIKE :q OR
            co.type_commande    LIKE :q
          )
        """
        params["q"] = f"%{q}%"
    if min_montant is not None:
        sql += " AND co.montant_commande >= :min_montant"
        params["min_montant"] = min_montant
    if max_montant is not None:
        sql += " AND co.montant_commande <= :max_montant"
        params["max_montant"] = max_montant

    sql += " GROUP BY co.idcommande ORDER BY co.idcommande DESC LIMIT :limit OFFSET :skip"
    params.update({"limit": limit, "skip": skip})

    rows: Iterable[Any] = db.session.execute(text(sql), params).mappings().all()
    return jsonify([_to_dict(r) for r in rows])


@bp_commandes.get("/<int:idcommande>")
@swag_from({
    "tags": ["commandes"],
    "summary": "Get Commande",
    "produces": ["application/json"],
    "parameters": [
        {"in": "path", "name": "idcommande", "required": True, "schema": {"type": "integer"}}
    ],
    "responses": {
        "200": {"description": "Successful Response", "content": {"application/json": {"schema": CommandeOutSchema}}},
        "404": {"description": "Not found"},
    }
})
def get_commande(idcommande: int):
    obj = _one(idcommande)
    if not obj:
        return jsonify({"detail": "Commande introuvable."}), 404
    return jsonify(obj)


@bp_commandes.post("/")
@swag_from({
    "tags": ["commandes"],
    "summary": "Create Commande",
    "consumes": ["application/json"],
    "produces": ["application/json"],
    "parameters": [
        {"in": "body", "name": "body", "required": True, "schema": CommandeInSchema, "example": CommandeCreateExample}
    ],
    "responses": {
        "201": {"description": "Created", "content": {"application/json": {"schema": CommandeOutSchema}}},
        "400": {"description": "Bad Request (FK/validation)"},
    }
})
def create_commande():
    body = request.get_json(silent=True) or {}

    # Validation simple & FKs optionnelles
    err = _ensure_non_negative("montant_commande", body.get("montant_commande"))
    if err:
        return jsonify({"detail": err}), 400

    if body.get("idprocedure") is not None and not _exists_procedure(int(body["idprocedure"])):
        return jsonify({"detail": "idprocedure inexistant."}), 400
    if body.get("idprojet") is not None and not _exists_projet(int(body["idprojet"])):
        return jsonify({"detail": "idprojet inexistant."}), 400

    if body.get("montant_commande") is None:
        return jsonify({"detail": "montant_commande est obligatoire."}), 400

    db.session.execute(
        text("""
            INSERT INTO commande (
                idprocedure,
                idprojet,
                montant_commande,
                libelle_commande,
                nature_commande,
                type_commande
            ) VALUES (
                :idprocedure,
                :idprojet,
                :montant_commande,
                :libelle_commande,
                :nature_commande,
                :type_commande
            )
        """),
        {
            "idprocedure": body.get("idprocedure"),
            "idprojet": body.get("idprojet"),
            "montant_commande": body.get("montant_commande"),
            "libelle_commande": body.get("libelle_commande"),
            "nature_commande": body.get("nature_commande"),
            "type_commande": body.get("type_commande"),
        },
    )
    db.session.commit()

    new_id = db.session.execute(text("SELECT LAST_INSERT_ID() AS id")).mappings().one()["id"]
    out = _one(int(new_id))
    return jsonify(out), 201


@bp_commandes.put("/<int:idcommande>")
@swag_from({
    "tags": ["commandes"],
    "summary": "Update Commande",
    "consumes": ["application/json"],
    "produces": ["application/json"],
    "parameters": [
        {"in": "path", "name": "idcommande", "required": True, "schema": {"type": "integer"}},
        {"in": "body", "name": "body", "required": True, "schema": CommandeInSchema, "example": CommandeCreateExample},
    ],
    "responses": {
        "200": {"description": "Successful Response", "content": {"application/json": {"schema": CommandeOutSchema}}},
        "400": {"description": "Bad Request (FK/validation)"},
        "404": {"description": "Not found"},
    }
})
def update_commande(idcommande: int):
    if not _one(idcommande):
        return jsonify({"detail": "Commande introuvable."}), 404

    body = request.get_json(silent=True) or {}

    err = _ensure_non_negative("montant_commande", body.get("montant_commande"))
    if err:
        return jsonify({"detail": err}), 400

    if body.get("idprocedure") is not None and not _exists_procedure(int(body["idprocedure"])):
        return jsonify({"detail": "idprocedure inexistant."}), 400
    if body.get("idprojet") is not None and not _exists_projet(int(body["idprojet"])):
        return jsonify({"detail": "idprojet inexistant."}), 400

    db.session.execute(
        text("""
            UPDATE commande
               SET idprocedure      = :idprocedure,
                   idprojet         = :idprojet,
                   montant_commande = :montant_commande,
                   libelle_commande = :libelle_commande,
                   nature_commande  = :nature_commande,
                   type_commande    = :type_commande
             WHERE idcommande       = :id
        """),
        {
            "id": idcommande,
            "idprocedure": body.get("idprocedure"),
            "idprojet": body.get("idprojet"),
            "montant_commande": body.get("montant_commande"),
            "libelle_commande": body.get("libelle_commande"),
            "nature_commande": body.get("nature_commande"),
            "type_commande": body.get("type_commande"),
        },
    )
    db.session.commit()
    return jsonify(_one(idcommande))


@bp_commandes.delete("/<int:idcommande>")
@swag_from({
    "tags": ["commandes"],
    "summary": "Delete Commande",
    "produces": ["application/json"],
    "parameters": [
        {"in": "path", "name": "idcommande", "required": True, "schema": {"type": "integer"}}
    ],
    "responses": {
        "200": {"description": "Successful Response", "content": {"application/json": {"schema": {"type": "string"}}}},
    }
})
def delete_commande(idcommande: int):
    # Règle métier : refus si des soumissions existent
    cnt = db.session.execute(
        text("SELECT COUNT(*) AS c FROM soumission WHERE idcommande = :id"),
        {"id": idcommande},
    ).scalar()
    if cnt and int(cnt) > 0:
        return jsonify(
            "Impossible de supprimer : des soumissions sont associées à cette commande."
        ), 200

    res = db.session.execute(text("DELETE FROM commande WHERE idcommande = :id"), {"id": idcommande})
    db.session.commit()
    if res.rowcount == 0:
        return jsonify("Aucune ligne supprimée."), 200
    return jsonify("OK")
