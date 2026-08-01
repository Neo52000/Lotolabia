"""Configuration centralisée de l'API LotoLab IA.

Toutes les valeurs sensibles ou dépendantes de l'environnement proviennent de
variables d'environnement (fichier `.env` en développement). Aucun secret
n'est stocké dans le dépôt : voir `backend/.env.example`.
"""

from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", extra="ignore"
    )

    # --- Application -------------------------------------------------------
    app_name: str = "LotoLab IA API"
    app_version: str = "1.0.0"
    environment: str = Field(default="development", description="development | staging | production")
    debug: bool = False
    log_level: str = "INFO"

    # --- Supabase -----------------------------------------------------------
    supabase_url: str = Field(default="", description="URL du projet Supabase (https://xxx.supabase.co)")
    supabase_service_role_key: str = Field(
        default="", description="Clé service role — usage serveur uniquement, jamais exposée"
    )
    supabase_jwt_secret: str = Field(
        default="", description="Secret JWT (HS256) pour vérifier les tokens Supabase Auth"
    )
    supabase_jwks_url: str = Field(
        default="",
        description="URL JWKS pour les clés asymétriques (ES256/RS256), ex. https://xxx.supabase.co/auth/v1/.well-known/jwks.json",
    )

    # --- Sécurité HTTP ------------------------------------------------------
    cors_origins: str = Field(
        default="http://localhost:3000",
        description="Origines autorisées, séparées par des virgules",
    )
    rate_limit_default: str = "120/minute"
    rate_limit_heavy: str = "10/minute"
    max_upload_bytes: int = 5 * 1024 * 1024  # 5 Mo max pour les imports manuels

    # --- Collecteur de tirages ----------------------------------------------
    # URLs des fichiers historiques officiels (ZIP/CSV publiés par l'opérateur),
    # séparées par des virgules, du plus récent au plus ancien.
    collector_history_urls: str = Field(
        default="",
        description="URLs des fichiers historiques officiels à importer (CSV ou ZIP de CSV)",
    )
    collector_user_agent: str = "LotoLabIA-Collector/1.0 (outil independant d'analyse statistique)"
    collector_timeout_seconds: int = 30
    collector_max_retries: int = 5
    collector_retry_backoff_seconds: int = 60
    scheduler_enabled: bool = False
    scheduler_timezone: str = "Europe/Paris"
    collector_cron_secret: str = Field(
        default="",
        description=(
            "Secret partagé pour déclencher la synchronisation depuis un appel "
            "externe planifié (ex. cron GitHub Actions), utile quand l'instance "
            "API est en scale-to-zero et ne peut donc pas porter de planificateur "
            "interne. Endpoint désactivé (404) tant que ce secret n'est pas défini."
        ),
    )

    # --- Cache --------------------------------------------------------------
    cache_ttl_seconds: int = 300

    # --- Production éditoriale automatique (blog SEO) ------------------------
    # Rédaction template-based à partir des vraies statistiques (aucune clé
    # externe requise). CONTENT_AI_ENABLED est un point d'extension optionnel
    # pour brancher un modèle de langage de reformulation plus tard — désactivé
    # par défaut, la production fonctionne sans lui.
    content_scheduler_enabled: bool = False
    content_batch_size: int = 2
    content_auto_publish: bool = True
    content_schedule_day_of_week: str = "mon"
    content_schedule_hour: int = 6
    content_schedule_minute: int = 0
    content_ai_enabled: bool = False
    content_ai_provider: str = ""
    content_ai_api_key: str = Field(
        default="", description="Clé API du modèle de reformulation optionnel — jamais journalisée"
    )

    # --- Achats intégrés (stores) ---------------------------------------------
    # La validation des reçus reste désactivée tant que les identifiants des
    # consoles (Google Play / App Store) ne sont pas configurés.
    store_validation_enabled: bool = False
    google_play_package_name: str = ""
    google_play_service_account_json: str = Field(
        default="", description="Chemin du JSON de compte de service Google Play (serveur uniquement)"
    )
    app_store_shared_secret: str = ""

    # --- Paiement web (Stripe) -------------------------------------------------
    # Réservé au web tant qu'aucune clé n'est configurée — jamais de session ou
    # de droit Premium simulé.
    site_url: str = Field(
        default="http://localhost:3000", description="URL publique du site (redirections Stripe)"
    )
    stripe_secret_key: str = Field(default="", description="Clé secrète Stripe — serveur uniquement")
    stripe_webhook_secret: str = Field(
        default="", description="Secret de signature du webhook Stripe (whsec_...)"
    )
    stripe_price_monthly: str = ""
    stripe_price_yearly: str = ""
    stripe_price_lifetime: str = ""

    # --- Limites offre gratuite ----------------------------------------------
    free_saved_grids_limit: int = 5
    free_generator_daily_limit: int = 10
    free_history_limit: int = 100
    free_export_monthly_limit: int = 2

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @property
    def collector_history_url_list(self) -> list[str]:
        return [url.strip() for url in self.collector_history_urls.split(",") if url.strip()]

    @property
    def supabase_configured(self) -> bool:
        return bool(self.supabase_url and self.supabase_service_role_key)

    @property
    def stripe_enabled(self) -> bool:
        return bool(self.stripe_secret_key and self.stripe_webhook_secret)


@lru_cache
def get_settings() -> Settings:
    return Settings()
