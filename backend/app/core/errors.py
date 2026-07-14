"""Gestion centralisée des erreurs de l'API.

Toutes les erreurs renvoient un corps JSON homogène :
    {"error": {"code": <str>, "message": <str>}}
Les détails internes ne sont jamais exposés au client en production.
"""

import logging

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

logger = logging.getLogger(__name__)


class AppError(Exception):
    """Erreur métier contrôlée."""

    def __init__(self, code: str, message: str, status_code: int = 400) -> None:
        self.code = code
        self.message = message
        self.status_code = status_code
        super().__init__(message)


class NotFoundError(AppError):
    def __init__(self, message: str = "Ressource introuvable.") -> None:
        super().__init__("not_found", message, 404)


class ConflictError(AppError):
    def __init__(self, message: str = "Conflit avec une ressource existante.") -> None:
        super().__init__("conflict", message, 409)


class ForbiddenError(AppError):
    def __init__(self, message: str = "Accès refusé.") -> None:
        super().__init__("forbidden", message, 403)


class UnauthorizedError(AppError):
    def __init__(self, message: str = "Authentification requise.") -> None:
        super().__init__("unauthorized", message, 401)


class PremiumRequiredError(AppError):
    def __init__(self, message: str = "Cette fonctionnalité nécessite l'offre Premium.") -> None:
        super().__init__("premium_required", message, 402)


class UpstreamError(AppError):
    def __init__(self, message: str = "Source de données indisponible.") -> None:
        super().__init__("upstream_unavailable", message, 503)


def _payload(code: str, message: str) -> dict:
    return {"error": {"code": code, "message": message}}


def register_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(AppError)
    async def app_error_handler(_: Request, exc: AppError) -> JSONResponse:
        return JSONResponse(status_code=exc.status_code, content=_payload(exc.code, exc.message))

    @app.exception_handler(StarletteHTTPException)
    async def http_error_handler(_: Request, exc: StarletteHTTPException) -> JSONResponse:
        return JSONResponse(
            status_code=exc.status_code, content=_payload("http_error", str(exc.detail))
        )

    @app.exception_handler(RequestValidationError)
    async def validation_error_handler(_: Request, exc: RequestValidationError) -> JSONResponse:
        return JSONResponse(
            status_code=422,
            content={
                "error": {
                    "code": "validation_error",
                    "message": "Données de requête invalides.",
                    "details": exc.errors(),
                }
            },
        )

    @app.exception_handler(Exception)
    async def unhandled_error_handler(_: Request, exc: Exception) -> JSONResponse:
        logger.exception("Erreur non gérée : %s", type(exc).__name__)
        return JSONResponse(
            status_code=500,
            content=_payload("internal_error", "Erreur interne. L'incident a été journalisé."),
        )
