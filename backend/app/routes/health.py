# app/routes/health.py
from flask import Blueprint, jsonify
from ..extensions import db

bp = Blueprint("health", __name__)

@bp.get("")
def health():
    # ping DB: simple SELECT 1
    with db.engine.connect() as conn:
        conn.execute(db.text("SELECT 1"))
    return jsonify(ok=True, status="healthy", db="ok"), 200
