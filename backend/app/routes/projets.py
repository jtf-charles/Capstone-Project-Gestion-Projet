from flask import Blueprint, jsonify,current_app,abort
from sqlalchemy import desc,select,text,asc,case,distinct,literal,desc,func
from ..models import Projet
from flasgger import Swagger,swag_from
from ..extensions import db
from sqlalchemy.orm import aliased
from datetime import date
from calendar import monthrange


from decimal import Decimal, InvalidOperation
from datetime import datetime
from flask import Blueprint, request, abort
from sqlalchemy.exc import IntegrityError


from app.models.soumission import Soumission
from app.models.soumissionnaire import Soumissionnaire
from app.models.commande import Commande
from app.models.procedure_table import ProcedureTable
from app.models.exercice_budgetaire import ExerciceBudgetaire
from app.models.programmation import Programmation
from ..models.activite import Activite
from ..models.implantation import Implantation
from ..models.site import Site
from app.models.couverture import Couverture
from ..models.departement import Departement
from app.models.suivi import Suivi
from app.models.indicateur import Indicateur
from app.models.personnel import Personnel
from app.models.responsabilites import Responsabilites
from app.models.contrat import Contrat
bp = Blueprint("projets_v1", __name__, url_prefix="/api/v1/projets")

# Définitions Swagger pour cette entité
SWAGGER_DEFINITIONS = {
    "Projet": {
        "type": "object",
        "properties": {
            "idprojet":               {"type": "integer"},
            "code_projet":            {"type": "string"},
            "initule_projet":         {"type": "string", "nullable": True},
            "description_projet":     {"type": "string", "nullable": True},
            "date_demarrage_prevue":  {"type": "string", "format": "date", "nullable": True},
            "date_fin_prevue":        {"type": "string", "format": "date", "nullable": True},
            "date_demarrage_reelle":  {"type": "string", "format": "date", "nullable": True},
            "date_fin_reelle_projet": {"type": "string", "format": "date", "nullable": True},
            "etat":                   {"type": "string"},
            "budget_previsionnel":    {"type": "number", "format": "float"},
            "devise":                 {"type": "string"}
        }
    }
}

def _inject_swagger_defs(app):
    ext = app.extensions.get("flasgger")
    if isinstance(ext, dict) and "swagger" in ext:
        tpl = ext["swagger"].template
    elif isinstance(ext, Swagger):
        tpl = ext.template
    else:
        return  # Swagger pas encore prêt (ne devrait pas arriver si on init avant)
    tpl.setdefault("definitions", {}).update(SWAGGER_DEFINITIONS)

@bp.record_once
def _register_swagger_definitions(state):
    # comme Swagger est initialisé avant register_blueprint, on peut injecter tout de suite
    _inject_swagger_defs(state.app)

@bp.get("/")
def list_projets_v1():
    """
    List Projets
    ---
    tags:
      - projets
    responses:
      200:
        description: Successful Response
        schema:
          type: array
          items:
            $ref: "#/definitions/Projet"
    """
    rows = Projet.query.order_by(desc(Projet.idprojet)).all()
    return jsonify([r.to_dict() for r in rows]), 200

# ---------- GET /api/v1/projets/{project_id} ----------
@bp.get("/<int:project_id>")
def get_projet(project_id: int):
    """
    Get Project
    ---
    tags: [projets]
    parameters:
      - in: path
        name: project_id
        type: integer
        required: true
        description: project_id
    responses:
      200:
        description: Successful Response
        schema:
          $ref: "#/definitions/Projet"
      404:
        description: Not Found
        schema:
          $ref: "#/definitions/NotFound"
    """
    projet = Projet.query.get(project_id)
    if not projet:
        return jsonify({"detail": "Project not found"}), 404
    return jsonify(projet.to_dict()), 200

