# app/api/v1/evenements.py
from flask import Blueprint, jsonify, current_app
from flasgger import swag_from
from ..extensions import db
from sqlalchemy import func, asc, text
from ..models.personnel import Personnel
from app.models.evenement import Evenement
from ..models.commande import Commande

evenements = Blueprint("evenements", __name__, url_prefix="/api/v1")

@evenements.get("/projets/<int:idprojet>/evenements")
def list_evenements_by_project(idprojet: int):
    """
    List Evenements By Project
    ---
    tags:
      - Evenements
    parameters:
      - name: idprojet
        in: path
        required: true
        schema:
          type: integer
        description: ID du projet
    responses:
      200:
        description: Successful Response
        content:
          application/json:
            schema:
              type: array
              items:
                type: object
                properties:
                  idevenement:        { type: integer }
                  type_evenement:     { type: string }
                  date_evenement:     { type: string, format: date }
                  date_prevue:        { type: string, format: date, nullable: true }
                  description_evenement: { type: string, nullable: true }
                  statut_evenement:   { type: string, nullable: true }
                  date_realisee:      { type: string, format: date, nullable: true }
      500:
        description: Erreur serveur
        content:
          application/json:
            schema:
              type: object
              properties:
                detail: { type: string }
    """
    try:
        rows = (
            db.session.query(
                Evenement.idevenement,
                Evenement.type_evenement,
                Evenement.date_evenement,
                Evenement.date_prevue,
                Evenement.description_evenement,
                Evenement.statut_evenement,
                Evenement.date_realisee,
            )
            .filter(Evenement.idprojet == idprojet)
            .order_by(Evenement.date_evenement)
            .all()
        )

        out = []
        for r in rows:
            d = dict(r._mapping) if hasattr(r, "_mapping") else (
                r._asdict() if hasattr(r, "_asdict") else dict(r)
            )
            for k in ("date_evenement", "date_prevue", "date_realisee"):
                if d.get(k) is not None:
                    d[k] = d[k].isoformat()
            out.append(d)

        return jsonify(out), 200

    except Exception as e:
        current_app.logger.exception("Erreur événements: %s", e)
        return jsonify({"detail": "Erreur serveur lors du chargement des événements"}), 500


@evenements.get("/projets/activites/<int:activite_id>/evenements")
@swag_from({
    "tags": ["Evenements"],
    "summary": "List Evenements By Activite",
    "description": "Événements liés à une activité (triés par COALESCE(date_evenement, date_prevue)).",
    "parameters": [
        {
            "name": "activite_id",
            "in": "path",
            "required": True,
            "schema": {"type": "integer"},
            "description": "Identifiant de l’activité"
        }
    ],
    "responses": {
        "200": {
            "description": "Liste des événements",
            "content": {
                "application/json": {
                    "example": [
                        {
                            "idevenement": 1,
                            "type_evenement": "Réunion",
                            "date_evenement": "2025-10-27",
                            "date_prevue": "2025-10-27",
                            "description_evenement": "Point de suivi",
                            "statut_evenement": "planifié",
                            "date_realisee": None
                        }
                    ]
                }
            }
        },
        "500": {
            "description": "Erreur serveur lors du chargement des événements",
            "content": {
                "application/json": {
                    "example": {"detail": "Erreur serveur lors du chargement des événements"}
                }
            }
        }
    }
})
def list_evenements_by_activite(activite_id: int):
    """
    Événements liés à une activité.
    ---
    """
    try:
        rows = (
            db.session.query(
                Evenement.idevenement,
                Evenement.type_evenement,
                Evenement.date_evenement,
                Evenement.date_prevue,
                Evenement.description_evenement,
                Evenement.statut_evenement,
                Evenement.date_realisee,
            )
            .filter(Evenement.idactivite == activite_id)
            .order_by(func.coalesce(Evenement.date_evenement, Evenement.date_prevue))
            .all()
        )

        data = [
            {
                "idevenement": r.idevenement,
                "type_evenement": r.type_evenement,
                "date_evenement": (
                    r.date_evenement.isoformat() if r.date_evenement else None
                ),
                "date_prevue": r.date_prevue.isoformat() if r.date_prevue else None,
                "description_evenement": r.description_evenement,
                "statut_evenement": r.statut_evenement,
                "date_realisee": r.date_realisee.isoformat() if r.date_realisee else None,
            }
            for r in rows
        ]
        return jsonify(data), 200

    except Exception:
        # (tu peux logger l'exception si besoin)
        return jsonify({"detail": "Erreur serveur lors du chargement des événements"}), 500
    




