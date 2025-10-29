from flask import Blueprint, request, jsonify
from sqlalchemy import text
from app.extensions import db
import re
from flasgger import swag_from

bp_personnels = Blueprint(
    "personnels",
    __name__,
    url_prefix="/api/v1/personnels",
)

# ──────────────────────────────────────────────────────────────────────────────
# Swagger local à ce fichier
# ──────────────────────────────────────────────────────────────────────────────

SWAGGER_DEFS = {
    "definitions": {
        "PersonnelIn": {
            "type": "object",
            "required": ["nom_personnel"],
            "properties": {
                "idsoumission":        {"type": "integer"},
                "nom_personnel":       {"type": "string", "maxLength": 150},
                "fonction_personnel":  {"type": "string", "maxLength": 150},
                "email_personnel":     {"type": "string", "maxLength": 150},
                "telephone_personnel": {"type": "string", "maxLength": 150},
                "type_personnel":      {"type": "string", "maxLength": 150}
            },
            "example": {
                "idsoumission": 3,
                "nom_personnel": "Marie DORVAL",
                "fonction_personnel": "Comptable",
                "email_personnel": "marie@example.com",
                "telephone_personnel": "+509 33 11 22 33",
                "type_personnel": "interne"
            }
        },
        "PersonnelOut": {
            "allOf": [
                {"$ref": "#/definitions/PersonnelIn"},
                {"type": "object",
                 "properties": {"idpersonnel": {"type": "integer"}}}
            ],
            "example": {
                "idpersonnel": 18,
                "idsoumission": 3,
                "nom_personnel": "Marie DORVAL",
                "fonction_personnel": "Comptable",
                "email_personnel": "marie@example.com",
                "telephone_personnel": "+509 33 11 22 33",
                "type_personnel": "interne"
            }
        }
    }
}

# ──────────────────────────────────────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────────────────────────────────────

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")

def _exists_soumission(idsoumission: int) -> bool:
    if idsoumission is None:
        return False
    row = db.session.execute(
        text("SELECT 1 FROM soumission WHERE idsoumission = :id LIMIT 1"),
        {"id": idsoumission},
    ).first()
    return bool(row)

def _get_one(idpersonnel: int):
    row = db.session.execute(
        text("""
            SELECT
              p.idpersonnel,
              p.idsoumission,
              p.nom_personnel,
              p.fonction_personnel,
              p.email_personnel,
              p.telephone_personnel,
              p.type_personnel
            FROM personnel p
            WHERE p.idpersonnel = :id
            LIMIT 1
        """),
        {"id": idpersonnel},
    ).mappings().fetchone()
    return dict(row) if row else None

def _validate_payload(body: dict, partial: bool = False):
    """
    partial=True pour PUT (toutes les clés sont optionnelles) ;
    partial=False pour POST (nom_personnel obligatoire).
    """
    if not partial:
        nom = (body.get("nom_personnel") or "").strip()
        if not nom:
            return "nom_personnel est obligatoire."
        if len(nom) > 150:
            return "nom_personnel trop long (150 max)."

    email = body.get("email_personnel")
    if email:
        if len(email) > 150 or not EMAIL_RE.match(email):
            return "email_personnel invalide."

    for k in ("fonction_personnel", "telephone_personnel", "type_personnel"):
        v = body.get(k)
        if v is not None and len(str(v)) > 150:
            return f"{k} trop long (150 max)."

    idsoumission = body.get("idsoumission")
    if idsoumission is not None and not _exists_soumission(idsoumission):
        return "idsoumission inexistant."
    return None

# ──────────────────────────────────────────────────────────────────────────────
# Endpoints
# ──────────────────────────────────────────────────────────────────────────────