@bp.get("/<int:project_id>/activites")
@swag_from({
    "tags": ["projets"],
    "summary": "Project Activities",
    "description": "Liste des activités d’un projet. Tri avec NULLS LAST sur dateDemarragePrevue_act.",
    "parameters": [
        {"in": "path", "name": "project_id", "type": "integer", "required": True}
    ],
    "responses": {
        200: {
            "description": "Successful Response",
            "schema": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "idprojet":               {"type": "integer"},
                        "idactivite":             {"type": "integer"},
                        "titre_act":              {"type": "string", "nullable": True},
                        "description_act":        {"type": "string", "nullable": True},
                        "dateDemarragePrevue_act":{"type": "string", "format": "date", "nullable": True},
                        "dateFinPrevue_act":      {"type": "string", "format": "date", "nullable": True},
                    }
                }
            }
        }
    }
})
def project_activities(project_id: int):
    """
    GET /api/v1/projets/<project_id>/activites
    Retourne les activités du projet avec un tri « NULLS LAST » sur dateDemarragePrevue_act.
    """
    # NULLS LAST en SQLAlchemy: case((col.is_(None), 1), else_=0), col
    nulls_last = case((Activite.dateDemarragePrevue_act.is_(None), 1), else_=0)

    rows = (
        db.session.query(
            Activite.idprojet.label("idprojet"),
            Activite.idactivite.label("idactivite"),
            Activite.titre_act.label("titre_act"),
            Activite.description_act.label("description_act"),
            Activite.dateDemarragePrevue_act.label("dateDemarragePrevue_act"),
            Activite.dateFinPrevue_act.label("dateFinPrevue_act"),
        )
        .filter(Activite.idprojet == project_id)
        .order_by(
            nulls_last,                       # met les NULL en dernier
            Activite.dateDemarragePrevue_act, # puis par date
            Activite.idactivite               # puis par id (stable)
        )
        .all()
    )

    # rows = liste de Row ; _asdict() donne un dict {clé: valeur} avec nos labels
    data = [dict(r._asdict()) for r in rows]
    return jsonify(data), 200




@bp.get("/activites/<int:activite_id>/implantations")
@swag_from({
    "tags": ["projets"],
    "summary": "Project Activite Implantations",
    "description": "Retourne, pour une activité donnée, la liste des sites d'implantation avec le département du site.",
    "parameters": [
        {"in": "path", "name": "activite_id", "type": "integer", "required": True}
    ],
    "responses": {
        200: {
            "description": "Successful Response",
            "schema": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "idsite":      {"type": "integer"},
                        "site":        {"type": "string", "nullable": True},
                        "departement": {"type": "string", "nullable": True}
                    }
                }
            }
        }
    }
})
def project_activite_implantations(activite_id: int):
    """
    GET /api/v1/projets/activites/<activite_id>/implantations
    ORM pur, même payload que FastAPI : [{idsite, site, departement}, ...]
    """

    # Optionnel : NULLS LAST sur le tri par localité
    nulls_last = case((Site.localite.is_(None), 1), else_=0)

    rows = (
        db.session.query(
            Site.idsite.label("idsite"),
            Site.localite.label("site"),
            Departement.departement.label("departement"),
        )
        .join(Implantation, Implantation.idsite == Site.idsite)
        .join(Departement, Departement.iddepartement == Site.iddepartement)
        .filter(Implantation.idactivite == activite_id)
        .order_by(nulls_last, Site.localite)
        .all()
    )

    data = [dict(r._asdict()) for r in rows]
    return jsonify(data), 200


