# app/routes/programmations.py
from flask import Blueprint, request, jsonify
from sqlalchemy import text
from ..extensions import db

programmations_bp = Blueprint(
    "programmations", __name__, url_prefix="/api/v1/programmations"
)

# -------------------------
# SQL commun (identique FastAPI)
# -------------------------
_SQL_JOIN = """
SELECT
  p.idprogrammation,
  p.idactivite,
  p.idexercice_budgetaire,
  a.titre_act,
  e.annee
FROM programmation p
LEFT JOIN activite a ON a.idactivite = p.idactivite
JOIN exercice_budgetaire e ON e.idexercice_budgetaire = p.idexercice_budgetaire
"""

def _one_join(idprog: int):
    row = db.session.execute(
        text(_SQL_JOIN + " WHERE p.idprogrammation = :id"),
        {"id": idprog},
    ).mappings().first()
    return dict(row) if row else None

def _validate_fk(idactivite, idexercice_budgetaire):
    # Exercice obligatoire
    ex_ok = db.session.execute(
        text("SELECT 1 FROM exercice_budgetaire WHERE idexercice_budgetaire=:id LIMIT 1"),
        {"id": idexercice_budgetaire},
    ).first()
    if not ex_ok:
        return {"detail": "exercice_budgetaire inexistant."}, 400

    # Activité optionnelle (LEFT JOIN côté SQL)
    if idactivite is not None:
        act_ok = db.session.execute(
            text("SELECT 1 FROM activite WHERE idactivite=:id LIMIT 1"),
            {"id": idactivite},
        ).first()
        if not act_ok:
            return {"detail": "activite inexistante."}, 400

    return None, None

def _require_json():
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return None, (jsonify({
            "detail": [{"loc": ["body"], "msg": "JSON body required", "type": "value_error"}]
        }), 422)
    return data, None

# -------------------------
# LIST
# -------------------------
@programmations_bp.get("/")
def list_programmations():
    """
    List Programmations
    ---
    tags: [programmations]
    parameters:
      - in: query
        name: idexercice_budgetaire
        type: integer
        required: false
      - in: query
        name: idactivite
        type: integer
        required: false
      - in: query
        name: skip
        type: integer
        required: false
        default: 0
      - in: query
        name: limit
        type: integer
        required: false
        default: 100
    responses:
      200:
        description: Successful Response
        schema:
          type: array
          items:
            type: object
            properties:
              idprogrammation: {type: integer}
              idactivite: {type: integer}
              idexercice_budgetaire: {type: integer}
              titre_act: {type: string}
              annee: {type: integer}
    """
    q_ex = request.args.get("idexercice_budgetaire", type=int)
    q_act = request.args.get("idactivite", type=int)
    skip = request.args.get("skip", default=0, type=int)
    limit = request.args.get("limit", default=100, type=int)

    sql = _SQL_JOIN
    params = {}
    wh = []
    if q_ex is not None:
        wh.append("p.idexercice_budgetaire = :ex")
        params["ex"] = q_ex
    if q_act is not None:
        wh.append("p.idactivite = :act")
        params["act"] = q_act
    if wh:
        sql += " WHERE " + " AND ".join(wh)
    sql += " ORDER BY p.idprogrammation DESC"
    if skip:
        sql += " OFFSET :off"
        params["off"] = skip
    if limit:
        sql += " LIMIT :lim"
        params["lim"] = limit

    rows = db.session.execute(text(sql), params).mappings().all()
    return jsonify([dict(r) for r in rows]), 200

# -------------------------
# GET BY ID
# -------------------------
@programmations_bp.get("/<int:idprogrammation>")
def get_programmation(idprogrammation: int):
    """
    Get Programmation
    ---
    tags: [programmations]
    parameters:
      - in: path
        name: idprogrammation
        type: integer
        required: true
    responses:
      200:
        description: Successful Response
        schema:
          type: object
      404:
        description: Not Found
    """
    row = _one_join(idprogrammation)
    if not row:
        return jsonify({"detail": "Programmation not found"}), 404
    return jsonify(row), 200

