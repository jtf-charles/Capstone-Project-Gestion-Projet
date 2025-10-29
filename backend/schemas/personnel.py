# app/schemas/personnel.py
from marshmallow import Schema, fields, validate, validates, ValidationError

# ----- Base (mêmes noms que la BDD) -----
class PersonnelBaseSchema(Schema):
    idsoumission        = fields.Integer(allow_none=True)
    nom_personnel       = fields.String(required=True, validate=validate.Length(min=1, max=150))
    fonction_personnel  = fields.String(allow_none=True, validate=validate.Length(max=150))
    email_personnel     = fields.Email(allow_none=True)
    telephone_personnel = fields.String(allow_none=True, validate=validate.Length(max=150))
    type_personnel      = fields.String(allow_none=True, validate=validate.Length(max=150))

    @validates("nom_personnel")
    def _not_empty(self, v):
        if not (v or "").strip():
            raise ValidationError("nom_personnel est obligatoire.")

# ----- Entrées -----
class PersonnelCreateSchema(PersonnelBaseSchema):
    """Corps requis pour POST/PUT (mêmes noms que la BDD)."""
    pass

# Variante si tu veux un PUT partiel: mets partial=True dans @blp.arguments(...)
class PersonnelUpdateSchema(PersonnelBaseSchema):
    pass

# ----- Sortie -----
class PersonnelOutSchema(PersonnelBaseSchema):
    idpersonnel = fields.Integer(required=True)