@bp.get("/activites/<int:activite_id>/suivi")
def get_activite_suivi(activite_id: int):
    """
    Retourne, pour une activité donnée, la liste des indicateurs
    avec niveaux (base/cible/actuel) et un statut calculé.

    ---
    tags:
      - projets
    parameters:
      - in: path
        name: activite_id
        required: true
        schema:
          type: integer
    responses:
      200:
        description: OK
        content:
          application/json:
            schema:
              type: array
              items:
                type: object
                properties:
                  libelle_indicateur: { type: string }
                  niveau_base:        { type: number, nullable: true }
                  niveau_cible:       { type: number, nullable: true }
                  niveau_actuel:      { type: number, nullable: true }
                  statut_indicateur:  { type: string }
    """
    # CASE WHEN i.niveau_actuel >= i.niveau_cible THEN 'Atteint' ELSE 'Pas encore atteint'
    statut_expr = case(
        (Indicateur.niveau_actuel >= Indicateur.niveau_cible, "Atteint"),
        else_="Pas encore atteint",
    ).label("statut_indicateur")

    q = (
        db.session.query(
            Indicateur.libelle_indicateur.label("libelle_indicateur"),
            Indicateur.niveau_base.label("niveau_base"),
            Indicateur.niveau_cible.label("niveau_cible"),
            Indicateur.niveau_actuel.label("niveau_actuel"),
            statut_expr,
        )
        .join(Suivi, Suivi.idindicateur == Indicateur.idindicateur)
        .filter(Suivi.idactivite == activite_id)
        .order_by(Indicateur.libelle_indicateur)
    )

    rows = [
        {
            "libelle_indicateur": r.libelle_indicateur,
            "niveau_base": r.niveau_base,
            "niveau_cible": r.niveau_cible,
            "niveau_actuel": r.niveau_actuel,
            "statut_indicateur": r.statut_indicateur,
        }
        for r in q.all()
    ]
    return jsonify(rows), 200


def _diff_months_days(d1: date, d2: date) -> tuple[int, int]:
    """
    Renvoie (mois, jours) exacts entre d1 et d2.
    Évite TIMESTAMPDIFF en SQL pour rester portable.
    """
    months = (d2.year - d1.year) * 12 + (d2.month - d1.month)

    # date "ancre" = d1 + <months> mois (en bornant le jour au dernier jour du mois)
    def anchor(y, m, day):
        return date(y, m, min(day, monthrange(y, m)[1]))

    ay = d1.year + (d1.month - 1 + months) // 12
    am = (d1.month - 1 + months) % 12 + 1
    anchor_date = anchor(ay, am, d1.day)

    # si on a dépassé d2, recule d'un mois et recalcule l'ancre
    if d2 < anchor_date:
        months -= 1
        ay = d1.year + (d1.month - 1 + months) // 12
        am = (d1.month - 1 + months) % 12 + 1
        anchor_date = anchor(ay, am, d1.day)

    days = (d2 - anchor_date).days
    return months, days

@bp.get("/activites/<int:activite_id>/responsables")
@swag_from({
    "tags": ["projets"],
    "summary": "Project Activite Responsables",
    "operationId": "get_api_v1_projets_activites__activite_id__responsables",
    "parameters": [
        {
            "name": "activite_id",
            "in": "path",
            "required": True,
            "type": "integer",
            "description": "ID de l'activité"
        }
    ],
    "responses": {
        "200": {
            "description": "Liste des responsables de l'activité",
            "schema": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "nom_personnel":   {"type": "string"},
                        "fonction":        {"type": "string"},
                        "email":           {"type": "string"},
                        "telephone":       {"type": "string"},
                        "type":            {"type": "string"},
                        "date_debut_act":  {"type": "string", "format": "date"},
                        "date_fin_act":    {"type": "string", "format": "date"},
                        "statut_duree":    {"type": "string"}
                    }
                }
            },
            "examples": {
                "application/json": [
                    {
                        "nom_personnel": "string",
                        "fonction": "string",
                        "email": "string",
                        "telephone": "string",
                        "type": "string",
                        "date_debut_act": "2025-10-27",
                        "date_fin_act": "2025-10-27",
                        "statut_duree": "En cours depuis 3 mois et 5 jours"
                    }
                ]
            }
        },
        "500": {"description": "Erreur serveur"}
    }
})
def project_activite_responsables(activite_id: int):
    stmt = (
        select(
            Personnel.nom_personnel.label("nom_personnel"),
            Personnel.fonction_personnel.label("fonction"),
            Personnel.email_personnel.label("email"),
            Personnel.telephone_personnel.label("telephone"),
            Personnel.type_personnel.label("type"),
            Responsabilites.date_debut_act.label("date_debut_act"),
            Responsabilites.date_fin_act.label("date_fin_act"),
        )
        .join(Responsabilites, Responsabilites.idpersonnel == Personnel.idpersonnel)
        .where(Responsabilites.idactivite == activite_id)
        .order_by(Responsabilites.date_debut_act)
    )

    rows = db.session.execute(stmt).all()
    today = date.today()
    out = []
    for r in rows:
        debut = r.date_debut_act
        fin = r.date_fin_act
        if debut:
            end_ref = fin or today
            m, d = _diff_months_days(debut, end_ref)
            prefix = "Complétée après " if fin else "En cours depuis "
            statut = f"{prefix}{m} mois" + (f" et {d} jours" if d > 0 else "")
        else:
            statut = None

        out.append({
            "nom_personnel": r.nom_personnel,
            "fonction": r.fonction,
            "email": r.email,
            "telephone": r.telephone,
            "type": r.type,
            "date_debut_act": debut.isoformat() if debut else None,
            "date_fin_act": fin.isoformat() if fin else None,
            "statut_duree": statut,
        })
    return jsonify(out)



