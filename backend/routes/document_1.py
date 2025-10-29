# app/api/v1/documents.py
from __future__ import annotations

from typing import Any, Dict, List, Optional
from datetime import date, datetime
from pathlib import Path
import mimetypes

from flask import Blueprint, jsonify, request, send_file
from flasgger import swag_from
from sqlalchemy import text
from sqlalchemy.orm import Session

# Ton scoped_session SQLAlchemy
from ..extensions import db  # db.session -> Session

# Tes helpers de stockage (déjà existants chez toi)
from app.core.storage import fs_path, public_url
from app.core.files_ import next_available_name

# ───────────────────────────────────────── Helpers (dates ISO)
def _to_iso_date(v) -> Optional[str]:
    """Retourne 'YYYY-MM-DD' (ou None). Supporte date/datetime/str."""
    if v is None:
        return None
    if isinstance(v, datetime):
        return v.date().isoformat()
    if isinstance(v, date):
        return v.isoformat()
    s = str(v)
    if len(s) >= 10 and s[4] == "-" and s[7] == "-":
        return s[:10]
    try:
        return s.split(" ")[0].split("T")[0]
    except Exception:
        return s

def _iso_row(row: Dict[str, Any], fields: List[str]) -> Dict[str, Any]:
    out = dict(row)
    for f in fields:
        if f in out:
            out[f] = _to_iso_date(out[f])
    return out
# ───────────────────────────────────────── SQL base
_SQL_SELECT = """
SELECT
  d.iddocument,
  d.chemin,
  d.date_ajout,
  d.titre_document,
  d.description_document,
  COALESCE(COUNT(a.idarchive), 0) AS nb_archives
FROM document d
LEFT JOIN archive a ON a.iddocument = d.iddocument
"""

def _one(session: Session, did: int) -> Optional[Dict[str, Any]]:
    row = session.execute(
        text(_SQL_SELECT + " WHERE d.iddocument = :id GROUP BY d.iddocument"),
        {"id": did},
    ).mappings().fetchone()
    return dict(row) if row else None

# ───────────────────────────────────────── Blueprints
bp_doc_crud = Blueprint("document_crud", __name__, url_prefix="/api/v1/Document")
bp_doc_utils = Blueprint("document_utils", __name__, url_prefix="/api/v1/document")
bp_doc_events = Blueprint("document_events", __name__, url_prefix="/api/v1/evenements")
bp_storage    = Blueprint("storage", __name__, url_prefix="/api/v1/storage")

# ========== 1) GET /api/v1/evenements/{id}/documents
@bp_doc_events.get("/<int:idevenement>/documents")
@swag_from({
    "tags": ["Document"],
    "summary": "List Docs For Event",
    "parameters": [
        {"in": "path", "name": "idevenement", "required": True, "schema": {"type": "integer"}}
    ],
    "responses": {
        200: {"description": "Successful Response", "content": {"application/json": {"schema": {"type": "array", "items": {"type": "object"}}}}},
        422: {"description": "Validation Error"}
    }
})
def list_docs_for_event(idevenement: int):
    session: Session = db.session
    rows = session.execute(text("""
        SELECT d.iddocument, d.chemin, d.date_ajout, d.titre_document, d.description_document
          FROM archive a
          JOIN document d ON d.iddocument = a.iddocument
         WHERE a.idevenement = :id
         ORDER BY d.date_ajout DESC, d.iddocument DESC
    """), {"id": idevenement}).mappings().all()
    return jsonify([_iso_row(dict(r), ["date_ajout"]) for r in rows])

# ========== 2) GET /api/v1/Document  (list)
@bp_doc_crud.get("/")
@swag_from({
    "tags": ["Document"],
    "summary": "List Documents",
    "parameters": [
        {"in": "query", "name": "q", "description": "Recherche plein texte sur titre_document / chemin", "schema": {"type": "string", "nullable": True}},
        {"in": "query", "name": "start_from", "description": "date_ajout >= start_from (YYYY-MM-DD)", "schema": {"type": "string", "format": "date", "nullable": True}},
        {"in": "query", "name": "end_to", "description": "date_ajout <= end_to (YYYY-MM-DD)", "schema": {"type": "string", "format": "date", "nullable": True}},
        {"in": "query", "name": "skip",  "schema": {"type": "integer", "default": 0}},
        {"in": "query", "name": "limit", "schema": {"type": "integer", "default": 100, "maximum": 500}},
    ],
    "responses": {
        200: {"description": "Successful Response", "content": {"application/json": {"schema": {"type": "array", "items": {"type": "object"}}}}},
        422: {"description": "Validation Error"}
    }
})
def list_documents():
    args = request.args
    where = ["1=1"]
    params: Dict[str, Any] = {}

    q = args.get("q")
    if q:
        where.append("(d.titre_document LIKE :q OR d.chemin LIKE :q)")
        params["q"] = f"%{q}%"

    start_from = args.get("start_from")
    end_to     = args.get("end_to")
    if start_from:
        where.append("d.date_ajout >= :dfrom")
        params["dfrom"] = start_from
    if end_to:
        where.append("d.date_ajout <= :dto")
        params["dto"] = end_to

    limit = min(int(args.get("limit", 100)), 500)
    skip  = int(args.get("skip", 0))

    sql = f"""
        {_SQL_SELECT}
        WHERE {" AND ".join(where)}
        GROUP BY d.iddocument
        ORDER BY d.iddocument DESC
        LIMIT :limit OFFSET :skip
    """
    params.update({"limit": limit, "skip": skip})

    session: Session = db.session
    rows = session.execute(text(sql), params).mappings().all()
    return jsonify([_iso_row(dict(r), ["date_ajout"]) for r in rows])

