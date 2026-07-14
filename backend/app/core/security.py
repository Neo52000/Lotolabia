"""Authentification et autorisations.

L'API vérifie les JWT émis par Supabase Auth :
  * HS256 avec `SUPABASE_JWT_SECRET` (clés « legacy ») ;
  * ES256/RS256 via le JWKS du projet (`SUPABASE_JWKS_URL`) pour les clés modernes.

Le rôle admin est lu dans la table `profiles` (via le client service role),
jamais déduit d'un claim contrôlable par le client.
"""

from dataclasses import dataclass

import jwt
from fastapi import Depends, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from .config import Settings, get_settings
from .errors import ForbiddenError, UnauthorizedError

_bearer = HTTPBearer(auto_error=False)

_jwks_client: jwt.PyJWKClient | None = None


@dataclass(frozen=True)
class AuthUser:
    id: str
    email: str | None
    role: str  # 'user' | 'admin'
    is_premium: bool


def _decode_token(token: str, settings: Settings) -> dict:
    options = {"verify_aud": False}
    try:
        header = jwt.get_unverified_header(token)
        algorithm = header.get("alg", "HS256")
        if algorithm == "HS256":
            if not settings.supabase_jwt_secret:
                raise UnauthorizedError("Vérification JWT non configurée.")
            return jwt.decode(
                token, settings.supabase_jwt_secret, algorithms=["HS256"], options=options
            )
        if not settings.supabase_jwks_url:
            raise UnauthorizedError("Vérification JWT non configurée.")
        global _jwks_client
        if _jwks_client is None:
            _jwks_client = jwt.PyJWKClient(settings.supabase_jwks_url)
        signing_key = _jwks_client.get_signing_key_from_jwt(token)
        return jwt.decode(
            token, signing_key.key, algorithms=["ES256", "RS256"], options=options
        )
    except jwt.InvalidTokenError as exc:
        raise UnauthorizedError("Jeton invalide ou expiré.") from exc


async def get_optional_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
    settings: Settings = Depends(get_settings),
) -> AuthUser | None:
    """Retourne l'utilisateur authentifié, ou None pour un accès anonyme."""
    if credentials is None:
        return None
    claims = _decode_token(credentials.credentials, settings)
    user_id = claims.get("sub")
    if not user_id:
        raise UnauthorizedError("Jeton sans identifiant utilisateur.")
    repo = request.app.state.repository
    profile = await repo.get_profile(user_id)
    role = profile.get("role", "user") if profile else "user"
    is_premium = await repo.has_active_premium(user_id)
    return AuthUser(
        id=user_id,
        email=claims.get("email"),
        role=role,
        is_premium=is_premium,
    )


async def require_user(user: AuthUser | None = Depends(get_optional_user)) -> AuthUser:
    if user is None:
        raise UnauthorizedError()
    return user


async def require_admin(user: AuthUser = Depends(require_user)) -> AuthUser:
    if user.role != "admin":
        raise ForbiddenError("Réservé aux administrateurs.")
    return user
