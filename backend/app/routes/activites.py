from flask import Blueprint, request, jsonify
from ..extensions import db
from ..models.activite import Activite

router = Blueprint("activites", __name__, url_prefix="/api/v1/activites")

@router.get("/")
def list_activites():
    """
    List Activites
    ---
    tags: [activites]
    parameters:
      - in: query
        name: q
        schema: {type: string, nullable: true}
      - in: query
        name: idprojet
        schema: {type: integer, nullable: true}
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
            schema:
              type: array
              items:
                $ref: '#/definitions/Activite'
    """
    q = request.args.get("q")
    idprojet = request.args.get("idprojet", type=int)
    skip = request.args.get("skip", default=0, type=int)
    limit = request.args.get("limit", default=100, type=int)

    query = Activite.query
    if idprojet:
        query = query.filter(Activite.idprojet == idprojet)
    if q:
        p = f"%{q}%"
        query = query.filter(Activite.titre_act.ilike(p))
    rows = query.order_by(Activite.idactivite.desc()).offset(skip).limit(limit).all()
    return jsonify([a.to_dict() for a in rows])


@router.post("/")
def create_activite():
    """
    Create Activite
    ---
    tags: [activites]
    requestBody:
      required: true
      content:
        application/json:
          schema:
            $ref: '#/definitions/Activite'
    responses:
      201:
        description: Successful Response
        content:
          application/json:
            schema:
              $ref: '#/definitions/Activite'
    """
    data = request.get_json(force=True) or {}
    a = Activite(
        idprojet=data.get("idprojet"),
        titre_act=data.get("titre_act"),
        description_act=data.get("description_act"),
        dateDemarragePrevue_act=data.get("dateDemarragePrevue_act"),
        dateFinPrevue_act=data.get("dateFinPrevue_act"),
    )
    db.session.add(a)
    db.session.commit()
    return jsonify(a.to_dict()), 201


@router.get("/<int:idactivite>")
def get_activite(idactivite: int):
    """
    Get Activite
    ---
    tags: [activites]
    parameters:
      - in: path
        name: idactivite
        required: true
        schema: {type: integer, minimum: 1}
    responses:
      200:
        description: Successful Response
        content:
          application/json:
            schema:
              $ref: '#/definitions/Activite'
      404:
        description: Not Found
    """
    a = Activite.query.get_or_404(idactivite)
    return jsonify(a.to_dict())


@router.put("/<int:idactivite>")
def update_activite(idactivite: int):
    """
    Update Activite
    ---
    tags: [activites]
    parameters:
      - in: path
        name: idactivite
        required: true
        schema: {type: integer, minimum: 1}
    requestBody:
      required: true
      content:
        application/json:
          schema:
            $ref: '#/definitions/Activite'
    responses:
      200:
        description: Successful Response
        content:
          application/json:
            schema:
              $ref: '#/definitions/Activite'
      404:
        description: Not Found
    """
    a = Activite.query.get_or_404(idactivite)
    data = request.get_json(force=True) or {}
    a.idprojet = data.get("idprojet", a.idprojet)
    a.titre_act = data.get("titre_act", a.titre_act)
    a.description_act = data.get("description_act", a.description_act)
    a.dateDemarragePrevue_act = data.get("dateDemarragePrevue_act", a.dateDemarragePrevue_act)
    a.dateFinPrevue_act = data.get("dateFinPrevue_act", a.dateFinPrevue_act)
    db.session.commit()
    return jsonify(a.to_dict())


@router.delete("/<int:idactivite>")
def delete_activite(idactivite: int):
    """
    Delete Activite
    ---
    tags: [activites]
    parameters:
      - in: path
        name: idactivite
        required: true
        schema: {type: integer, minimum: 1}
    responses:
      200:
        description: Successful Response
        content:
          application/json:
            schema:
              type: object
              properties:
                deleted: {type: boolean}
                idactivite: {type: integer}
                reason: {type: string}
    """
    a = Activite.query.get_or_404(idactivite)
    db.session.delete(a)
    db.session.commit()
    return jsonify({"deleted": True, "idactivite": idactivite, "reason": "deleted"})
