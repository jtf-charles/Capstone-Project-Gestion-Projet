# app/routes/documents.py
from __future__ import annotations
from pathlib import Path

from flask import Blueprint, abort, jsonify, redirect, send_file
from sqlalchemy import text

from app.extensions import db
from app.core.storage import fs_path, public_url  # <- déjà présents dans ton projet

bp_documents = Blueprint("documents", __name__, url_prefix="/api/v1")

# --- Helpers ---------------------------------------------------------------

def _get_doc(iddocument: int) -> dict:
    """
    Récupère un document sous forme de mapping(dict-like).
    Lève 404 si introuvable.
    """
    row = (
        db.session.execute(
            text(
                "SELECT iddocument, titre_document, chemin "
                "FROM document WHERE iddocument = :id"
            ),
            {"id": iddocument},
        )
        .mappings()
        .first()
    )
    if not row:
        abort(404, description="Document introuvable")
    return dict(row)

# --- Endpoints -------------------------------------------------------------

@bp_documents.get("/documents/<int:iddocument>/open")
def open_document(iddocument: int):
    """
    Redirige vers l’URL publique du document (/media/... ou URL absolue).

    ---
    tags:
      - Documents
    parameters:
      - in: path
        name: iddocument
        description: Identifiant du document
        required: true
        schema:
          type: integer
    responses:
      302:
        description: Redirection vers l'URL du document
      404:
        description: Document introuvable
    """
    doc = _get_doc(iddocument)
    # Si `chemin` est déjà une URL absolue (http/https), on redirige tel quel
    ch = doc.get("chemin") or ""
    if ch.startswith("http://") or ch.startswith("https://"):
        return redirect(ch, code=302)
    # Sinon on fabrique l’URL publique derrière /media/...
    return redirect(public_url(ch), code=302)


@bp_documents.get("/documents/<int:iddocument>/download")
def download_document(iddocument: int):
    """
    Télécharge le fichier (Content-Disposition: attachment).

    ---
    tags:
      - Documents
    parameters:
      - in: path
        name: iddocument
        description: Identifiant du document
        required: true
        schema:
          type: integer
    responses:
      200:
        description: Fichier renvoyé en pièce jointe
        content:
          application/octet-stream:
            schema:
              type: string
              format: binary
      404:
        description: Document introuvable ou fichier manquant
    """
    doc = _get_doc(iddocument)

    # Résout le chemin disque depuis le champ `chemin`
    file_path: Path = fs_path(doc["chemin"])
    if not file_path.exists():
        abort(404, description="Fichier manquant")

    # Nom de téléchargement : titre_document (si présent) sinon nom réel
    dl_name = (doc.get("titre_document") or file_path.name).strip() or file_path.name

    # Envoi en tant que pièce jointe
    return send_file(
        file_path,
        as_attachment=True,
        download_name=dl_name,
        mimetype="application/octet-stream",
        max_age=0,
        etag=True,
        conditional=True,
        last_modified=file_path.stat().st_mtime,
    )

# (Optionnel) petit endpoint JSON si tu veux tester rapidement que le BP est chargé
@bp_documents.get("/documents/ping")
def documents_ping():
    """Ping de santé du blueprint Documents (debug)."""
    return jsonify(ok=True)
