from flask import Blueprint, jsonify
from flasgger import swag_from
from ..extensions import db
from ..models.document import Document
from ..models.archive import Archive

bp_document = Blueprint("document", __name__, url_prefix="/api/v1")

@bp_document.get("/evenements/<int:idevenement>/documents")
@swag_from({
    "tags": ["Document"],
    "summary": "List Docs For Event",
    "description": "Retourne les documents liés à un évènement (archive → document).",
    "parameters": [
        {
            "name": "idevenement",
            "in": "path",
            "required": True,
            "schema": {"type": "integer"}
        }
    ],
    "responses": {
        "200": {
            "description": "Liste de documents",
            "content": {
                "application/json": {
                    "example": [
                        {
                            "iddocument": 1,
                            "chemin": "https://.../fichier.pdf",
                            "date_ajout": "2025-10-27",
                            "titre_document": "PV séance",
                            "description_document": "Procès-verbal ..."
                        }
                    ]
                }
            }
        },
        "404": {"description": "Aucun document"}
    }
})
def list_docs_for_event(idevenement: int):
    """
    GET /api/v1/evenements/{idevenement}/documents
    """
    q = (
        db.session.query(
            Document.iddocument,
            Document.chemin,
            Document.date_ajout,
            Document.titre_document,
            Document.description_document,
        )
        .join(Archive, Archive.iddocument == Document.iddocument)
        .filter(Archive.idevenement == idevenement)
        .order_by(Document.date_ajout.desc(), Document.iddocument.desc())
    )

    rows = q.all()
    data = [
        {
            "iddocument": r.iddocument,
            "chemin": r.chemin,
            "date_ajout": r.date_ajout.isoformat() if r.date_ajout else None,
            "titre_document": r.titre_document,
            "description_document": r.description_document,
        }
        for r in rows
    ]
    return jsonify(data), 200