@bp.get("/activites/<int:activite_id>/exercices")
def get_api_v1_projets_activites__activite_id__exercices(activite_id: int):
    """
    Project Activite Exercices
    ---
    tags:
      - projets
    parameters:
      - in: path
        name: activite_id
        required: true
        schema:
          type: integer
        description: ID de l'activité
    responses:
      200:
        description: Exercice(s) fiscal(aux) d'une activité (année, date début/fin).
        content:
          application/json:
            schema:
              type: array
              items:
                type: object
                properties:
                  annee:
                    type: integer
                    example: 2025
                  date_debut_exe:
                    type: string
                    format: date
                    nullable: true
                  date_fin_exe:
                    type: string
                    format: date
                    nullable: true
      500:
        description: Erreur serveur
    """
    try:
        rows = (
            db.session.query(
                distinct(ExerciceBudgetaire.annee).label("annee"),
                ExerciceBudgetaire.date_debut_exe.label("date_debut_exe"),
                ExerciceBudgetaire.date_fin_exe.label("date_fin_exe"),
            )
            .join(
                Programmation,
                Programmation.idexercice_budgetaire == ExerciceBudgetaire.idexercice_budgetaire,
            )
            .filter(Programmation.idactivite == activite_id)
            .order_by(ExerciceBudgetaire.date_debut_exe)
            .all()
        )

        def _row_to_dict(r):
            # annee peut être VARCHAR(4) côté DB ; on renvoie un int si possible (comme FastAPI)
            try:
                annee_val = int(r.annee) if r.annee is not None else None
            except ValueError:
                annee_val = None
            return {
                "annee": annee_val,
                "date_debut_exe": r.date_debut_exe.isoformat() if r.date_debut_exe else None,
                "date_fin_exe": r.date_fin_exe.isoformat() if r.date_fin_exe else None,
            }

        payload = [_row_to_dict(r) for r in rows]
        return jsonify(payload), 200

    except Exception:
        # Tu peux logger l'erreur si besoin
        return jsonify({"detail": "Erreur serveur lors du chargement des exercices fiscaux"}), 500
    



