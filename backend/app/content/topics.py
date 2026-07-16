"""Backlog de sujets d'articles pour la production éditoriale automatique.

Deux familles de sujets :
  * évergreen — liste fixe, pédagogique, publiée une fois puis laissée telle
    quelle (le contenu ne dépend pas des tirages) ;
  * récurrents — regénérés à partir des statistiques réelles (bilan mensuel,
    bilan annuel, palmarès glissant) : le slug est stable, le contenu est
    rafraîchi à chaque exécution, ce qui donne un signal de fraîcheur SEO
    légitime sans jamais inventer de données.

Aucun sujet ne promet de prédiction ou de méthode gagnante — voir
`app.stats.disclaimers` pour le vocabulaire proscrit, appliqué par le writer.
"""

from dataclasses import dataclass, replace
from datetime import date, timedelta

from ..schemas.draws import Draw

MONTH_NAMES_FR = [
    "",
    "janvier",
    "février",
    "mars",
    "avril",
    "mai",
    "juin",
    "juillet",
    "août",
    "septembre",
    "octobre",
    "novembre",
    "décembre",
]


@dataclass(frozen=True)
class Topic:
    slug: str
    kind: str  # evergreen | monthly_recap | yearly_recap | rolling_top
    title: str
    refresh: bool = False  # True => régénéré à chaque exécution (contenu vivant)
    context: dict | None = None  # paramètres nécessaires au writer (année/mois...)


EVERGREEN_TOPICS: list[Topic] = [
    Topic(
        "comprendre-loi-des-grands-nombres-loto",
        "evergreen",
        "Comprendre la loi des grands nombres appliquée au Loto",
    ),
    Topic(
        "biais-du-joueur-numero-en-retard",
        "evergreen",
        "Le biais du joueur : un numéro « en retard » n'est pas plus probable",
    ),
    Topic(
        "lire-graphique-frequences-loto",
        "evergreen",
        "Comment lire un graphique de fréquences de tirage",
    ),
    Topic(
        "methodes-miracles-loto-pieges",
        "evergreen",
        "Pourquoi aucune méthode ne peut garantir de gagner au Loto",
    ),
    Topic(
        "ecart-type-tirages-loto",
        "evergreen",
        "L'écart-type appliqué aux tirages du Loto, expliqué simplement",
    ),
    Topic(
        "comment-fonctionne-generateur-lotolab-ia",
        "evergreen",
        "Comment fonctionne le générateur de grilles de LotoLab IA",
    ),
    Topic(
        "numero-chance-statistiques-limites",
        "evergreen",
        "Numéro Chance : ce que les statistiques peuvent (et ne peuvent pas) montrer",
    ),
    Topic(
        "cycles-sequences-pareidolie-statistique",
        "evergreen",
        "Cycles et séquences : pourquoi notre cerveau y voit des motifs qui n'existent pas",
    ),
    Topic(
        "simulation-monte-carlo-loto-expliquee",
        "evergreen",
        "La simulation Monte-Carlo appliquée au Loto, expliquée simplement",
    ),
    Topic(
        "jeu-responsable-comprendre-les-risques",
        "evergreen",
        "Jeu responsable : comprendre les risques avant de jouer",
    ),
]

ROLLING_TOP_SLUG = "palmares-100-derniers-tirages"


def monthly_recap_topic(year: int, month: int) -> Topic:
    label = f"{MONTH_NAMES_FR[month]} {year}"
    return Topic(
        f"bilan-loto-{year:04d}-{month:02d}",
        "monthly_recap",
        f"Bilan statistique du Loto — {label}",
        context={"year": year, "month": month},
    )


def yearly_recap_topic(year: int) -> Topic:
    return Topic(
        f"bilan-loto-{year:04d}",
        "yearly_recap",
        f"Bilan statistique du Loto — année {year}",
        context={"year": year},
    )


def rolling_top_topic() -> Topic:
    return Topic(
        ROLLING_TOP_SLUG,
        "rolling_top",
        "Palmarès des numéros sur les 100 derniers tirages",
        refresh=True,
    )


def build_backlog(draws: list[Draw], existing_slugs: set[str]) -> list[Topic]:
    """Sujets à produire lors de la prochaine exécution.

    Ordre = priorité : pédagogie évergreen d'abord (contenu de fond, jamais
    obsolète), puis bilans de données dès qu'une période complète est
    disponible, puis le palmarès glissant (toujours en fin de liste, toujours
    régénéré).
    """
    topics = [topic for topic in EVERGREEN_TOPICS if topic.slug not in existing_slugs]

    if draws:
        last_date = max(draw.draw_date for draw in draws)

        prev_month_last_day = last_date.replace(day=1) - timedelta(days=1)
        monthly = monthly_recap_topic(prev_month_last_day.year, prev_month_last_day.month)
        if monthly.slug not in existing_slugs:
            topics.append(monthly)

        if last_date.month == 1 and last_date.day <= 15:
            yearly = yearly_recap_topic(last_date.year - 1)
            if yearly.slug not in existing_slugs:
                topics.append(yearly)

    topics.append(replace(rolling_top_topic()))
    return topics


def is_period_complete(period_end: date, month: int, year: int) -> bool:
    """Vrai si le mois `month`/`year` est entièrement couvert par les données disponibles."""
    next_month = date(year + (1 if month == 12 else 0), 1 if month == 12 else month + 1, 1)
    return period_end >= next_month - timedelta(days=1)