@evenements.get("/evenements/<int:idprojet>/personnels")
def list_personnels_by_project(idprojet: int):
    """
    List Personnels By Project
    ---
    tags:
      - Evenements
    parameters:
      - in: path
        name: idprojet
        required: true
        schema:
          type: integer
        description: Identifiant du projet
    responses:
      200:
        description: Liste *distincte* des personnels ayant au moins un événement dans ce projet
        content:
          application/json:
            schema:
              type: array
              items:
                type: object
                properties:
                  idpersonnel: { type: integer }
                  nom_personnel: { type: string }
                  fonction: { type: string, nullable: true }
                  email: { type: string, nullable: true }
                  telephone: { type: string, nullable: true }
                  type: { type: string, nullable: true }
      500:
        description: Erreur serveur
    """
    try:
        # SELECT DISTINCT ... FROM personnel p
        # JOIN evenement e ON e.idpersonnel = p.idpersonnel
        # WHERE e.idprojet = :pid
        # ORDER BY p.nom_personnel
        q = (
            db.session.query(
                Personnel.idpersonnel.label("idpersonnel"),
                Personnel.nom_personnel.label("nom_personnel"),
                Personnel.fonction_personnel.label("fonction"),
                Personnel.email_personnel.label("email"),
                Personnel.telephone_personnel.label("telephone"),
                Personnel.type_personnel.label("type"),
            )
            .join(Evenement, Evenement.idpersonnel == Personnel.idpersonnel)
            .filter(Evenement.idprojet == idprojet)
            .distinct()  # <- comme dans ta version FastAPI (SELECT DISTINCT)
            .order_by(asc(Personnel.nom_personnel))
        )

        rows = [dict(r._mapping) for r in q.all()]
        return jsonify(rows), 200

    except Exception:
        db.session.rollback()
        return jsonify({"detail": "Erreur serveur"}), 500
    





def _iso(d):
    return d.isoformat() if d else None

@evenements.get("/personnels/<int:idpersonnel>/evenements")
@swag_from({
    "tags": ["Evenements"],
    "summary": "List Événements By Personnel",
    "description": "Événements liés à un personnel.",
    "parameters": [
        {
            "in": "path",
            "name": "idpersonnel",
            "schema": {"type": "integer"},
            "required": True,
            "description": "Identifiant du personnel",
        }
    ],
    "responses": {
        200: {
            "description": "OK",
            "content": {
                "application/json": {
                    "example": [
                        {
                            "idevenement": 1,
                            "type_evenement": "Réunion",
                            "date_evenement": "2025-10-27",
                            "date_prevue": "2025-10-20",
                            "description_evenement": "Kickoff",
                            "statut_evenement": "Terminé",
                            "date_realisee": "2025-10-27"
                        }
                    ]
                }
            },
        },
        500: {"description": "Erreur serveur"},
    },
})
def list_evenements_by_personnel(idpersonnel: int):
    """
    Événements liés à un personnel.
    """
    try:
        rows = (
            db.session.query(
                Evenement.idevenement,
                Evenement.type_evenement,
                Evenement.date_evenement,
                Evenement.date_prevue,
                Evenement.description_evenement,
                Evenement.statut_evenement,
                Evenement.date_realisee,
            )
            .filter(Evenement.idpersonnel == idpersonnel)
            .order_by(asc(Evenement.date_evenement))
            .all()
        )

        data = [
            {
                "idevenement": r.idevenement,
                "type_evenement": r.type_evenement,
                "date_evenement": _iso(r.date_evenement),
                "date_prevue": _iso(r.date_prevue),
                "description_evenement": r.description_evenement,
                "statut_evenement": r.statut_evenement,
                "date_realisee": _iso(r.date_realisee),
            }
            for r in rows
        ]
        return jsonify(data), 200
    except Exception:
        db.session.rollback()
        return jsonify({"detail": "Erreur serveur"}), 500
    




