"""Matrice des droits gratuit / Premium.

| Capacité                        | Anonyme | Gratuit | Premium |
|---------------------------------|---------|---------|---------|
| Statistiques principales        | oui     | oui     | oui     |
| Historique                      | limité  | limité  | complet |
| Statistiques avancées (triplets,
|   comparaisons, profils longs)  | non     | non     | oui     |
| Générateur : méthodes           | random  | random, frequency | toutes |
| Générateur : grilles / requête  | 1       | 3       | 20      |
| Simulations Monte-Carlo         | 1 000 it.| 10 000 it. | 250 000 it. |
| Export CSV                      | non     | 100 lignes | complet |
| Export PDF                      | non     | non     | oui     |
| Grilles enregistrées            | —       | 5       | illimité |

Les administrateurs disposent des capacités Premium.
"""

from ..core.config import Settings
from ..core.errors import PremiumRequiredError, UnauthorizedError
from ..core.security import AuthUser
from ..schemas.grids import GenerationRequest

FREE_METHODS = {"random", "frequency"}
ANONYMOUS_METHODS = {"random"}


def _tier(user: AuthUser | None) -> str:
    if user is None:
        return "anonymous"
    if user.is_premium or user.role == "admin":
        return "premium"
    return "free"


class PremiumPolicy:
    def __init__(self, settings: Settings) -> None:
        self._settings = settings

    def history_limit(self, user: AuthUser | None) -> int | None:
        """None = historique complet."""
        return None if _tier(user) == "premium" else self._settings.free_history_limit

    def check_generation(self, user: AuthUser | None, request: GenerationRequest) -> None:
        tier = _tier(user)
        if tier == "premium":
            return
        allowed = ANONYMOUS_METHODS if tier == "anonymous" else FREE_METHODS
        max_count = 1 if tier == "anonymous" else 3
        if request.method not in allowed:
            raise PremiumRequiredError(
                f"La méthode « {request.method} » nécessite l'offre Premium."
            )
        if request.count > max_count:
            raise PremiumRequiredError(
                f"La génération de plus de {max_count} grilles nécessite l'offre Premium."
            )

    def max_monte_carlo_iterations(self, user: AuthUser | None) -> int:
        return {"anonymous": 1_000, "free": 10_000, "premium": 250_000}[_tier(user)]

    def check_csv_export(self, user: AuthUser | None) -> int | None:
        """Retourne la limite de lignes (None = illimité)."""
        tier = _tier(user)
        if tier == "anonymous":
            raise UnauthorizedError("Créez un compte pour exporter les données.")
        return None if tier == "premium" else 100

    def check_pdf_export(self, user: AuthUser | None) -> None:
        if _tier(user) != "premium":
            raise PremiumRequiredError("L'export PDF nécessite l'offre Premium.")

    def check_advanced_stats(self, user: AuthUser | None) -> None:
        if _tier(user) != "premium":
            raise PremiumRequiredError(
                "Les statistiques avancées nécessitent l'offre Premium."
            )

    def saved_grids_limit(self, user: AuthUser) -> int | None:
        return None if _tier(user) == "premium" else self._settings.free_saved_grids_limit
