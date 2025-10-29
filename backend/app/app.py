from flask import Flask, redirect, request, make_response, send_from_directory
from flasgger import Swagger
from .config import settings
from .extensions import db, migrate, jwt, cors
from app.config import Config
from .core.storage import _safe_prefix


    # --- Blueprints ---

    # ...

    # ...






SWAGGER_TEMPLATE = {
    "swagger": "2.0",
    "info": {"title": settings.APP_NAME, "version": settings.APP_VERSION},
    "securityDefinitions": {
        "BearerAuth": {"type": "apiKey", "name": "Authorization", "in": "header"}
    },
    "security": [{"BearerAuth": []}],
    "definitions": {}
}

ALLOWED_ORIGINS = [
    "http://localhost:5174",
    "http://127.0.0.1:5174",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://heartfelt-conkies-1d352d.netlify.app",
    "https://gestionprojet-app.onrender.com",
]

# --- AJOUT MINIMAL : normaliser le préfixe d'URL pour éviter "C:/Program Files/Git/media" ---
def _normalize_url_prefix(v: str) -> str:
    v = (v or "").strip().replace("\\", "/")
    # si v ressemble à "C:/Program Files/Git/media", on ne garde que la partie à partir du 1er "/"
    if ":" in v and not v.startswith("/"):
        i = v.find("/")
        v = v[i:] if i >= 0 else "/"  # retombe sur "/" si vraiment bizarre
    if not v.startswith("/"):
        v = "/" + v
    return "/" + v.strip("/")  # garantit une forme "/media" (sans trailing slash)

def create_app() -> Flask:
    app = Flask(__name__)
    app.config.update(
        DEBUG=settings.DEBUG,
        SQLALCHEMY_DATABASE_URI=settings.DATABASE_URL,
        SQLALCHEMY_TRACK_MODIFICATIONS=False,
        SQLALCHEMY_ENGINE_OPTIONS={"pool_pre_ping": True, "pool_recycle": 280},
        JWT_SECRET_KEY=settings.JWT_SECRET,
    )

    # expose dans app.config pour le blueprint
    app.config["STORAGE_ROOT"] = str(settings.STORAGE_ROOT)
    app.config["MEDIA_URL_PREFIX"] = settings.MEDIA_URL_PREFIX
    app.config["PROTECT_MEDIA"] = settings.PROTECT_MEDIA

    # Évite les redirections 308 entre /path et /path/
    app.url_map.strict_slashes = False

    # --- Extensions ---
    db.init_app(app)
    
    #migrate.init_app(app, db)
    migrate.init_app(app, db, render_as_batch=False, compare_type=True, compare_server_default=True)
    with app.app_context():
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
        from .routes.auth import auth_bp

    cors.init_app(
        app,
        resources={
            r"/api/*": {
                "origins": ALLOWED_ORIGINS,
                "methods": ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
                "allow_headers": ["Content-Type", "Authorization", "Accept"],
                "expose_headers": ["Content-Disposition"],
                "supports_credentials": True,
                "max_age": 86400,
            }
        },
    )

    jwt.init_app(app)

    Swagger(app, template=SWAGGER_TEMPLATE)

    @app.before_request
    def handle_preflight():
        if request.method == "OPTIONS" and request.path.startswith("/api/"):
            origin = request.headers.get("Origin")
            acrh = request.headers.get("Access-Control-Request-Headers", "Content-Type, Authorization, Accept")
            resp = make_response("", 204)
            if origin and origin in ALLOWED_ORIGINS:
                resp.headers["Access-Control-Allow-Origin"] = origin
                resp.headers["Vary"] = "Origin"
                resp.headers["Access-Control-Allow-Credentials"] = "true"
                resp.headers["Access-Control-Allow-Methods"] = "GET,POST,PUT,PATCH,DELETE,OPTIONS"
                resp.headers["Access-Control-Allow-Headers"] = acrh
                resp.headers["Access-Control-Max-Age"] = "86400"
            return resp

    @app.after_request
    def add_cors_headers(resp):
        origin = request.headers.get("Origin")
        if origin and origin in ALLOWED_ORIGINS:
            resp.headers["Access-Control-Allow-Origin"] = origin
            resp.headers["Vary"] = "Origin"
            resp.headers["Access-Control-Allow-Credentials"] = "true"
            resp.headers["Access-Control-Allow-Methods"] = "GET,POST,PUT,PATCH,DELETE,OPTIONS"
            resp.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization, Accept"
        return resp


    app.register_blueprint(auth_bp)
    app.register_blueprint(bp_evenement)
    app.register_blueprint(bp_doc_events)
    app.register_blueprint(bp_doc_crud)
    app.register_blueprint(bp_doc_utils)
    app.register_blueprint(bp_storage)
    app.register_blueprint(bp_transactions)
    app.register_blueprint(bp_commandes)
    app.register_blueprint(bp_soumissionnaires)
    app.register_blueprint(bp_procedures)
    app.register_blueprint(bp_contrats)
    app.register_blueprint(bp_responsabilites)
    app.register_blueprint(bp_soumissions)
    app.register_blueprint(bp_personnels)
    app.register_blueprint(programmations_bp, url_prefix="/api/v1/programmations")
    app.register_blueprint(exercices_bp)
    app.register_blueprint(suivis_bp)
    app.register_blueprint(indicateurs_bp)
    app.register_blueprint(couvertures_blp)
    app.register_blueprint(sites_bp)
    app.register_blueprint(departements_bp)
    app.register_blueprint(media_bp, url_prefix="")   # /media/...
    app.register_blueprint(health_bp, url_prefix="/api/health")
    app.register_blueprint(projets_bp)
    app.register_blueprint(evenements)
    app.register_blueprint(bp_document)
    app.register_blueprint(transactions_bp)
    app.register_blueprint(activites_router)
    app.register_blueprint(implantations_bp)
    # --------- MEDIA: /media/<path:rel> -----------
    # USE NORMALIZED PREFIX HERE (fix Windows Git Bash issue)
    media_prefix = _safe_prefix()

    @app.get(media_prefix + "/<path:rel>")
    def _serve_media(rel: str):
        # settings.STORAGE_ROOT pointe vers le dossier "storage"
        from .core.storage import fs_path
        # send_from_directory veut un dossier + le fichier relatif à ce dossier
        # On découpe pour rester simple
        from pathlib import Path
        abs_path = fs_path(rel)
        root = Path(settings.STORAGE_ROOT).resolve()
        # calcul du "relatif" par rapport au root
        rel_from_root = abs_path.relative_to(root)
        return send_from_directory(str(root), str(rel_from_root).replace("\\", "/"))


    # --------- Blueprints --------------------------
    app.register_blueprint(bp_documents)  # /api/v1/documents/<id>/open

    @app.get("/docs")
    def docs_alias():
        return redirect("/apidocs", code=302)

    return app
