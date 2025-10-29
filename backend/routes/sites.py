# app/routes/sites.py
from flask import Blueprint, request, jsonify, abort
from sqlalchemy import or_
from ..extensions import db
from ..models.site import Site
from ..models.departement import Departement

bp = Blueprint("sites", __name__, url_prefix="/api/v1/sites")

# --------- helpers ---------
def site_to_dict(s: Site) -> dict:
    return {
        "idsite": s.idsite,
        "iddepartement": s.iddepartement,
        "localite": s.localite,
    }

def get_site_or_404(idsite: int) -> Site:
    s = Site.query.filter_by(idsite=idsite).first()
    if not s:
        abort(404, description="Site introuvable.")
    return s

def ensure_departement_exists(idep: int) -> None:
    if idep is None:
        return
    exists = db.session.query(Departement.iddepartement)\
        .filter_by(iddepartement=idep).first()
    if not exists:
        abort(400, description="Departement inexistant.")


# --------- GET /api/v1/sites/ (list) ---------
@bp.get("/")
def list_sites():
    """
    List Sites
    ---
    tags:
      - sites
    parameters:
      - in: query
        name: q
        schema: { type: string }
      - in: query
        name: skip
        schema: { type: integer, default: 0, minimum: 0 }
      - in: query
        name: limit
        schema: { type: integer, default: 100, minimum: 1, maximum: 500 }
    responses:
      200:
        description: Successful Response
        content:
          application/json:
            example: [{"idsite":1,"iddepartement":10,"localite":"Hinche"}]
    """
    q = request.args.get("q", type=str)
    skip = request.args.get("skip", default=0, type=int)
    limit = request.args.get("limit", default=100, type=int)
    limit = max(1, min(limit, 500))
    skip = max(0, skip)

    query = Site.query
    if q:
        # recherche sur localite ou nom du departement
        query = query.join(Departement, isouter=True).filter(
            or_(
                Site.localite.ilike(f"%{q}%"),
                Departement.departement.ilike(f"%{q}%")
            )
        )

    rows = query.order_by(Site.idsite).offset(skip).limit(limit).all()
    return jsonify([site_to_dict(s) for s in rows]), 200


# --------- POST /api/v1/sites/ (create) ---------
@bp.post("/")
def create_site():
    """
    Create Site
    ---
    tags:
      - sites
    requestBody:
      required: true
      content:
        application/json:
          schema:
            type: object
            properties:
              iddepartement: { type: integer }
              localite: { type: string }
            required: [localite]
    responses:
      201:
        description: Successful Response
        content:
          application/json:
            example: {"idsite":1,"iddepartement":10,"localite":"Hinche"}
    """
    payload = request.get_json(silent=True) or {}
    localite = (payload.get("localite") or "").strip()
    iddepartement = payload.get("iddepartement")

    if not localite:
        abort(400, description="localite est requis.")

    if iddepartement is not None:
        ensure_departement_exists(iddepartement)

    s = Site(localite=localite, iddepartement=iddepartement)
    db.session.add(s)
    db.session.commit()
    return jsonify(site_to_dict(s)), 201


# --------- GET /api/v1/sites/{idsite} ---------
@bp.get("/<int:idsite>")
def get_site(idsite: int):
    """
    Get Site
    ---
    tags:
      - sites
    parameters:
      - in: path
        name: idsite
        required: true
        schema: { type: integer, minimum: 1 }
    responses:
      200:
        description: Successful Response
        content:
          application/json:
            example: {"idsite":1,"iddepartement":10,"localite":"Hinche"}
    """
    s = get_site_or_404(idsite)
    return jsonify(site_to_dict(s)), 200


# --------- PUT /api/v1/sites/{idsite} ---------
@bp.put("/<int:idsite>")
def update_site(idsite: int):
    """
    Update Site
    ---
    tags:
      - sites
    parameters:
      - in: path
        name: idsite
        required: true
        schema: { type: integer, minimum: 1 }
    requestBody:
      required: true
      content:
        application/json:
          schema:
            type: object
            properties:
              iddepartement: { type: integer }
              localite: { type: string }
    responses:
      200:
        description: Successful Response
        content:
          application/json:
            example: {"idsite":1,"iddepartement":10,"localite":"Mirebalais"}
    """
    s = get_site_or_404(idsite)
    payload = request.get_json(silent=True) or {}

    if "localite" in payload:
        s.localite = (payload.get("localite") or "").strip() or s.localite

    if "iddepartement" in payload:
        idep = payload.get("iddepartement")
        if idep is not None:
            ensure_departement_exists(idep)
        s.iddepartement = idep

    db.session.commit()
    return jsonify(site_to_dict(s)), 200


# --------- DELETE /api/v1/sites/{idsite} ---------
@bp.delete("/<int:idsite>")
def delete_site(idsite: int):
    """
    Delete Site
    ---
    tags:
      - sites
    parameters:
      - in: path
        name: idsite
        required: true
        schema: { type: integer, minimum: 1 }
    responses:
      200:
        description: Successful Response
        content:
          application/json:
            example: {"ok": true}
    """
    s = get_site_or_404(idsite)
    db.session.delete(s)
    db.session.commit()
    return jsonify({"ok": True}), 200