@bp.get("/<int:project_id>/departements")
@swag_from({
    "tags": ["projets"],
    "summary": "Project Departements",
    "description": (
        "Retourne les départements couverts par le projet {project_id}.\n\n"
        "- Table de lien : **couverture(iddepartement, idprojet)**\n"
        "- Table des départements : **departement(iddepartement, departement)**\n"
        "- On renvoie le format attendu par le front en **ALIASANT** :\n"
        "  '' -> code_departement (pas de code en base)\n"
        "  departement.departement -> nom_departement"
    ),
    "parameters": [
        {
            "name": "project_id",
            "in": "path",
            "required": True,
            "schema": {"type": "integer"},
            "description": "ID du projet",
        }
    ],
    "responses": {
        "200": {
            "description": "Successful Response",
            "content": {
                "application/json": {
                    "example": [
                        {"iddepartement": 10, "nom_departement": "Artibonite", "code_departement": ""}
                    ]
                }
            },
        },
        "500": {"description": "Erreur serveur"},
    },
})
def get_project_departements(project_id: int):
    """
    Retourne les départements couverts par le projet {project_id}.
    """
    try:
        # ORM pur, mêmes alias que la version FastAPI
        q = (
            db.session.query(
                Departement.iddepartement.label("iddepartement"),
                Departement.departement.label("nom_departement"),
                literal("").label("code_departement")  # pas de code en base -> chaîne vide
            )
            .join(Couverture, Couverture.iddepartement == Departement.iddepartement)
            .filter(Couverture.idprojet == project_id)
            .order_by(Departement.departement)
        )

        rows = q.all()
        data = [
            {
                "iddepartement": r.iddepartement,
                "nom_departement": r.nom_departement,
                "code_departement": r.code_departement,
            }
            for r in rows
        ]
        return jsonify(data), 200

    except Exception as e:
        return jsonify({"detail": f"Erreur serveur lors du chargement des départements: {e}"}), 500
    



@bp.get("/<int:project_id>/personnels")
@swag_from({
    "tags": ["projets"],
    "summary": "List Project Personnels",
    "description": (
        "Personnels liés à un projet (projet -> activité -> responsabilités -> personnel) "
        "+ infos de contrat éventuelles."
    ),
    "parameters": [{
        "name": "project_id",
        "in": "path",
        "required": True,
        "schema": {"type": "integer"}
    }],
    "responses": {
        "200": {
            "description": "Successful Response",
            "content": {
                "application/json": {
                    "example": [
                        {
                            "nom": "string",
                            "fonction": "string",
                            "email": "string",
                            "telephone": "string",
                            "type": "string",
                            "date_signature": "2025-10-27",
                            "date_debut_contrat": "2025-10-27",
                            "date_fin_contrat": "2025-10-27",
                            "duree_contrat": 0
                        }
                    ]
                }
            }
        },
        "500": {"description": "Erreur serveur"}
    }
})
def get_api_v1_projets__project_id__personnels(project_id: int):
    """
    Reproduit fidèlement la logique FastAPI :
    SELECT DISTINCT ... FROM projet/activite/responsabilites/personnel LEFT JOIN contrat
    WHERE activite.idprojet = :pid
    ORDER BY nom_personnel, date_debut_contrat
    """
    try:
        # alias facultatifs si besoin
        A = aliased(Activite)
        R = aliased(Responsabilites)
        P = aliased(Personnel)
        C = aliased(Contrat)

        stmt = (
            select(
                P.nom_personnel.label("nom"),
                P.fonction_personnel.label("fonction"),
                P.email_personnel.label("email"),
                P.telephone_personnel.label("telephone"),
                P.type_personnel.label("type"),
                C.date_signature.label("date_signature"),
                C.date_debut_contrat.label("date_debut_contrat"),
                C.date_fin_contrat.label("date_fin_contrat"),
                C.duree_contrat.label("duree_contrat"),
            )
            .select_from(R)
            .join(A, R.idactivite == A.idactivite)
            .join(P, R.idpersonnel == P.idpersonnel)
            .outerjoin(C, C.idpersonnel == P.idpersonnel)
            .where(A.idprojet == project_id)
            .order_by(P.nom_personnel, C.date_debut_contrat)
        )

        rows = db.session.execute(stmt).mappings().all()
        # rows est une liste de RowMapping -> on renvoie tel quel (dictionnaires)
        return jsonify([dict(r) for r in rows]), 200

    except Exception as e:
        # log optionnel: current_app.logger.exception(e)
        return jsonify({"detail": f"Erreur DB: {e}"}), 500
    