@evenements.get("/evenements/<int:idprojet>/commandes")
def list_commandes_by_project(idprojet: int):
    """
    List Commandes By Project
    ---
    tags:
      - Evenements
    summary: Retourne la liste DISTINCTE des commandes liées à un projet
    description: >
      Retourne la liste **distincte** des commandes qui apparaissent au moins
      une fois dans un évènement du projet `{idprojet}`.
    parameters:
      - in: path
        name: idprojet
        schema:
          type: integer
        required: true
        description: Identifiant du projet
    responses:
      200:
        description: Successful Response
        content:
          application/json:
            schema:
              type: array
              items:
                type: object
                properties:
                  idcommande:
                    type: integer
                  libelle:
                    type: string
                  nature:
                    type: string
      500:
        description: Erreur serveur
    """
    try:
        rows = (
            db.session.query(
                Commande.idcommande.label("idcommande"),
                Commande.libelle_commande.label("libelle"),
                Commande.nature_commande.label("nature"),
            )
            .join(Evenement, Evenement.idcommande == Commande.idcommande)
            .filter(Evenement.idprojet == idprojet)
            .distinct()
            .order_by(Commande.libelle_commande)
            .all()
        )

        data = [
            {"idcommande": r.idcommande, "libelle": r.libelle, "nature": r.nature}
            for r in rows
        ]
        return jsonify(data), 200

    except Exception:
        # Log si besoin: current_app.logger.exception("list_commandes_by_project")
        return jsonify({"detail": "Erreur serveur"}), 500
    



@evenements.get("/commandes/<int:idcommande>/evenements")
@swag_from({
    "tags": ["Evenements"],
    "summary": "List Evenements By Commande",
    "description": "Événements liés à une commande donnée.",
    "parameters": [
        {
            "in": "path",
            "name": "idcommande",
            "required": True,
            "schema": {"type": "integer"},
            "description": "Identifiant de la commande"
        }
    ],
    "responses": {
        "200": {
            "description": "Liste des événements",
            "schema": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "idevenement": {"type": "integer"},
                        "type_evenement": {"type": "string"},
                        "date_evenement": {"type": "string", "format": "date", "nullable": True},
                        "date_prevue": {"type": "string", "format": "date", "nullable": True},
                        "description_evenement": {"type": "string", "nullable": True},
                        "statut_evenement": {"type": "string", "nullable": True},
                        "date_realisee": {"type": "string", "format": "date", "nullable": True}
                    }
                }
            }
        },
        "404": {"description": "Commande introuvable"},
        "500": {"description": "Erreur serveur"}
    }
})
def list_evenements_by_commande(idcommande: int):
    # (Optionnel) Vérifier l'existence de la commande pour renvoyer 404 propre
    if not db.session.get(Commande, idcommande):
        return jsonify({"detail": "Commande introuvable"}), 404

    # Sélectionne uniquement les colonnes utiles (comme FastAPI)
    rows = (
        db.session.query(
            Evenement.idevenement,
            Evenement.type_evenement,
            Evenement.date_evenement,
            Evenement.date_prevue,
            Evenement.description_evenement,
            Evenement.statut_evenement,
            Evenement.date_realisee,
        )
        .filter(Evenement.idcommande == idcommande)
        .order_by(Evenement.date_evenement)
        .all()
    )

    # Mise en forme ISO des dates pour coller au frontend/Swagger
    data = []
    for r in rows:
        d = r._asdict() if hasattr(r, "_asdict") else {
            "idevenement": r[0],
            "type_evenement": r[1],
            "date_evenement": r[2],
            "date_prevue": r[3],
            "description_evenement": r[4],
            "statut_evenement": r[5],
            "date_realisee": r[6],
        }
        d["date_evenement"] = _iso(d["date_evenement"])
        d["date_prevue"] = _iso(d["date_prevue"])
        d["date_realisee"] = _iso(d["date_realisee"])
        data.append(d)

    return jsonify(data), 200