@bp_personnels.get("/")
@swag_from({
    "tags": ["personnels"],
    "summary": "List Personnels",
    "parameters": [
        {"name":"idsoumission","in":"query","type":"integer","required":False,
         "description":"Filtrer par idsoumission"},
        {"name":"type_personnel","in":"query","type":"string","required":False,
         "description":"Filtrer par type_personnel"},
        {"name":"q","in":"query","type":"string","required":False,
         "description":"Recherche plein texte (nom/email/téléphone/fonction)"},
        {"name":"skip","in":"query","type":"integer","required":False,"default":0},
        {"name":"limit","in":"query","type":"integer","required":False,"default":100,"maximum":500},
    ],
    "responses": {
        200: {
            "description": "Successful Response",
            "schema": {"type":"array","items":{"$ref":"#/definitions/PersonnelOut"}}
        }
    },
    **SWAGGER_DEFS
})
def list_personnels():
    idsoumission = request.args.get("idsoumission", type=int)
    type_personnel = request.args.get("type_personnel")
    q = request.args.get("q")
    skip = request.args.get("skip", default=0, type=int)
    limit = min(request.args.get("limit", default=100, type=int), 500)

    base = """
        SELECT
          p.idpersonnel,
          p.idsoumission,
          p.nom_personnel,
          p.fonction_personnel,
          p.email_personnel,
          p.telephone_personnel,
          p.type_personnel
        FROM personnel p
        WHERE 1=1
    """
    params = {}
    if idsoumission is not None:
        base += " AND p.idsoumission = :idsoumission"
        params["idsoumission"] = idsoumission
    if type_personnel:
        base += " AND p.type_personnel = :type_personnel"
        params["type_personnel"] = type_personnel
    if q:
        params["q"] = f"%{q}%"
        base += """
            AND (
                p.nom_personnel LIKE :q OR
                p.fonction_personnel LIKE :q OR
                p.email_personnel LIKE :q OR
                p.telephone_personnel LIKE :q
            )
        """
    base += " ORDER BY p.idpersonnel DESC LIMIT :limit OFFSET :skip"
    params.update({"limit": limit, "skip": skip})

    rows = db.session.execute(text(base), params).mappings().all()
    return jsonify([dict(r) for r in rows])


@bp_personnels.get("/<int:idpersonnel>")
@swag_from({
    "tags": ["personnels"],
    "summary": "Get Personnel",
    "parameters": [
        {"name":"idpersonnel","in":"path","type":"integer","required":True},
    ],
    "responses": {
        200: {"description":"OK", "schema":{"$ref":"#/definitions/PersonnelOut"}},
        404: {"description":"Not Found"}
    },
    **SWAGGER_DEFS
})
def get_personnel(idpersonnel: int):
    obj = _get_one(idpersonnel)
    if not obj:
        return jsonify({"detail": "Personnel introuvable."}), 404
    return jsonify(obj)


@bp_personnels.post("/")
@swag_from({
    "tags": ["personnels"],
    "summary": "Create Personnel",
    "consumes": ["application/json"],
    "parameters": [
        {
            "in": "body",
            "name": "body",
            "required": True,
            "schema": {"$ref": "#/definitions/PersonnelIn"},
            "description": "Champs conformes à la BDD",
        }
    ],
    "responses": {
        201: {
            "description":"Created",
            "schema":{"$ref":"#/definitions/PersonnelOut"},
            "examples": {
                "application/json": {
                    "idpersonnel": 19,
                    "idsoumission": 3,
                    "nom_personnel": "Marie DORVAL",
                    "fonction_personnel": "Comptable",
                    "email_personnel": "marie@example.com",
                    "telephone_personnel": "+509 33 11 22 33",
                    "type_personnel": "interne"
                }
            }
        },
        400: {"description":"Bad Request (FK/validation)"}
    },
    **SWAGGER_DEFS
})
def create_personnel():
    body = request.get_json(silent=True) or {}
    err = _validate_payload(body, partial=False)
    if err:
        return jsonify({"detail": err}), 400

    db.session.execute(
        text("""
            INSERT INTO personnel (
                idsoumission,
                nom_personnel,
                fonction_personnel,
                email_personnel,
                telephone_personnel,
                type_personnel
            ) VALUES (
                :idsoumission,
                :nom_personnel,
                :fonction_personnel,
                :email_personnel,
                :telephone_personnel,
                :type_personnel
            )
        """),
        {
            "idsoumission": body.get("idsoumission"),
            "nom_personnel": body.get("nom_personnel"),
            "fonction_personnel": body.get("fonction_personnel"),
            "email_personnel": body.get("email_personnel"),
            "telephone_personnel": body.get("telephone_personnel"),
            "type_personnel": body.get("type_personnel"),
        },
    )
    db.session.commit()

    new_id = db.session.execute(text("SELECT LAST_INSERT_ID() AS id")).mappings().one()["id"]
    out = _get_one(int(new_id))
    return jsonify(out), 201


