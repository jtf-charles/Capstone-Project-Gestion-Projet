# app/core/files_.py
from __future__ import annotations

from pathlib import Path
import re
import unicodedata

# On réutilise STORAGE_ROOT via ton helper fs_path (déjà utilisé côté Flask)
# fs_path(rel: str) -> Path absolu sous STORAGE_ROOT
from app.core.storage import fs_path

# Regex pour transformer toute séquence non [a-z0-9] en tiret
_SLUG_RE = re.compile(r"[^a-z0-9]+", re.IGNORECASE)


def _slugify_base(name: str) -> str:
    """
    Normalise le nom de base (sans extension) :
      - passage en ASCII (suppression des accents),
      - minuscules,
      - espaces et caractères spéciaux -> '-',
      - trim des tirets en début/fin.

    Retourne 'fichier' si vide après normalisation.
    """
    if not name:
        return "fichier"

    # On retire l'extension si elle traîne dans name
    base = Path(name).stem

    # Unicode -> ASCII (supprime les accents)
    base = unicodedata.normalize("NFKD", base).encode("ascii", "ignore").decode()

    base = base.lower().strip()
    base = _SLUG_RE.sub("-", base).strip("-")
    return base or "fichier"


def next_available_name(original_filename: str, subdir: str | None = None) -> tuple[str, Path]:
    """
    Renvoie (rel_path, abs_path) en conservant l'extension, en évitant les collisions.

    - rel_path : chemin **relatif** à STORAGE_ROOT (ex: "storage/rapport-final.pdf")
    - abs_path : Path **absolu** correspondant sur le disque (STORAGE_ROOT / rel_path)

    `subdir` est optionnel si tu veux préfixer avec un sous-répertoire logique.
    """
    p = Path(original_filename or "fichier")
    # gère .tar.gz etc.
    ext = "".join(p.suffixes) or ""
    base = _slugify_base(p.stem)

    # Sous-répertoire logique relatif (sans '..' ni séparateurs dangereux)
    rel_dir = Path("")
    if subdir:
        # On "slugifie" le sous-dossier pour rester safe (pas de .., pas de \)
        safe_sub = _slugify_base(subdir).replace("-", "/")  # option : autoriser hiérarchie par '-'
        rel_dir = rel_dir / safe_sub

    # Essaie base.ext, puis base-2.ext, base-3.ext, …
    i = 1
    while True:
        candidate = f"{base}{ext}" if i == 1 else f"{base}-{i}{ext}"
        rel_path = (rel_dir / candidate).as_posix()  # toujours des '/' (utile sous Windows)
        abs_path = fs_path(rel_path)                 # Path absolu sous STORAGE_ROOT
        if not abs_path.exists():
            # On ne crée pas le répertoire ici : le code appelant peut faire abs_path.parent.mkdir(...)
            return rel_path, abs_path
        i += 1
