"""Point d'entrée de l'API LotoLab IA."""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from slowapi.util import get_remote_address

from .api.v1 import router as api_v1_router
from .collector.scheduler import SyncScheduler
from .collector.service import CollectorService
from .core.cache import TTLCache
from .core.config import get_settings
from .core.errors import register_error_handlers
from .core.logging import configure_logging, get_logger
from .db.repository import MemoryRepository
from .stats.disclaimers import INDEPENDENCE_NOTICE

logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    configure_logging(settings.log_level, settings.environment)

    if settings.supabase_configured:
        from .db.supabase_repo import SupabaseRepository

        app.state.repository = SupabaseRepository(
            settings.supabase_url, settings.supabase_service_role_key
        )
        logger.info("Dépôt de données : Supabase.")
    else:
        app.state.repository = MemoryRepository()
        logger.warning(
            "Supabase non configuré — dépôt en mémoire (développement uniquement, "
            "les données ne sont pas persistées)."
        )

    app.state.cache = TTLCache(ttl_seconds=settings.cache_ttl_seconds)
    app.state.collector = CollectorService(app.state.repository, settings)
    app.state.scheduler = None
    if settings.scheduler_enabled:
        app.state.scheduler = SyncScheduler(app.state.collector, settings)
        app.state.scheduler.start()

    yield

    if app.state.scheduler is not None:
        app.state.scheduler.shutdown()
    aclose = getattr(app.state.repository, "aclose", None)
    if aclose is not None:
        await aclose()


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title=settings.app_name,
        version=settings.app_version,
        description=(
            "API d'analyse statistique des tirages du Loto. "
            f"{INDEPENDENCE_NOTICE} "
            "Les statistiques sont descriptives : elles ne prédisent pas les tirages "
            "et ne modifient pas les probabilités théoriques de gain."
        ),
        lifespan=lifespan,
        docs_url="/docs" if settings.environment != "production" else None,
        redoc_url=None,
    )

    limiter = Limiter(
        key_func=get_remote_address, default_limits=[settings.rate_limit_default]
    )
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
    app.add_middleware(SlowAPIMiddleware)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=False,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
        allow_headers=["Authorization", "Content-Type"],
    )

    register_error_handlers(app)
    app.include_router(api_v1_router, prefix="/api/v1")

    @app.get("/health", tags=["Santé"])
    async def health() -> dict:
        return {"status": "ok", "version": settings.app_version}

    return app


app = create_app()
