from flask import request, jsonify
from pydantic import ValidationError

def parse_json(model):
    """
    Décorateur qui valide le body JSON avec Pydantic (ProjetIn, etc.)
    et passe l'instance validée en premier argument de la vue.
    """
    def wrapper(fn):
        def inner(*args, **kwargs):
            try:
                data = request.get_json(silent=True) or {}
                obj = model.model_validate(data)
            except ValidationError as ve:
                return jsonify(ok=False, error=ve.errors()), 422
            return fn(obj, *args, **kwargs)
        inner.__name__ = fn.__name__
        return inner
    return wrapper
