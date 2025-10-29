# app/routes/exercices.py
from datetime import datetime,date
from flask import Blueprint, request, jsonify
from flasgger import swag_from
from sqlalchemy import and_
import re
from ..extensions import db
from ..models.exercice_budgetaire import ExerciceBudgetaire

exercices_bp = Blueprint("exercices_v1", __name__, url_prefix="/api/v1/exercices")

def _iso(d):
    return d.isoformat() if d else None

def _parse_date(val, field):
    if val is None:
        return None
    try:
        # accepte "YYYY-MM-DD"
        return datetime.strptime(val, "%Y-%m-%d").date()
    except ValueError:
        raise ValueError(f"{field} doit être au format YYYY-MM-DD")

def _to_dict(exe: ExerciceBudgetaire):
    return {
        "idexercice_budgetaire": exe.idexercice_budgetaire,
        "annee": exe.annee,
        "date_debut_exe": _iso(exe.date_debut_exe),
        "date_fin_exe": _iso(exe.date_fin_exe),
    }

# ------------------------------------------------------------------
# LIST
# ------------------------------------------------------------------
@exercices_bp.get("/")
@swag_from({
    "tags": ["exercices_budgetaires"],
    "summary": "List Exercices",
    "parameters": [
        {"name": "annee", "in": "query", "schema": {"type": "string", "pattern": "^\\d{4}$"}, "required": False, "description": "Filtrer par année (YYYY)"},
        {"name": "start_from", "in": "query", "schema": {"type": "string", "format": "date"}, "required": False, "description": "date_debut_exe >= start_from"},
        {"name": "end_to", "in": "query", "schema": {"type": "string", "format": "date"}, "required": False, "description": "date_fin_exe <= end_to"},
        {"name": "skip", "in": "query", "schema": {"type": "integer", "default": 0}, "required": False},
        {"name": "limit", "in": "query", "schema": {"type": "integer", "default": 100, "maximum": 500}, "required": False},
    ],
    "responses": {
        200: {
            "description": "Successful Response",
            "content": {
                "application/json": {
                    "example": [
                        {
                            "idexercice_budgetaire": 1,
                            "annee": "2025",
                            "date_debut_exe": "2025-01-01",
                            "date_fin_exe": "2025-12-31"
                        }
                    ]
                }
            }
        },
        422: {
            "description": "Validation Error",
            "content": {
                "application/json": {
                    "example": {
                        "detail": [{"loc": ["start_from"], "msg": "YYYY-MM-DD attendu", "type": "value_error"}]
                    }
                }
            }
        }
    }
})
def list_exercices():
    try:
        annee = request.args.get("annee")
        start_from = _parse_date(request.args.get("start_from"), "start_from")
        end_to = _parse_date(request.args.get("end_to"), "end_to")
    except ValueError as e:
        return jsonify({"detail": [{"loc": ["query"], "msg": str(e), "type": "value_error"}]}), 422

    skip = int(request.args.get("skip", 0))
    limit = min(int(request.args.get("limit", 100)), 500)

    q = ExerciceBudgetaire.query
    if annee:
        q = q.filter(ExerciceBudgetaire.annee == annee)
    if start_from:
        q = q.filter(ExerciceBudgetaire.date_debut_exe >= start_from)
    if end_to:
        q = q.filter(ExerciceBudgetaire.date_fin_exe <= end_to)

    rows = q.order_by(ExerciceBudgetaire.date_debut_exe.asc()) \
            .offset(skip).limit(limit).all()
    return jsonify([_to_dict(r) for r in rows]), 200

def _serialize_exe(exe: ExerciceBudgetaire):
    return {
        "idexercice_budgetaire": exe.idexercice_budgetaire,
        "annee": exe.annee,
        "date_debut_exe": exe.date_debut_exe.isoformat(),
        "date_fin_exe": exe.date_fin_exe.isoformat(),
    }

def _parse_payload_or_422():
    payload = request.get_json(silent=True) or {}
    errors = {}

    annee = payload.get("annee")
    d1 = payload.get("date_debut_exe")
    d2 = payload.get("date_fin_exe")

    if not annee or not re.fullmatch(r"\d{4}", str(annee)):
        errors["annee"] = "Format attendu: 'YYYY' (ex: '2025')."

    def _parse_iso(s, field):
        try:
            return date.fromisoformat(s)
        except Exception:
            errors[field] = "Date ISO attendue 'YYYY-MM-DD'."
            return None

    if not d1:
        errors["date_debut_exe"] = "Champ requis."
        dt1 = None
    else:
        dt1 = _parse_iso(d1, "date_debut_exe")

    if not d2:
        errors["date_fin_exe"] = "Champ requis."
        dt2 = None
    else:
        dt2 = _parse_iso(d2, "date_fin_exe")

    if not errors and dt1 and dt2 and dt1 > dt2:
        errors["range"] = "date_debut_exe doit être <= date_fin_exe."

    if errors:
        return None, (jsonify({"detail": errors}), 422)

    return {"annee": str(annee), "date_debut_exe": dt1, "date_fin_exe": dt2}, None