@evenements.get("/evenements/<int:idprojet>/soumissionnaires")
def list_soumissionnaires_by_project(idprojet: int):
    """
    List Soumissionnaires By Project
    ---
    tags:
      - Evenements
    parameters:
      - name: idprojet
        in: path
        required: true
        schema:
          type: integer
        description: ID du projet
    responses:
      200:
        description: Liste distincte des soumissionnaires liés à au moins un événement du projet
        content:
          application/json:
            schema:
              type: array
              items:
                type: object
                properties:
                  idsoumissionnaire: { type: integer }
                  nom: { type: string }
                  nif: { type: string, nullable: true }
      500:
        description: Erreur serveur
    """
    try:
        sql = text("""
            SELECT DISTINCT
                s.idsoumissionnaire,
                s.nom_soum  AS nom,
                s.nif_soum  AS nif
            FROM soumissionnaire s
            JOIN evenement e ON e.idsoumissionnaire = s.idsoumissionnaire
            WHERE e.idprojet = :pid
            ORDER BY s.nom_soum
        """)
        rows = db.session.execute(sql, {"pid": idprojet}).mappings().all()
        return jsonify([dict(r) for r in rows]), 200
    except Exception:
        return jsonify({"detail": "Erreur serveur"}), 500


# ---------------------------------------------------------------------
# GET /api/v1/soumissionnaires/<idsoumissionnaire>/evenements
# Événements liés à un soumissionnaire
# ---------------------------------------------------------------------
@evenements.get("/soumissionnaires/<int:idsoumissionnaire>/evenements")
def list_evenements_by_soumissionnaire(idsoumissionnaire: int):
    """
    List Evenements By Soumissionnaire
    ---
    tags:
      - Evenements
    parameters:
      - name: idsoumissionnaire
        in: path
        required: true
        schema:
          type: integer
        description: ID du soumissionnaire
    responses:
      200:
        description: Événements associés au soumissionnaire
        content:
          application/json:
            schema:
              type: array
              items:
                type: object
                properties:
                  idevenement: { type: integer }
                  type_evenement: { type: string }
                  date_evenement: { type: string, format: date, nullable: true }
                  date_prevue: { type: string, format: date, nullable: true }
                  description_evenement: { type: string, nullable: true }
                  statut_evenement: { type: string, nullable: true }
                  date_realisee: { type: string, format: date, nullable: true }
      500:
        description: Erreur serveur
    """
    try:
        sql = text("""
            SELECT
                e.idevenement,
                e.type_evenement,
                e.date_evenement,
                e.date_prevue,
                e.description_evenement,
                e.statut_evenement,
                e.date_realisee
            FROM evenement e
            WHERE e.idsoumissionnaire = :sid
            ORDER BY e.date_evenement
        """)
        rows = db.session.execute(sql, {"sid": idsoumissionnaire}).mappings().all()
        return jsonify([dict(r) for r in rows]), 200
    except Exception:
        return jsonify({"detail": "Erreur serveur"}), 500
    





@evenements.get("/transactions/<int:idtransaction>/evenements")
def list_evenements_by_transaction(idtransaction: int):
    """
    List Evenements By Transaction
    ---
    tags:
      - Evenements
    parameters:
      - in: path
        name: idtransaction
        required: true
        schema:
          type: integer
        description: ID de la transaction
    responses:
      200:
        description: Successful Response
        content:
          application/json:
            schema:
              type: array
              items:
                type: object
      500:
        description: Erreur serveur
    """
    try:
        sql = text("""
            SELECT
              e.idevenement,
              e.type_evenement,
              e.date_evenement,
              e.date_prevue,
              e.description_evenement,
              e.statut_evenement,
              e.date_realisee
            FROM evenement e
            WHERE e.idtransaction = :sid
            ORDER BY e.date_evenement
        """)
        rows = db.session.execute(sql, {"sid": idtransaction}).mappings().all()
        return jsonify([dict(r) for r in rows]), 200
    except Exception as exc:
        current_app.logger.exception("Erreur list_evenements_by_transaction")
        return jsonify({"detail": "Erreur serveur"}), 500