# ========== 3) POST /api/v1/Document  (body JSON)
@bp_doc_crud.post("/")
@swag_from({
    "tags": ["Document"],
    "summary": "Create Document",
    "requestBody": {
        "required": True,
        "content": {
            "application/json": {
                "schema": {
                    "type": "object",
                    "properties": {
                        "chemin": {"type": "string"},
                        "date_ajout": {"type": "string", "format": "date"},
                        "titre_document": {"type": "string"},
                        "description_document": {"type": "string", "nullable": True},
                    },
                    "required": ["chemin", "date_ajout", "titre_document"]
                }
            }
        }
    },
    "responses": {
        201: {"description": "Successful Response", "content": {"application/json": {"schema": {"type": "object"}}}},
        400: {"description": "Validation error"}
    }
})
def create_document():
    payload: Dict[str, Any] = request.get_json(silent=True) or {}
    for key in ("chemin", "date_ajout", "titre_document"):
        if not payload.get(key):
            return jsonify({"detail": f"{key} est obligatoire."}), 400

    session: Session = db.session
    session.execute(text("""
        INSERT INTO document (chemin, date_ajout, titre_document, description_document)
        VALUES (:chemin, :date_ajout, :titre_document, :description_document)
    """), {
        "chemin": payload.get("chemin"),
        "date_ajout": _to_iso_date(payload.get("date_ajout")),
        "titre_document": payload.get("titre_document"),
        "description_document": payload.get("description_document"),
    })
    session.commit()
    new_id = session.execute(text("SELECT LAST_INSERT_ID() AS id")).mappings().one()["id"]
    row = _one(session, int(new_id))
    return jsonify(_iso_row(row, ["date_ajout"])), 201

# ========== 4) GET /api/v1/Document/{id}
@bp_doc_crud.get("/<int:iddocument>")
@swag_from({
    "tags": ["Document"],
    "summary": "Get Document",
    "parameters": [{"in": "path", "name": "iddocument", "required": True, "schema": {"type": "integer"}}],
    "responses": {
        200: {"description": "Successful Response", "content": {"application/json": {"schema": {"type": "object"}}}},
        404: {"description": "Document introuvable."}
    }
})
def get_document(iddocument: int):
    session: Session = db.session
    row = _one(session, iddocument)
    if not row:
        return jsonify({"detail": "Document introuvable."}), 404
    return jsonify(_iso_row(row, ["date_ajout"]))

# ========== 5) PUT /api/v1/Document/{id}  (body JSON)
@bp_doc_crud.put("/<int:iddocument>")
@swag_from({
    "tags": ["Document"],
    "summary": "Update Document",
    "parameters": [{"in": "path", "name": "iddocument", "required": True, "schema": {"type": "integer"}}],
    "requestBody": {
        "required": True,
        "content": {
            "application/json": {
                "schema": {
                    "type": "object",
                    "properties": {
                        "chemin": {"type": "string"},
                        "date_ajout": {"type": "string", "format": "date"},
                        "titre_document": {"type": "string"},
                        "description_document": {"type": "string", "nullable": True},
                    },
                    "required": ["chemin", "date_ajout", "titre_document"]
                }
            }
        }
    },
    "responses": {
        200: {"description": "Successful Response", "content": {"application/json": {"schema": {"type": "object"}}}},
        404: {"description": "Document introuvable."},
        400: {"description": "Validation error"}
    }
})
def update_document(iddocument: int):
    session: Session = db.session
    if not _one(session, iddocument):
        return jsonify({"detail": "Document introuvable."}), 404

    payload: Dict[str, Any] = request.get_json(silent=True) or {}
    for key in ("chemin", "date_ajout", "titre_document"):
        if not payload.get(key):
            return jsonify({"detail": f"{key} est obligatoire."}), 400

    session.execute(text("""
        UPDATE document
           SET chemin = :chemin,
               date_ajout = :date_ajout,
               titre_document = :titre_document,
               description_document = :description_document
         WHERE iddocument = :id
    """), {
        "chemin": payload.get("chemin"),
        "date_ajout": _to_iso_date(payload.get("date_ajout")),
        "titre_document": payload.get("titre_document"),
        "description_document": payload.get("description_document"),
        "id": iddocument,
    })
    session.commit()
    row = _one(session, iddocument)
    return jsonify(_iso_row(row, ["date_ajout"]))

