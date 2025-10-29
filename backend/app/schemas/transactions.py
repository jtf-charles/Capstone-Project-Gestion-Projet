# app/api/v1/schemas/transactions.py
from marshmallow import Schema, fields, validate

class TransactionsQuerySchema(Schema):
    # ?scope=personnel|activite (par défaut: personnel)
    scope = fields.String(
        required=False,
        load_default="personnel",
        validate=validate.OneOf(["personnel", "activite"])
    )

class TransactionOutSchema(Schema):
    idtransaction       = fields.Int(required=True)
    idpersonnel         = fields.Int(allow_none=True)
    idactivite          = fields.Int(allow_none=True)
    montant_transaction = fields.Decimal(as_string=True)
    type_transaction    = fields.String(allow_none=True)
    receveur_type       = fields.String(allow_none=True)
    type_paiement       = fields.String(allow_none=True)
    date_transaction    = fields.Date(allow_none=True)
    commentaire         = fields.String(allow_none=True)
    devise              = fields.String(allow_none=True)
    idprojet            = fields.Int(allow_none=True)

    # champs “de confort” issus des JOIN
    nom_personnel = fields.String(allow_none=True)
    titre_act     = fields.String(allow_none=True)
    code_projet   = fields.String(allow_none=True)
