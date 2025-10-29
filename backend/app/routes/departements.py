# app/routes/departements.py
from flask import Blueprint, request, jsonify
from sqlalchemy import select
from ..extensions import db
from ..models.departement import Departement

bp = Blueprint("departements", __name__, url_prefix="/api/v1/departements")

# -------------------------------------------------------------------
# GET /api/v1/departements/?q=&skip=&limit=
# -------------------------------------------------------------------
@bp.get("/")
def list_departements():
    """
    List Departements
    ---
    tags: [departements]
    parameters:
      - in: query
        name: q
        schema: { type: string }
        description: Filtre contient (ILIKE) sur le nom du département
      - in: query
        name: skip
        schema: { type: integer, default: 0 }
      - in: query
        name: limit
        schema: { type: integer, default: 100, maximum: 500 }
    responses:
      200:
        description: Successful Response
        content:
          application/json:
            example:
              - { "iddepartement": 1, "departement": "Ouest" }
    """
    q = request.args.get("q", type=str)
    skip = request.args.get("skip", default=0, type=int)
    limit = request.args.get("limit", default=100, type=int)
    limit = min(max(limit, 0), 500)

    stmt = select(Departement)
    if q:
        like = f"%{q}%"
        stmt = stmt.filter(Departement.departement.ilike(like))

    stmt = stmt.order_by(Departement.departement).offset(skip).limit(limit)
    rows = db.session.execute(stmt).scalars().all()
    data = [{"iddepartement": d.iddepartement, "departement": d.departement} for d in rows]
    return jsonify(data), 200


# -------------------------------------------------------------------
# POST /api/v1/departements/
# body: { "departement": "..." }
# -------------------------------------------------------------------
@bp.post("/")
def create_departement():
    """
    Create Departement
    ---
    tags: [departements]
    requestBody:
      required: true
      content:
        application/json:
          schema:
            type: object
            properties:
              departement: { type: string }
            required: [departement]
          example: { "departement": "Artibonite" }
    responses:
      201:
        description: Successful Response
        content:
          application/json:
            example: { "iddepartement": 10, "departement": "Artibonite" }
      422:
        description: Champ manquant
    """
    payload = request.get_json(silent=True) or {}
    name = (payload.get("departement") or "").strip()
    if not name:
        return jsonify({"detail": "champ 'departement' requis"}), 422

    d = Departement(departement=name)
    db.session.add(d)
    db.session.commit()
    return jsonify({"iddepartement": d.iddepartement, "departement": d.departement}), 201


# -------------------------------------------------------------------
# GET /api/v1/departements/{iddepartement}
# -------------------------------------------------------------------
@bp.get("/<int:iddepartement>")
def get_departement(iddepartement: int):
    """
    Get Departement
    ---
    tags: [departements]
    parameters:
      - in: path
        name: iddepartement
        required: true
        schema: { type: integer, minimum: 1 }
    responses:
      200:
        description: Successful Response
        content:
          application/json:
            example: { "iddepartement": 1, "departement": "Ouest" }
      404:
        description: Introuvable
    """
    d = db.session.get(Departement, iddepartement)
    if not d:
        return jsonify({"detail": "Département introuvable."}), 404
    return jsonify({"iddepartement": d.iddepartement, "departement": d.departement}), 200


# -------------------------------------------------------------------
# PUT /api/v1/departements/{iddepartement}
# body: { "departement": "..." }
# -------------------------------------------------------------------
@bp.put("/<int:iddepartement>")
def update_departement(iddepartement: int):
    """
    Update Departement
    ---
    tags: [departements]
    parameters:
      - in: path
        name: iddepartement
        required: true
        schema: { type: integer, minimum: 1 }
    requestBody:
      required: true
      content:
        application/json:
          schema:
            type: object
            properties:
              departement: { type: string }
            required: [departement]
          example: { "departement": "Nippes" }
    responses:
      200:
        description: Successful Response
        content:
          application/json:
            example: { "iddepartement": 1, "departement": "Nippes" }
      404:
        description: Introuvable
      422:
        description: Champ manquant
    """
    d = db.session.get(Departement, iddepartement)
    if not d:
        return jsonify({"detail": "Département introuvable."}), 404

    payload = request.get_json(silent=True) or {}
    name = (payload.get("departement") or "").strip()
    if not name:
        return jsonify({"detail": "champ 'departement' requis"}), 422

    d.departement = name
    db.session.commit()
    return jsonify({"iddepartement": d.iddepartement, "departement": d.departement}), 200


# -------------------------------------------------------------------
# DELETE /api/v1/departements/{iddepartement}
# -------------------------------------------------------------------
@bp.delete("/<int:iddepartement>")
def delete_departement(iddepartement: int):
    """
    Delete Departement
    ---
    tags: [departements]
    parameters:
      - in: path
        name: iddepartement
        required: true
        schema: { type: integer, minimum: 1 }
    responses:
      200:
        description: Successful Response
        content:
          application/json:
            example: { "ok": true }
      404:
        description: Introuvable
    """
    d = db.session.get(Departement, iddepartement)
    if not d:
        return jsonify({"detail": "Département introuvable."}), 404

    db.session.delete(d)
    db.session.commit()
    return jsonify({"ok": True}), 200
