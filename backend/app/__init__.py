# app/__init__.py
from .routes.auth import auth_bp
from .app import create_app
from .extensions import db
from .routes.health import bp as health_bp
from .routes.projets import bp as projets_bp
from .routes.evenements import evenements
from .routes.document import bp_document
from .routes.documents import bp_documents
from .routes.media import media_bp
from .routes.transactions import transactions_bp
from .routes.departements import bp as departements_bp
from .routes.sites import bp as sites_bp
from .routes.activites import router as activites_router
from .routes.implantations import implantations_bp
from .routes.couvertures import blp as couvertures_blp
from .routes.indicateurs import indicateurs_bp
from .routes.suivis import suivis_bp
from .routes.exercices import exercices_bp
from app.routes.programmations import programmations_bp
from app.routes.personnels import bp_personnels
from app.routes.soumissions import bp_soumissions
from app.routes.responsabilites import bp_responsabilites
from app.routes.contrats import bp_contrats
from app.routes.procedures import bp_procedures
from app.routes.commandes import bp_commandes
from app.routes.soumissionnaires import  bp_soumissionnaires
from .routes.transactions_1 import bp_transactions
from .routes.document_1 import bp_doc_crud, bp_doc_utils,bp_doc_events,bp_storage
from .routes.evenement import bp_evenement
__all__ = ["create_app", "db"]