@bp.get("/<int:idprojet>/commandes")
@swag_from({
    "tags": ["projets"],
    "summary": "List Project Commandes",
    "parameters": [{
        "name": "idprojet",
        "in": "path",
        "required": True,
        "schema": {"type": "integer"},
        "description": "ID du projet"
    }],
    "responses": {
        "200": {
            "description": "Successful Response",
            "content": {
                "application/json": {
                    "schema": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "idcommande":       {"type": "integer"},
                                "montant_commande": {"type": "number", "format": "float"},
                                "libelle_commande": {"type": "string", "nullable": True},
                                "nature_commande":  {"type": "string", "nullable": True},
                                "type_commande":    {"type": "string", "nullable": True},
                                "type_procedure":   {"type": "string", "nullable": True}
                            }
                        }
                    }
                }
            }
        },
        "500": {"description": "Erreur serveur"}
    }
})
def list_project_commandes(idprojet: int):
    """
    Retourne la liste des commandes d'un projet (même payload que la route FastAPI).
    - LEFT JOIN sur procedure_table pour récupérer `type_procedure`.
    - Tri DESC sur `montant_commande`.
    """
    try:
        # ORM pur, équivalent du SQL de la version FastAPI
        query = (
            db.session.query(
                Commande.idcommande.label("idcommande"),
                Commande.montant_commande.label("montant_commande"),
                Commande.libelle_commande.label("libelle_commande"),
                Commande.nature_commande.label("nature_commande"),
                Commande.type_commande.label("type_commande"),
                ProcedureTable.type_procedure.label("type_procedure"),
            )
            .outerjoin(ProcedureTable, ProcedureTable.idprocedure == Commande.idprocedure)
            .filter(Commande.idprojet == idprojet)
            .order_by(desc(Commande.montant_commande))
        )

        rows = query.all()

        # sérialisation fidèle à FastAPI (décimaux -> float)
        def _to_dict(r):
            return {
                "idcommande":       r.idcommande,
                "montant_commande": float(r.montant_commande) if r.montant_commande is not None else None,
                "libelle_commande": r.libelle_commande,
                "nature_commande":  r.nature_commande,
                "type_commande":    r.type_commande,
                "type_procedure":   r.type_procedure,
            }

        return jsonify([_to_dict(r) for r in rows]), 200

    except Exception as e:
        # Loggez si besoin: current_app.logger.exception(...)
        return jsonify({"detail": f"Erreur DB: {e}"}), 500
    


@bp.get("/commandes/<int:commande_id>/soumissionnaires")
def get_commande_soumissionnaires(commande_id: int):
    """
    Project Commande Soumissionnaires
    ---
    tags:
      - projets
    summary: Project Commande Soumissionnaires
    description: Soumissionnaires d'une commande (nom, NIF, adresse, téléphone, statut, email).
    parameters:
      - name: commande_id
        in: path
        required: true
        schema:
          type: integer
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
                  nom_soumissionnaire:
                    type: string
                  nif:
                    type: string
                    nullable: true
                  adresse:
                    type: string
                    nullable: true
                  telephone:
                    type: string
                    nullable: true
                  statut:
                    type: string
                    nullable: true
                  email:
                    type: string
                    nullable: true
      500:
        description: Erreur serveur lors du chargement des soumissionnaires
    """
    try:
        q = (
            db.session.query(
                Soumissionnaire.nom_soum.label("nom_soumissionnaire"),
                Soumissionnaire.nif_soum.label("nif"),
                Soumissionnaire.adresse_soum.label("adresse"),
                Soumissionnaire.telephone_soum.label("telephone"),
                Soumissionnaire.statut_soum.label("statut"),
                Soumissionnaire.email_soum.label("email"),
            )
            .join(
                Soumission,
                Soumission.idsoumissionnaire == Soumissionnaire.idsoumissionnaire,
            )
            .filter(Soumission.idcommande == commande_id)
            .order_by(Soumissionnaire.nom_soum.asc())
        )

        rows = [dict(r._asdict()) for r in q.all()]
        return jsonify(rows), 200

    except Exception as e:
        current_app.logger.exception(
            "Erreur serveur lors du chargement des soumissionnaires (commande_id=%s)",
            commande_id,
        )
        return jsonify({"detail": "Erreur serveur lors du chargement des soumissionnaires"}), 500
    

