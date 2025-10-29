# Flask + SQLAlchemy only (no Marshmallow)
from __future__ import annotations
from flask import Blueprint, request, jsonify
from sqlalchemy.exc import IntegrityError
from ..extensions import db
from ..models.couverture import Couverture

blp = Blueprint("couvertures", __name__, url_prefix="/api/v1/couvertures")

# ---------- helpers ----------
def _parse_idcouverture(raw: str) -> tuple[int, int]:
    """
    Parse "idprojet-iddepartement" -> (idprojet, iddepartement)
    Lève ValueError si mauvais format.
    """
    if not isinstance(raw, str) or "-" not in raw:
        raise ValueError("Format attendu: '<idprojet>-<iddepartement>'")
    a, b = raw.split("-", 1)
    return int(a), int(b)

def _row_to_dict(row: Couverture) -> dict:
    return {"idprojet": row.idprojet, "iddepartement": row.iddepartement}

def _bad_request(msg: str):
    return jsonify({"error": msg}), 400

def _not_found():
    return jsonify({"error": "Couverture introuvable"}), 404


# ---------- 1) LIST ----------
@blp.get("/")
def list_couvertures():
    """
    Retourne la liste des (idprojet, iddepartement).
    """
    rows = Couverture.query.order_by(Couverture.idprojet.asc(),
                                     Couverture.iddepartement.asc()).all()
    return jsonify([_row_to_dict(r) for r in rows]), 200


# ---------- 2) CREATE ----------
@blp.post("/")
def create_couverture():
    """
    Body JSON requis : { "iddepartement": int, "idprojet": int }
    """
    data = request.get_json(silent=True) or {}
    idprojet = data.get("idprojet")
    iddepartement = data.get("iddepartement")

    # validations minimales
    if not isinstance(idprojet, int) or not isinstance(iddepartement, int):
        return _bad_request("Champs requis: idprojet:int, iddepartement:int")

    # éviter doublon
    exists = Couverture.query.get((idprojet, iddepartement))
    if exists:
        return jsonify({
            "created": False,
            "reason": "Déjà existant",
            "item": _row_to_dict(exists),
        }), 409

    row = Couverture(idprojet=idprojet, iddepartement=iddepartement)
    db.session.add(row)
    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return _bad_request("Violation d’intégrité (FK inexistante ?)")

    return jsonify(_row_to_dict(row)), 201


# ---------- 3) GET BY ID ----------
@blp.get("/<idcouverture>")
def get_couverture(idcouverture: str):
    """
    idcouverture = "<idprojet>-<iddepartement>"
    """
    try:
        idprojet, iddepartement = _parse_idcouverture(idcouverture)
    except ValueError as e:
        return _bad_request(str(e))

    row = Couverture.query.get((idprojet, iddepartement))
    if not row:
        return _not_found()
    return jsonify(_row_to_dict(row)), 200


# ---------- 4) UPDATE ----------
@blp.put("/<idcouverture>")
def update_couverture(idcouverture: str):
    """
    idcouverture = "<idprojet>-<iddepartement>" (clé actuelle)
    Body JSON requis : { "iddepartement": int, "idprojet": int } (nouvelle clé)
    """
    try:
        cur_idprojet, cur_iddepartement = _parse_idcouverture(idcouverture)
    except ValueError as e:
        return _bad_request(str(e))

    row = Couverture.query.get((cur_idprojet, cur_iddepartement))
    if not row:
        return _not_found()

    data = request.get_json(silent=True) or {}
    new_idprojet = data.get("idprojet")
    new_iddepartement = data.get("iddepartement")
    if not isinstance(new_idprojet, int) or not isinstance(new_iddepartement, int):
        return _bad_request("Champs requis: idprojet:int, iddepartement:int")

    # si la clé change, vérifier collision
    if (new_idprojet, new_iddepartement) != (cur_idprojet, cur_iddepartement):
        if Couverture.query.get((new_idprojet, new_iddepartement)):
            return jsonify({
                "updated": False,
                "reason": "Conflit: une couverture avec cette clé existe déjà",
            }), 409

    # Mise à jour
    row.idprojet = new_idprojet
    row.iddepartement = new_iddepartement
    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return _bad_request("Violation d’intégrité (FK inexistante ?)")

    return jsonify(_row_to_dict(row)), 200


# ---------- 5) DELETE ----------
@blp.delete("/<idcouverture>")
def delete_couverture(idcouverture: str):
    """
    idcouverture = "<idprojet>-<iddepartement>"
    """
    try:
        idprojet, iddepartement = _parse_idcouverture(idcouverture)
    except ValueError as e:
        return _bad_request(str(e))

    row = Couverture.query.get((idprojet, iddepartement))
    if not row:
        return _not_found()

    db.session.delete(row)
    db.session.commit()
    return jsonify({
        "deleted": True,
        "idprojet": idprojet,
        "iddepartement": iddepartement
    }), 200