# -------------------------
# CREATE
# -------------------------
@programmations_bp.post("/")
def create_programmation():
    """
    Create Programmation
    ---
    tags: [programmations]
    consumes:
      - application/json
    parameters:
      - in: body
        name: body
        required: true
        schema:
          type: object
          required: [idactivite, idexercice_budgetaire]
          properties:
            idactivite: {type: integer, nullable: true}
            idexercice_budgetaire: {type: integer}
    responses:
      201:
        description: Created
      400:
        description: Bad Request
      422:
        description: Validation Error
    """
    data, err = _require_json()
    if err:
        return err

    idactivite = data.get("idactivite", None)
    idex = data.get("idexercice_budgetaire", None)
    if not isinstance(idex, int) or (idactivite is not None and not isinstance(idactivite, int)):
        return jsonify({"detail": "Champs invalides (entiers requis)."}), 422

    msg, code = _validate_fk(idactivite, idex)
    if msg:
        return jsonify(msg), code

    db.session.execute(
        text("""
            INSERT INTO programmation (idactivite, idexercice_budgetaire)
            VALUES (:idactivite, :idex)
        """),
        {"idactivite": idactivite, "idex": idex},
    )
    db.session.commit()
    new_id = db.session.execute(text("SELECT LAST_INSERT_ID() AS id")).mappings().one()["id"]

    row = _one_join(int(new_id))
    return jsonify(row), 201

# -------------------------
# UPDATE
# -------------------------
@programmations_bp.put("/<int:idprogrammation>")
def update_programmation(idprogrammation: int):
    """
    Update Programmation
    ---
    tags: [programmations]
    consumes:
      - application/json
    parameters:
      - in: path
        name: idprogrammation
        type: integer
        required: true
      - in: body
        name: body
        required: true
        schema:
          type: object
          required: [idactivite, idexercice_budgetaire]
          properties:
            idactivite: {type: integer, nullable: true}
            idexercice_budgetaire: {type: integer}
    responses:
      200:
        description: Successful Response
      404:
        description: Not Found
      400:
        description: Bad Request
      422:
        description: Validation Error
    """
    # existe ?
    exists = db.session.execute(
        text("SELECT 1 FROM programmation WHERE idprogrammation=:id LIMIT 1"),
        {"id": idprogrammation},
    ).first()
    if not exists:
        return jsonify({"detail": "Programmation introuvable."}), 404

    data, err = _require_json()
    if err:
        return err

    idactivite = data.get("idactivite", None)
    idex = data.get("idexercice_budgetaire", None)
    if not isinstance(idex, int) or (idactivite is not None and not isinstance(idactivite, int)):
        return jsonify({"detail": "Champs invalides (entiers requis)."}), 422

    msg, code = _validate_fk(idactivite, idex)
    if msg:
        return jsonify(msg), code

    db.session.execute(
        text("""
            UPDATE programmation
               SET idactivite = :idactivite,
                   idexercice_budgetaire = :idex
             WHERE idprogrammation = :id
        """),
        {"id": idprogrammation, "idactivite": idactivite, "idex": idex},
    )
    db.session.commit()

    row = _one_join(idprogrammation)
    return jsonify(row), 200

# -------------------------
# DELETE
# -------------------------
@programmations_bp.delete("/<int:idprogrammation>")
def delete_programmation(idprogrammation: int):
    """
    Delete Programmation
    ---
    tags: [programmations]
    parameters:
      - in: path
        name: idprogrammation
        type: integer
        required: true
    responses:
      200:
        description: Successful Response
        schema:
          type: object
      200:
        description: Successful Response
    """
    res = db.session.execute(
        text("DELETE FROM programmation WHERE idprogrammation=:id"),
        {"id": idprogrammation},
    )
    db.session.commit()
    return jsonify({
        "deleted": res.rowcount > 0,
        "idprogrammation": idprogrammation,
        "reason": None if res.rowcount > 0 else "Aucune ligne supprimée."
    }), 200
