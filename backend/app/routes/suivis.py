# app/routes/suivis.py
from flask import Blueprint, request, jsonify
from flasgger import swag_from
from sqlalchemy.orm import joinedload
from ..extensions import db
from ..models.suivi import Suivi
from ..models.indicateur import Indicateur
# Optionnel mais recommandé si tu veux renvoyer titre_act / code_projet
from ..models.activite import Activite  # assure-toi que le modèle existe

suivis_bp = Blueprint("suivis_v1", __name__, url_prefix="/api/v1/suivis")

# --------- Utils ---------
def _serialize_suivi(s: Suivi) -> dict:
    libelle_indic = None
    titre_act = None
    code_projet = None

    if getattr(s, "indicateur", None):
        libelle_indic = s.indicateur.libelle_indicateur
    if getattr(s, "activite", None):
        # adapte au vrai schéma de ta table "activite"
        titre_act = getattr(s.activite, "titre_act", None)
        code_projet = getattr(s.activite, "code_projet", None)

    return {
        "idsuivi": s.idsuivi,
        "idindicateur": s.idindicateur,
        "idactivite": s.idactivite,
        "libelle_indicateur": libelle_indic,
        "titre_act": titre_act,
        "code_projet": code_projet,
    }

# ========= LIST =========
@suivis_bp.get("/")
@swag_from({
    "tags": ["suivis"],
    "summary": "List Suivis",
    "parameters": [
        {"in": "query", "name": "idactivite", "schema": {"type": "integer", "nullable": True}, "description": "Filtrer par idactivite"},
        {"in": "query", "name": "idindicateur", "schema": {"type": "integer", "nullable": True}, "description": "Filtrer par idindicateur"},
        {"in": "query", "name": "skip", "schema": {"type": "integer", "default": 0}, "description": "Décalage (offset)"},
        {"in": "query", "name": "limit", "schema": {"type": "integer", "default": 100, "maximum": 500}, "description": "Taille de page"},
    ],
    "responses": {
        200: {
            "description": "Successful Response",
            "content": {
                "application/json": {
                    "example": [
                        {"idindicateur": 0, "idactivite": 0, "idsuivi": 0}
                    ]
                }
            }
        },
        422: {"description": "Validation Error"}
    }
})
def list_suivis():
    args = request.args
    idactivite = args.get("idactivite", type=int)
    idindicateur = args.get("idindicateur", type=int)
    skip = max(0, args.get("skip", default=0, type=int) or 0)
    limit = args.get("limit", default=100, type=int) or 100
    limit = max(1, min(500, limit))

    q = (Suivi.query
         .options(joinedload(Suivi.indicateur), joinedload(Suivi.activite)))
    if idactivite is not None:
        q = q.filter(Suivi.idactivite == idactivite)
    if idindicateur is not None:
        q = q.filter(Suivi.idindicateur == idindicateur)

    rows = q.offset(skip).limit(limit).all()
    return jsonify([_serialize_suivi(s) for s in rows]), 200

# ========= CREATE =========
@suivis_bp.post("/")
@swag_from({
    "tags": ["suivis"],
    "summary": "Create Suivi",
    "requestBody": {
        "required": True,
        "content": {
            "application/json": {
                "example": {"idindicateur": 0, "idactivite": 0}
            }
        }
    },
    "responses": {
        201: {
            "description": "Successful Response",
            "content": {
                "application/json": {
                    "example": {
                        "idsuivi": 0,
                        "idindicateur": 0,
                        "idactivite": 0,
                        "libelle_indicateur": "string",
                        "titre_act": "string",
                        "code_projet": "string"
                    }
                }
            }
        },
        422: {"description": "Validation Error"}
    }
})
def create_suivi():
    data = request.get_json(silent=True) or {}
    idactivite = data.get("idactivite")
    idindicateur = data.get("idindicateur")  # peut être None

    if idactivite is None:
        return jsonify({"detail": [{"loc": ["idactivite"], "msg": "idactivite requis", "type": "value_error"}]}), 422

    s = Suivi(idactivite=idactivite, idindicateur=idindicateur)
    db.session.add(s)
    db.session.commit()

    # recharger avec jointures pour enrichir la réponse
    s = (Suivi.query
         .options(joinedload(Suivi.indicateur), joinedload(Suivi.activite))
         .get(s.idsuivi))
    return jsonify(_serialize_suivi(s)), 201

# ========= GET ONE =========
@suivis_bp.get("/<int:idsuivi>")
@swag_from({
    "tags": ["suivis"],
    "summary": "Get Suivi",
    "parameters": [
        {"in": "path", "name": "idsuivi", "required": True, "schema": {"type": "integer"}}
    ],
    "responses": {
        200: {
            "description": "Successful Response",
            "content": {
                "application/json": {
                    "example": {"idindicateur": 0, "idactivite": 0, "idsuivi": 0}
                }
            }
        },
        404: {"description": "Not Found"},
        422: {"description": "Validation Error"}
    }
})
def get_suivi(idsuivi: int):
    s = (Suivi.query
         .options(joinedload(Suivi.indicateur), joinedload(Suivi.activite))
         .get(idsuivi))
    if not s:
        return jsonify({"detail": "suivi introuvable"}), 404
    return jsonify(_serialize_suivi(s)), 200

# ========= UPDATE =========
@suivis_bp.put("/<int:idsuivi>")
@swag_from({
    "tags": ["suivis"],
    "summary": "Update Suivi",
    "parameters": [
        {"in": "path", "name": "idsuivi", "required": True, "schema": {"type": "integer"}}
    ],
    "requestBody": {
        "required": True,
        "content": {
            "application/json": {
                "example": {"idindicateur": 0, "idactivite": 0}
            }
        }
    },
    "responses": {
        200: {
            "description": "Successful Response",
            "content": {
                "application/json": {
                    "example": {
                        "idsuivi": 0,
                        "idindicateur": 0,
                        "idactivite": 0,
                        "libelle_indicateur": "string",
                        "titre_act": "string",
                        "code_projet": "string"
                    }
                }
            }
        },
        404: {"description": "Not Found"},
        422: {"description": "Validation Error"}
    }
})
def update_suivi(idsuivi: int):
    s = Suivi.query.get(idsuivi)
    if not s:
        return jsonify({"detail": "suivi introuvable"}), 404

    data = request.get_json(silent=True) or {}
    # champs modifiables
    if "idactivite" in data and data["idactivite"] is not None:
        s.idactivite = int(data["idactivite"])
    # idindicateur peut être None
    if "idindicateur" in data:
        s.idindicateur = data["idindicateur"] if data["idindicateur"] is not None else None

    db.session.commit()
    s = (Suivi.query
         .options(joinedload(Suivi.indicateur), joinedload(Suivi.activite))
         .get(idsuivi))
    return jsonify(_serialize_suivi(s)), 200

# ========= DELETE =========
@suivis_bp.delete("/<int:idsuivi>")
@swag_from({
    "tags": ["suivis"],
    "summary": "Delete Suivi",
    "parameters": [
        {"in": "path", "name": "idsuivi", "required": True, "schema": {"type": "integer"}}
    ],
    "responses": {
        200: {
            "description": "Successful Response",
            "content": {"application/json": {"example": "string"}}
        },
        404: {"description": "Not Found"},
        422: {"description": "Validation Error"}
    }
})
def delete_suivi(idsuivi: int):
    s = Suivi.query.get(idsuivi)
    if not s:
        return jsonify({"detail": "suivi introuvable"}), 404
    db.session.delete(s)
    db.session.commit()
    return jsonify("Deleted"), 200