@bp_personnels.put("/<int:idpersonnel>")
@swag_from({
    "tags": ["personnels"],
    "summary": "Update Personnel",
    "consumes": ["application/json"],
    "parameters": [
        {"name":"idpersonnel","in":"path","type":"integer","required":True},
        {
            "in":"body",
            "name":"body",
            "required": True,
            "schema": {"$ref": "#/definitions/PersonnelIn"},
            "description": "Tous les champs sont acceptés ; seuls ceux fournis seront mis à jour."
        }
    ],
    "responses": {
        200: {"description":"OK", "schema":{"$ref":"#/definitions/PersonnelOut"}},
        400: {"description":"Bad Request (FK/validation)"},
        404: {"description":"Not Found"}
    },
    **SWAGGER_DEFS
})
def update_personnel(idpersonnel: int):
    if not _get_one(idpersonnel):
        return jsonify({"detail": "Personnel introuvable."}), 404

    body = request.get_json(silent=True) or {}
    err = _validate_payload(body, partial=True)
    if err:
        return jsonify({"detail": err}), 400

    current = _get_one(idpersonnel)
    merged = {
        "idsoumission": body.get("idsoumission", current["idsoumission"]),
        "nom_personnel": body.get("nom_personnel", current["nom_personnel"]),
        "fonction_personnel": body.get("fonction_personnel", current["fonction_personnel"]),
        "email_personnel": body.get("email_personnel", current["email_personnel"]),
        "telephone_personnel": body.get("telephone_personnel", current["telephone_personnel"]),
        "type_personnel": body.get("type_personnel", current["type_personnel"]),
    }

    db.session.execute(
        text("""
            UPDATE personnel
               SET idsoumission       = :idsoumission,
                   nom_personnel      = :nom_personnel,
                   fonction_personnel = :fonction_personnel,
                   email_personnel    = :email_personnel,
                   telephone_personnel= :telephone_personnel,
                   type_personnel     = :type_personnel
             WHERE idpersonnel        = :id
        """),
        {"id": idpersonnel, **merged},
    )
    db.session.commit()
    return jsonify(_get_one(idpersonnel))


@bp_personnels.delete("/<int:idpersonnel>")
@swag_from({
    "tags": ["personnels"],
    "summary": "Delete Personnel",
    "parameters": [
        {"name":"idpersonnel","in":"path","type":"integer","required":True}
    ],
    "responses": {
        200: {
            "description":"Successful Response",
            "schema":{"type":"object","properties":{
                "deleted":{"type":"boolean"},
                "idpersonnel":{"type":"integer"},
                "reason":{"type":"string"}
            }},
            "examples":{"application/json":{
                "deleted": True, "idpersonnel": 19, "reason": None
            }}
        }
    },
    **SWAGGER_DEFS
})
def delete_personnel(idpersonnel: int):
    res = db.session.execute(
        text("DELETE FROM personnel WHERE idpersonnel = :id"),
        {"id": idpersonnel},
    )
    db.session.commit()
    return jsonify({
        "deleted": res.rowcount > 0,
        "idpersonnel": idpersonnel,
        "reason": None if res.rowcount > 0 else "Aucune ligne supprimée.",
    })
