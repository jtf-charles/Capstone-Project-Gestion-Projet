# app/routes/implantations.py
from flask import Blueprint, request, jsonify
from flasgger import swag_from
from ..extensions import db
from ..models.implantation import Implantation

implantations_bp = Blueprint(
    "implantations", __name__, url_prefix="/api/v1/implantations"
)

def _to_dict(row: Implantation) -> dict:
    return {
        "idimplementation": row.idimplementation,
        "idsite": row.idsite,
        "idactivite": row.idactivite,
    }

@implantations_bp.get("/")
@swag_from({
    "tags": ["implantations"],
    "summary": "List Implantations",
    "responses": {
        200: {
            "description": "Successful Response",
            "content": {
                "application/json": {
                    "examples": {
                        "ok": {
                            "summary": "Liste",
                            "value": [
                                {"idimplementation": 1, "idsite": 3, "idactivite": 7}
                            ],
                        }
                    }
                }
            },
        }
    },
})
def list_implantations():
    rows = Implantation.query.order_by(Implantation.idimplementation.asc()).all()
    return jsonify([_to_dict(r) for r in rows]), 200


@implantations_bp.post("/")
@swag_from({
    "tags": ["implantations"],
    "summary": "Create Implantation",
    "requestBody": {
        "required": True,
        "content": {
            "application/json": {
                "schema": {
                    "type": "object",
                    "properties": {
                        "idsite": {"type": "integer"},
                        "idactivite": {"type": "integer"},
                    },
                    "required": ["idsite", "idactivite"],
                },
                "example": {"idsite": 1, "idactivite": 1},
            }
        },
    },
    "responses": {
        201: {
            "description": "Successful Response",
            "content": {
                "application/json": {
                    "example": {"idimplementation": 10, "idsite": 1, "idactivite": 1}
                }
            },
        },
        422: {"description": "Validation Error"},
    },
})
def create_implantation():
    data = request.get_json(silent=True) or {}
    idsite = data.get("idsite")
    idactivite = data.get("idactivite")
    if not isinstance(idsite, int) or not isinstance(idactivite, int):
        return jsonify({"detail": "idsite et idactivite sont requis (entiers)."}), 422

    row = Implantation(idsite=idsite, idactivite=idactivite)
    db.session.add(row)
    db.session.commit()
    return jsonify(_to_dict(row)), 201


@implantations_bp.get("/<int:idimplementation>")
@swag_from({
    "tags": ["implantations"],
    "summary": "Get Implantation",
    "parameters": [{
        "name": "idimplementation",
        "in": "path",
        "required": True,
        "schema": {"type": "integer", "minimum": 1},
    }],
    "responses": {
        200: {
            "description": "Successful Response",
            "content": {
                "application/json": {
                    "example": {"idimplementation": 1, "idsite": 3, "idactivite": 7}
                }
            },
        },
        404: {"description": "Not Found"},
    },
})
def get_implantation(idimplementation: int):
    row = Implantation.query.get(idimplementation)
    if not row:
        return jsonify({"detail": "Implantation introuvable"}), 404
    return jsonify(_to_dict(row)), 200


@implantations_bp.put("/<int:idimplementation>")
@swag_from({
    "tags": ["implantations"],
    "summary": "Update Implantation",
    "parameters": [{
        "name": "idimplementation",
        "in": "path",
        "required": True,
        "schema": {"type": "integer", "minimum": 1},
    }],
    "requestBody": {
        "required": True,
        "content": {
            "application/json": {
                "schema": {
                    "type": "object",
                    "properties": {
                        "idsite": {"type": "integer"},
                        "idactivite": {"type": "integer"},
                    },
                    "required": ["idsite", "idactivite"],
                },
                "example": {"idsite": 1, "idactivite": 1},
            }
        },
    },
    "responses": {
        200: {
            "description": "Successful Response",
            "content": {
                "application/json": {
                    "example": {"idimplementation": 1, "idsite": 1, "idactivite": 1}
                }
            },
        },
        404: {"description": "Not Found"},
        422: {"description": "Validation Error"},
    },
})
def update_implantation(idimplementation: int):
    row = Implantation.query.get(idimplementation)
    if not row:
        return jsonify({"detail": "Implantation introuvable"}), 404

    data = request.get_json(silent=True) or {}
    idsite = data.get("idsite")
    idactivite = data.get("idactivite")
    if not isinstance(idsite, int) or not isinstance(idactivite, int):
        return jsonify({"detail": "idsite et idactivite sont requis (entiers)."}), 422

    row.idsite = idsite
    row.idactivite = idactivite
    db.session.commit()
    return jsonify(_to_dict(row)), 200


@implantations_bp.delete("/<int:idimplementation>")
@swag_from({
    "tags": ["implantations"],
    "summary": "Delete Implantation",
    "parameters": [{
        "name": "idimplementation",
        "in": "path",
        "required": True,
        "schema": {"type": "integer", "minimum": 1},
    }],
    "responses": {
        200: {
            "description": "Successful Response",
            "content": {
                "application/json": {
                    "example": {
                        "deleted": True,
                        "idimplementation": 1,
                        "reason": "deleted by user"
                    }
                }
            },
        },
        404: {"description": "Not Found"},
    },
})
def delete_implantation(idimplementation: int):
    row = Implantation.query.get(idimplementation)
    if not row:
        return jsonify({"detail": "Implantation introuvable"}), 404

    db.session.delete(row)
    db.session.commit()
    return jsonify({"deleted": True, "idimplementation": idimplementation, "reason": "deleted"}), 200
