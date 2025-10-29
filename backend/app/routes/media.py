# app/routes/media.py
from pathlib import Path
from flask import Blueprint, current_app, abort, send_from_directory
from werkzeug.utils import safe_join

media_bp = Blueprint("media", __name__)

@media_bp.get("/media/<path:relpath>")
def serve_media(relpath: str):
    """
    Sert un fichier situé sous STORAGE_ROOT. Protection path traversal.
    On attend relpath SANS 'storage/' (ex: 'fichier1.pdf' ou 'sous/rep/doc.pdf').
    """
    storage_root: Path = Path(current_app.config["STORAGE_ROOT"]).resolve()
    # Nettoyage type FastAPI : on tolère que le client mette 'storage/...'
    clean = relpath
    if clean.startswith("storage/"):
        clean = clean[len("storage/"):]

    # Empêche toute évasion du répertoire
    abs_path = (storage_root / clean).resolve()
    if not abs_path.is_file() or storage_root not in abs_path.parents:
        abort(404)

    # send_from_directory nécessite (directory, filename)
    return send_from_directory(storage_root, clean, as_attachment=False)