@exercices_bp.post("/")
def create_exercice():
    r"""
    Create Exercice
    ---
    tags: [exercices_budgetaires]
    requestBody:
      required: true
      content:
        application/json:
          schema:
            type: object
            required: [annee, date_debut_exe, date_fin_exe]
            properties:
              annee:
                type: string
                pattern: '^\d{4}$'        # OK : raw string + quotes simples YAML
                example: '2025'
              date_debut_exe:
                type: string
                format: date
                example: '2025-01-01'
              date_fin_exe:
                type: string
                format: date
                example: '2025-12-31'
    responses:
      201:
        description: Created
        content:
          application/json:
            schema:
              type: object
              properties:
                idexercice_budgetaire: {type: integer}
                annee: {type: string}
                date_debut_exe: {type: string, format: date}
                date_fin_exe: {type: string, format: date}
      422:
        description: Validation Error
    """
    data, err = _parse_payload_or_422()
    if err:
        return err

    exe = ExerciceBudgetaire(
        annee=data["annee"],
        date_debut_exe=data["date_debut_exe"],
        date_fin_exe=data["date_fin_exe"],
    )
    db.session.add(exe)
    db.session.commit()
    return jsonify(_serialize_exe(exe)), 201


@exercices_bp.put("/<int:idexercice_budgetaire>")
def update_exercice(idexercice_budgetaire: int):
    r"""
    Update Exercice
    ---
    tags: [exercices_budgetaires]
    parameters:
      - in: path
        name: idexercice_budgetaire
        schema: {type: integer}
        required: true
    requestBody:
      required: true
      content:
        application/json:
          schema:
            type: object
            required: [annee, date_debut_exe, date_fin_exe]
            properties:
              annee:
                type: string
                pattern: '^\d{4}$'
                example: '2026'
              date_debut_exe: {type: string, format: date, example: '2026-01-01'}
              date_fin_exe:   {type: string, format: date, example: '2026-12-31'}
    responses:
      200: {description: Successful Response}
      404: {description: Not Found}
      422: {description: Validation Error}
    """
    exe = ExerciceBudgetaire.query.get(idexercice_budgetaire)
    if not exe:
        return jsonify({"detail": f"Exercice {idexercice_budgetaire} introuvable."}), 404

    data, err = _parse_payload_or_422()
    if err:
        return err

    exe.annee = data["annee"]
    exe.date_debut_exe = data["date_debut_exe"]
    exe.date_fin_exe = data["date_fin_exe"]
    db.session.commit()
    return jsonify(_serialize_exe(exe)), 200
# ------------------------------------------------------------------
# GET BY ID
# ------------------------------------------------------------------
@exercices_bp.get("/<int:idexercice_budgetaire>")
@swag_from({
    "tags": ["exercices_budgetaires"],
    "summary": "Get Exercice",
    "parameters": [
        {"name": "idexercice_budgetaire", "in": "path", "schema": {"type": "integer"}, "required": True}
    ],
    "responses": {
        200: {
            "description": "Successful Response",
            "content": {
                "application/json": {"example": {
                    "idexercice_budgetaire": 1,
                    "annee": "2025",
                    "date_debut_exe": "2025-01-01",
                    "date_fin_exe": "2025-12-31"
                }}
            }
        },
        404: {"description": "Not Found"}
    }
})
def get_exercice(idexercice_budgetaire: int):
    row = ExerciceBudgetaire.query.get(idexercice_budgetaire)
    if not row:
        return jsonify({"detail": "Exercice non trouvé"}), 404
    return jsonify(_to_dict(row)), 200


# ------------------------------------------------------------------
# DELETE
# ------------------------------------------------------------------
@exercices_bp.delete("/<int:idexercice_budgetaire>")
@swag_from({
    "tags": ["exercices_budgetaires"],
    "summary": "Delete Exercice",
    "parameters": [
        {"name": "idexercice_budgetaire", "in": "path", "schema": {"type": "integer"}, "required": True}
    ],
    "responses": {
        200: {
            "description": "Successful Response",
            "content": {"application/json": {"example": "deleted"}}
        },
        404: {"description": "Not Found"}
    }
})
def delete_exercice(idexercice_budgetaire: int):
    row = ExerciceBudgetaire.query.get(idexercice_budgetaire)
    if not row:
        return jsonify({"detail": "Exercice non trouvé"}), 404
    db.session.delete(row)
    db.session.commit()
    return jsonify("deleted"), 200
