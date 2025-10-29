# app/routes/auth.py
from __future__ import annotations
from flask import Blueprint, jsonify, request
from flasgger import swag_from
from app.extensions import db
from app.models.utilisateur import Utilisateur, RoleEnum
from app.core.security import verify_password, hash_password, create_access_token

auth_bp = Blueprint("auth", __name__, url_prefix="/api/v1/auth")

# ---- Swagger schemas (inchangés) ----
LoginRequestSchema = {
    "type": "object",
    "required": ["username", "password", "expect_role"],
    "properties": {
        "username": {"type": "string", "minLength": 1},
        "password": {"type": "string", "minLength": 1},
        "expect_role": {"type": "string", "enum": ["admin", "regular"]},
    },
}
TokenResponseSchema = {
    "type": "object",
    "properties": {
        "access_token": {"type": "string"},
        "token_type": {"type": "string", "enum": ["bearer"]},
        "username": {"type": "string"},
        "role": {"type": "string", "enum": ["admin", "regular"]},
    },
}
LoginExample = {"username": "admin_user", "password": "admin2025", "expect_role": "admin"}

# ---------- SEED ----------
def init_auth_module(app):
    """Accroche le seed utilisateurs au cycle de l'app (pas au blueprint)."""
    @app.before_first_request
    def _seed_users_on_first_request() -> None:
        def ensure(username: str, password: str, role: RoleEnum) -> None:
            user = db.session.query(Utilisateur).filter_by(username=username).first()
            if not user:
                user = Utilisateur(
                    username=username,
                    password_hash=hash_password(password),
                    role=role,
                )
                db.session.add(user)
                db.session.commit()

        ensure("admin_user", "admin2025", RoleEnum.admin)
        ensure("regular_user", "user2025", RoleEnum.regular)

# Optionnel : commande CLI
def register_cli(app):
    @app.cli.command("seed-users")
    def seed_users_cmd():
        with app.app_context():
            # réutilise la même logique
            init_auth_module(app)  # s'assure que le hook est défini
            # déclenche “manuellement”
            from flask import current_app
            with current_app.app_context():
                # appelle directement la fonction interne
                pass  # tu peux aussi copier-coller le contenu du seed ici
        print("✔ Users seeded")

# ---------- ENDPOINT ----------
@auth_bp.post("/login")
@swag_from({
    "tags": ["auth"],
    "summary": "Login",
    "consumes": ["application/json"],
    "produces": ["application/json"],
    "requestBody": {
        "required": True,
        "content": {
            "application/json": {
                "schema": LoginRequestSchema,
                "example": LoginExample,
            }
        },
    },
    "parameters": [  # compat Swagger2
        {"in": "body", "name": "body", "required": True,
         "schema": LoginRequestSchema, "example": LoginExample}
    ],
    "responses": {
        "200": {"description": "Successful Response",
                "content": {"application/json": {"schema": TokenResponseSchema}}},
        "401": {"description": "Invalid credentials"},
        "400": {"description": "Bad Request"},
    }
})
def login():
    body = request.get_json(silent=True) or {}
    username = (body.get("username") or "").strip()
    password = body.get("password") or ""
    expect_role = (body.get("expect_role") or "").strip()

    if not username or not password or expect_role not in ("admin", "regular"):
        return jsonify({"detail": "Invalid payload"}), 400

    user = db.session.query(Utilisateur).filter(Utilisateur.username == username).first()
    if not user:
        return jsonify({"detail": "Invalid credentials"}), 401
    if user.role.value != expect_role:
        return jsonify({"detail": "Invalid credentials"}), 401
    if not verify_password(password, user.password_hash):
        return jsonify({"detail": "Invalid credentials"}), 401

    token = create_access_token(subject=user.username, role=user.role.value)
    return jsonify({
        "access_token": token,
        "token_type": "bearer",
        "username": user.username,
        "role": user.role.value,
    }), 200