@bp.get("/commandes/<int:commande_id>/titulaires")
def get_commande_titulaires(commande_id: int):
    """
    Project Commande Titulaires
    ---
    tags: [projets]
    parameters:
      - in: path
        name: commande_id
        required: true
        schema:
          type: integer
    responses:
      200:
        description: Titulaire(s) du marché (soumissionnaires gagnants) pour la commande
        content:
          application/json:
            example:
              - nom_soumissionnaire: "ACME SARL"
                nif: "123456789"
                adresse: "Rue 1"
                telephone: "+509-555-0000"
                statut: "actif"
                email: "contact@acme.ht"
                date_soumission: "2025-10-27"
                statut_soumission: "gagnante"
      500:
        description: Erreur serveur
    """
    session = db.session()
    try:
        q = (
            select(
                Soumissionnaire.nom_soum.label("nom_soumissionnaire"),
                Soumissionnaire.nif_soum.label("nif"),
                Soumissionnaire.adresse_soum.label("adresse"),
                Soumissionnaire.telephone_soum.label("telephone"),
                Soumissionnaire.statut_soum.label("statut"),
                Soumissionnaire.email_soum.label("email"),
                Soumission.date_soumission.label("date_soumission"),
                Soumission.statut_soumission.label("statut_soumission"),
            )
            .join(Soumission, Soumission.idsoumissionnaire == Soumissionnaire.idsoumissionnaire)
            .where(Soumission.idcommande == commande_id)
            # fidèle à FastAPI : uniquement les gagnants
            .where(func.lower(func.trim(Soumission.statut_soumission)) == "gagnante")
            # même ordre que FastAPI (COALESCE sur la date puis nom)
            .order_by(func.coalesce(Soumission.date_soumission, func.date("0001-01-01")).asc(),
                      Soumissionnaire.nom_soum.asc())
        )

        rows = session.execute(q).mappings().all()
        return jsonify([dict(r) for r in rows]), 200

    except Exception as e:
        current_app.logger.exception("Erreur titulaires (commande_id=%s)", commande_id)
        return jsonify({"detail": "Erreur serveur lors du chargement des titulaires"}), 500
    finally:
        session.close()















# ---------- helpers ----------
def parse_date(value):
    if value in (None, "", "null"):
        return None
    try:
        if isinstance(value, date):
            return value
        return datetime.strptime(str(value), "%Y-%m-%d").date()
    except Exception:
        abort(400, description=f"Format de date invalide: {value!r}. Attendu 'YYYY-MM-DD'.")

def parse_decimal(value, field_name):
    if value in (None, "", "null"):
        return None
    try:
        return Decimal(str(value))
    except (InvalidOperation, ValueError):
        abort(400, description=f"Valeur numérique invalide pour {field_name}: {value!r}.")

