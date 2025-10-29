# app/core/storage.py
from pathlib import Path
from app.config import settings

def _normalize(rel: str) -> str:
    if not rel:
        return ""
    r = rel.strip().lstrip("/")      # enlève un éventuel "/" initial
    if r.startswith("storage/"):
        r = r[len("storage/"):]
    return r

def fs_path(rel: str) -> Path:
    return Path(settings.STORAGE_ROOT).resolve() / _normalize(rel)

def _safe_prefix() -> str:
    # Garantit un path d’URL commençant par "/" et jamais un chemin disque Windows
    p = (settings.MEDIA_URL_PREFIX or "/media").strip()
    # ex: "C:/media" ou "C:\media" -> on ignore et on retombe sur /media
    if ":" in p and (p[1:3] == ":/" or p[1:3] == ":\\"):
        return "/media"
    if "://" in p:
        # si jamais quelqu'un met une URL absolue, on ne garde que le path
        from urllib.parse import urlparse
        p = urlparse(p).path or "/media"
    if not p.startswith("/"):
        p = "/" + p
    return p.rstrip("/")

def public_url(rel: str) -> str:
    # Retourne un path d’URL relatif au site (ex: /media/fichier.pdf)
    return f"{_safe_prefix()}/{_normalize(rel)}"