# ========== 6) DELETE /api/v1/Document/{id}
@bp_doc_crud.delete("/<int:iddocument>")
@swag_from({
    "tags": ["Document"],
    "summary": "Delete Document",
    "parameters": [{"in": "path", "name": "iddocument", "required": True, "schema": {"type": "integer"}}],
    "responses": {
        200: {"description": "Successful Response", "content": {"application/json": {
            "schema": {"type": "object",
                       "properties": {"deleted": {"type": "boolean"},
                                      "iddocument": {"type": "integer"},
                                      "reason": {"type": "string", "nullable": True}}}
        }}},
        404: {"description": "Not found"}
    }
})
def delete_document(iddocument: int):
    session: Session = db.session
    # règle métier : bloquer s'il existe une archive liée
    cnt = session.execute(
        text("SELECT COUNT(*) AS c FROM archive WHERE iddocument = :id"),
        {"id": iddocument},
    ).scalar()
    if cnt and int(cnt) > 0:
        return jsonify({
            "deleted": False,
            "iddocument": iddocument,
            "reason": "Impossible de supprimer : document déjà lié à au moins un enregistrement d'archive.",
        })

    res = session.execute(text("DELETE FROM document WHERE iddocument = :id"), {"id": iddocument})
    session.commit()
    return jsonify({
        "deleted": res.rowcount > 0,
        "iddocument": iddocument,
        "reason": None if res.rowcount > 0 else "Aucune ligne supprimée.",
    })

# ========== 7) GET /api/v1/document/{id}/open
@bp_doc_utils.get("/<int:iddocument>/open")
@swag_from({
    "tags": ["Document"],
    "summary": "Open Document",
    "parameters": [{"in": "path", "name": "iddocument", "required": True, "schema": {"type": "integer"}}],
    "responses": {200: {"description": "File stream"}, 404: {"description": "Not found"}}
})
def open_document(iddocument: int):
    session: Session = db.session
    obj = _one(session, iddocument)
    if not obj:
        return jsonify({"detail": "Document introuvable."}), 404
    p = fs_path(obj["chemin"])
    if not p.exists():
        return jsonify({"detail": "Fichier non trouvé sur le disque."}), 404
    media = mimetypes.guess_type(p.name)[0] or "application/octet-stream"
    return send_file(p, mimetype=media, as_attachment=False)

# ========== 8) GET /api/v1/document/{id}/download
@bp_doc_utils.get("/<int:iddocument>/download")
@swag_from({
    "tags": ["Document"],
    "summary": "Download Document",
    "parameters": [{"in": "path", "name": "iddocument", "required": True, "schema": {"type": "integer"}}],
    "responses": {200: {"description": "File download"}, 404: {"description": "Not found"}}
})
def download_document(iddocument: int):
    session: Session = db.session
    obj = _one(session, iddocument)
    if not obj:
        return jsonify({"detail": "Document introuvable."}), 404
    p: Path = fs_path(obj["chemin"])
    if not p.exists():
        return jsonify({"detail": "Fichier non trouvé sur le disque."}), 404

    ext = p.suffix
    base = (obj.get("titre_document") or "document").strip() or "document"
    filename = f"{base}{ext}" if ext and not base.lower().endswith(ext.lower()) else base
    return send_file(p, mimetype="application/octet-stream", as_attachment=True, download_name=filename)

# ========== 9) POST /api/v1/storage/upload (multipart)
@bp_storage.post("/upload")
@swag_from({
    "tags": ["Document"],
    "summary": "Upload File",
    "requestBody": {
        "required": True,
        "content": {
            "multipart/form-data": {
                "schema": {"type": "object",
                           "properties": {"file": {"type": "string", "format": "binary"}},
                           "required": ["file"]}
            }
        }
    },
    "responses": {
        200: {"description": "Successful Response", "content": {"application/json": {"schema": {"type": "object"}}}},
        422: {"description": "Validation Error"}
    }
})
def upload_file():
    f = request.files.get("file")
    if not f or not f.filename:
        return jsonify({"detail": "Fichier manquant"}), 422

    rel1, abs_path = next_available_name(f.filename)
    rel = "/storage/" + rel1
    abs_path.parent.mkdir(parents=True, exist_ok=True)
    f.save(abs_path)

    return jsonify({
        "rel": rel,                          # ex: "/storage/rapport-final.pdf"
        "url": public_url(rel1),             # ex: "/media/storage/rapport-final.pdf"
        "filename": f.filename,
        "size": abs_path.stat().st_size,
        "mime_type": mimetypes.guess_type(abs_path.name)[0] or "application/octet-stream",
    })

# ───────────────────────────────────────── Register helper (si tu utilises app factory)
# Dans ton create_app():
#   app.register_blueprint(bp_doc_events)
#   app.register_blueprint(bp_doc_crud)
#   app.register_blueprint(bp_doc_utils)
#   app.register_blueprint(bp_storage)