def apply_payload_to_instance(instance: Projet, payload: dict, *, partial: bool = False):
    if not partial:
        for req_key in ("code_projet", "etat", "budget_previsionnel"):
            if req_key not in payload:
                abort(400, description=f"Champ requis manquant: {req_key}")

    mapping = {
        "code_projet": ("str", "code_projet"),
        "initule_projet": ("str", "initule_projet"),
        "description_projet": ("str", "description_projet"),
        "date_demarrage_prevue": ("date", "date_demarrage_prevue"),
        "date_fin_prevue": ("date", "date_fin_prevue"),
        "date_demarrage_reelle": ("date", "date_demarrage_reelle"),
        "date_fin_reelle_projet": ("date", "date_fin_reelle_projet"),
        "etat": ("str", "etat"),
        "budget_previsionnel": ("dec", "budget_previsionnel"),
        "devise": ("str", "devise"),
    }

    for key, (kind, attr) in mapping.items():
        if key not in payload and partial:
            continue
        val = payload.get(key)
        if kind == "date":
            val = parse_date(val)
        elif kind == "dec":
            val = parse_decimal(val, key)
        elif kind == "str" and val is not None:
            val = str(val)
        setattr(instance, attr, val)
    return instance


# ============== ROUTES ==============

@bp.post("/")
def create_projet():
    """
    Create Projet
    ---
    tags: [projets]
    requestBody:
      required: true
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/ProjetRequest'
          example:
            code_projet: "PROJET_X"
            initule_projet: "Projet X"
            description_projet: "Description"
            date_demarrage_prevue: "2025-01-01"
            date_fin_prevue: "2025-01-31"
            date_demarrage_reelle: "2025-01-03"
            date_fin_reelle_projet: "2025-02-01"
            etat: "En cours"
            budget_previsionnel: 1000000
            devise: "HTG"
    responses:
      201:
        description: Successful Response
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/ProjetResponse'
    """
    if not request.is_json:
        abort(400, description="Le corps de la requête doit être en JSON.")
    payload = request.get_json() or {}

    projet = Projet()
    apply_payload_to_instance(projet, payload, partial=False)

    try:
        db.session.add(projet)
        db.session.commit()
    except IntegrityError as e:
        db.session.rollback()
        abort(400, description=f"Erreur d'intégrité: {str(e.orig)}")

    return jsonify(projet.to_dict()), 201




@bp.put("/<int:idprojet>")
def update_projet(idprojet: int):
    """
    Update Projet
    ---
    tags: [projets]
    parameters:
      - in: path
        name: idprojet
        schema: { type: integer, minimum: 1 }
        required: true
        description: idprojet
    requestBody:
      required: true
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/ProjetRequest'
          example:
            code_projet: "PROJET_X"
            initule_projet: "Projet X (maj)"
            description_projet: "Description mise à jour"
            date_demarrage_prevue: "2025-02-01"
            date_fin_prevue: "2025-02-28"
            date_demarrage_reelle: "2025-02-03"
            date_fin_reelle_projet: "2025-03-01"
            etat: "Clos"
            budget_previsionnel: 1200000
            devise: "HTG"
    responses:
      200:
        description: Successful Response
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/ProjetResponse'
      404:
        description: Projet introuvable
    """
    if not request.is_json:
        abort(400, description="Le corps de la requête doit être en JSON.")
    payload = request.get_json() or {}

    projet = db.session.get(Projet, idprojet)
    if not projet:
        abort(404, description="Projet introuvable.")

    apply_payload_to_instance(projet, payload, partial=True)

    try:
        db.session.commit()
    except IntegrityError as e:
        db.session.rollback()
        abort(400, description=f"Erreur d'intégrité: {str(e.orig)}")

    return jsonify(projet.to_dict()), 200


@bp.delete("/<int:idprojet>")
def delete_projet(idprojet: int):
    """
    Delete Projet
    ---
    tags: [projets]
    parameters:
      - in: path
        name: idprojet
        schema: { type: integer, minimum: 1 }
        required: true
        description: idprojet
    responses:
      200:
        description: Successful Response
        content:
          application/json:
            schema:
              type: object
              properties:
                ok: { type: boolean, example: true }
                deleted: { type: integer, example: 1 }
      404:
        description: Projet introuvable
    """
    projet = db.session.get(Projet, idprojet)
    if not projet:
        abort(404, description="Projet introuvable.")
    db.session.delete(projet)
    db.session.commit()
    return jsonify({"ok": True, "deleted": idprojet}), 200