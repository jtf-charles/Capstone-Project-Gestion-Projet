# app/routes/indicateurs.py
from flask import Blueprint, request, jsonify, abort
from ..extensions import db
from ..models.indicateur import Indicateur

indicateurs_bp = Blueprint("indicateurs", __name__, url_prefix="/api/v1/indicateurs")


# --- utils
def _ind_to_dict(obj: Indicateur) -> dict:
    return {
        "idindicateur": obj.idindicateur,
        "libelle_indicateur": obj.libelle_indicateur,
        "niveau_base": obj.niveau_base,
        "niveau_cible": obj.niveau_cible,
        "niveau_actuel": obj.niveau_actuel,
    }


# GET /api/v1/indicateurs/  (liste + filtres + pagination)
@indicateurs_bp.get("/")
def list_indicateurs():
    """
    List Indicateurs
    ---
    tags: [indicateurs]
    parameters:
      - in: query
        name: q
        schema: {type: string, nullable: true}
        description: Rechercher dans libelle_indicateur (ILIKE)
      - in: query
        name: min_cible
        schema: {type: number, format: float, nullable: true}
        description: Filtrer niveau_cible >= min_cible
      - in: query
        name: max_cible
        schema: {type: number, format: float, nullable: true}
        description: Filtrer niveau_cible <= max_cible
      - in: query
        name: skip
        schema: {type: integer, default: 0}
      - in: query
        name: limit
        schema: {type: integer, default: 100, maximum: 500}
    responses:
      200:
        description: Successful Response
        content:
          application/json:
            example:
              - idindicateur: 1
                libelle_indicateur: "Taux d'accès"
                niveau_base: 10
                niveau_cible: 30
                niveau_actuel: 18
    """
    q = request.args.get("q")
    min_cible = request.args.get("min_cible", type=float)
    max_cible = request.args.get("max_cible", type=float)
    skip = request.args.get("skip", default=0, type=int)
    limit = request.args.get("limit", default=100, type=int)
    limit = min(max(limit, 0), 500)

    query = Indicateur.query
    if q:
        query = query.filter(Indicateur.libelle_indicateur.ilike(f"%{q}%"))
    if min_cible is not None:
        query = query.filter(Indicateur.niveau_cible >= min_cible)
    if max_cible is not None:
        query = query.filter(Indicateur.niveau_cible <= max_cible)

    items = query.offset(skip).limit(limit).all()
    return jsonify([_ind_to_dict(i) for i in items])


# POST /api/v1/indicateurs/  (create)
@indicateurs_bp.post("/")
def create_indicateur():
    """
    Create Indicateur
    ---
    tags: [indicateurs]
    requestBody:
      required: True
      content:
        application/json:
          schema:
            type: object
            required: [libelle_indicateur]
            properties:
              libelle_indicateur: {type: string}
              niveau_base: {type: number, format: float}
              niveau_cible: {type: number, format: float}
              niveau_actuel: {type: number, format: float}
          example:
            libelle_indicateur: "Taux d'accès"
            niveau_base: 10
            niveau_cible: 30
            niveau_actuel: 18
    responses:
      201:
        description: Successful Response
        content:
          application/json:
            example:
              idindicateur: 1
              libelle_indicateur: "Taux d'accès"
              niveau_base: 10
              niveau_cible: 30
              niveau_actuel: 18
    """
    data = request.get_json(force=True, silent=True) or {}
    lib = data.get("libelle_indicateur")
    if not lib or not isinstance(lib, str):
        abort(422, description="libelle_indicateur est requis")

    obj = Indicateur(
        libelle_indicateur=lib.strip(),
        niveau_base=data.get("niveau_base"),
        niveau_cible=data.get("niveau_cible"),
        niveau_actuel=data.get("niveau_actuel"),
    )
    db.session.add(obj)
    db.session.commit()
    return jsonify(_ind_to_dict(obj)), 201


# GET /api/v1/indicateurs/{idindicateur}
@indicateurs_bp.get("/<int:idindicateur>")
def get_indicateur(idindicateur: int):
    """
    Get Indicateur
    ---
    tags: [indicateurs]
    parameters:
      - in: path
        name: idindicateur
        required: True
        schema: {type: integer, minimum: 1}
    responses:
      200:
        description: Successful Response
        content:
          application/json:
            example:
              idindicateur: 1
              libelle_indicateur: "Taux d'accès"
              niveau_base: 10
              niveau_cible: 30
              niveau_actuel: 18
      404:
        description: Not found
    """
    obj = Indicateur.query.get_or_404(idindicateur)
    return jsonify(_ind_to_dict(obj))


# PUT /api/v1/indicateurs/{idindicateur}
@indicateurs_bp.put("/<int:idindicateur>")
def update_indicateur(idindicateur: int):
    """
    Update Indicateur
    ---
    tags: [indicateurs]
    parameters:
      - in: path
        name: idindicateur
        required: True
        schema: {type: integer, minimum: 1}
    requestBody:
      required: True
      content:
        application/json:
          schema:
            type: object
            properties:
              libelle_indicateur: {type: string}
              niveau_base: {type: number, format: float}
              niveau_cible: {type: number, format: float}
              niveau_actuel: {type: number, format: float}
          example:
            libelle_indicateur: "Taux d'accès (maj)"
            niveau_base: 12
            niveau_cible: 32
            niveau_actuel: 20
    responses:
      200:
        description: Successful Response
        content:
          application/json:
            example:
              idindicateur: 1
              libelle_indicateur: "Taux d'accès (maj)"
              niveau_base: 12
              niveau_cible: 32
              niveau_actuel: 20
      404:
        description: Not found
    """
    obj = Indicateur.query.get_or_404(idindicateur)
    data = request.get_json(force=True, silent=True) or {}

    if "libelle_indicateur" in data and isinstance(data["libelle_indicateur"], str):
        obj.libelle_indicateur = data["libelle_indicateur"].strip()
    if "niveau_base" in data:
        obj.niveau_base = data.get("niveau_base")
    if "niveau_cible" in data:
        obj.niveau_cible = data.get("niveau_cible")
    if "niveau_actuel" in data:
        obj.niveau_actuel = data.get("niveau_actuel")

    db.session.commit()
    return jsonify(_ind_to_dict(obj))


# DELETE /api/v1/indicateurs/{idindicateur}
@indicateurs_bp.delete("/<int:idindicateur>")
def delete_indicateur(idindicateur: int):
    """
    Delete Indicateur
    ---
    tags: [indicateurs]
    parameters:
      - in: path
        name: idindicateur
        required: True
        schema: {type: integer, minimum: 1}
    responses:
      200:
        description: Successful Response
        content:
          application/json:
            example: "deleted"
      404:
        description: Not found
    """
    obj = Indicateur.query.get_or_404(idindicateur)
    db.session.delete(obj)
    db.session.commit()
    return jsonify("deleted")
