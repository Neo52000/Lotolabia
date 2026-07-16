"""Génération d'articles éditoriaux à partir de sujets du backlog.

Deux modes de rédaction :
  * évergreen — texte pédagogique rédigé une fois pour toutes (aucune donnée
    de tirage requise) ;
  * data-driven — bilans mensuels/annuels et palmarès glissant, dont le corps
    est composé à partir des vraies fonctions du moteur statistique
    (`app.stats.engine`) : aucun chiffre n'est inventé, tout est calculé sur
    l'historique réel disponible en base.

Garde-fous appliqués à **tout** article produit ici, qu'il soit évergreen ou
data-driven :
  * avertissement obligatoire en pied d'article (`STATS_DISCLAIMER`) ;
  * mention d'indépendance FDJ ;
  * vérification automatique de l'absence de vocabulaire proscrit
    (`assert_compliant`) — lève une exception plutôt que de publier un texte
    non conforme.
"""

from __future__ import annotations

from dataclasses import dataclass

from ..schemas.draws import Draw
from ..stats import engine
from ..stats.disclaimers import INDEPENDENCE_NOTICE, STATS_DISCLAIMER
from .topics import MONTH_NAMES_FR, Topic

FORBIDDEN_PHRASES = [
    "grille gagnante",
    "numéro sûr",
    "numéros sûrs",
    "prédiction fiable",
    "garantie de gain",
    "algorithme gagnant",
    "méthode gagnante",
    "combinaison gagnante",
]


class NonCompliantArticleError(Exception):
    """Levée quand un texte généré contient du vocabulaire proscrit."""


def assert_compliant(text: str) -> None:
    lowered = text.lower()
    for phrase in FORBIDDEN_PHRASES:
        if phrase in lowered:
            raise NonCompliantArticleError(f"Vocabulaire proscrit détecté : « {phrase} ».")


@dataclass(frozen=True)
class ArticleDraft:
    slug: str
    title: str
    meta_description: str
    body_md: str


def _footer() -> str:
    return f"\n\n## À retenir\n\n{STATS_DISCLAIMER} {INDEPENDENCE_NOTICE}"


# ---------------------------------------------------------------------------
# Articles évergreen (texte pédagogique fixe)
# ---------------------------------------------------------------------------
_EVERGREEN_BODIES: dict[str, str] = {
    "comprendre-loi-des-grands-nombres-loto": """
## Une loi qui parle du long terme, pas du prochain tirage

La loi des grands nombres est un théorème de probabilités : plus on répète une
expérience aléatoire, plus la fréquence observée d'un résultat se rapproche de
sa probabilité théorique. Appliquée au Loto, cela veut dire que sur des
dizaines de milliers de tirages, chaque numéro de 1 à 49 finit par sortir à
peu près aussi souvent que les autres — c'est ce qu'on observe dans les
statistiques de fréquence de LotoLab IA sur l'historique complet.

## Ce que la loi des grands nombres ne dit pas

Elle ne dit rien sur le tirage suivant. Chaque tirage reste un événement
indépendant des précédents : les boules n'ont pas de mémoire. Un numéro qui
serait statistiquement « en retard » sur les 500 derniers tirages n'a pas une
probabilité plus élevée de sortir au prochain — sa probabilité reste
strictement identique à celle de n'importe quel autre numéro.

## Pourquoi c'est utile de le savoir

Comprendre cette distinction évite deux erreurs de raisonnement courantes :
croire qu'un numéro « en retard » va forcément rattraper son retard, ou au
contraire qu'un numéro sorti récemment a moins de chances de ressortir. Les
deux idées reposent sur la même confusion entre convergence à long terme et
indépendance à court terme.
""",
    "biais-du-joueur-numero-en-retard": """
## Le biais du joueur, ou l'illusion du rattrapage

Le « biais du joueur » (gambler's fallacy) est un biais cognitif bien
documenté en psychologie : il consiste à croire qu'un événement aléatoire
devient plus ou moins probable parce qu'il ne s'est pas produit depuis
longtemps. Au Loto, cela se traduit par l'idée qu'un numéro « en retard »
aurait plus de chances de sortir au prochain tirage.

## Pourquoi ce raisonnement est faux

Chaque tirage du Loto est un événement indépendant : les boules ne
« savent » pas depuis combien de temps un numéro n'est pas sorti. La
probabilité de sortie d'un numéro donné reste la même à chaque tirage,
qu'il soit sorti la semaine dernière ou qu'il n'y ait pas eu six mois.
La page **Retards** de LotoLab IA affiche ces écarts à titre purement
descriptif — pour observer l'historique, pas pour anticiper l'avenir.

## D'où vient cette impression trompeuse ?

Notre cerveau cherche des motifs, même dans des séquences purement
aléatoires. Voir qu'un numéro n'est pas sorti depuis 80 tirages donne une
impression de « déséquilibre à corriger », alors qu'il s'agit d'une
fluctuation statistique parfaitement normale sur une variable aléatoire.
""",
    "lire-graphique-frequences-loto": """
## Fréquence absolue et fréquence relative

Un graphique de fréquences affiche, pour chaque numéro de 1 à 49 (ou de 1 à
10 pour le numéro Chance), le nombre de fois où il est sorti sur une période
donnée (fréquence absolue) ou la part des tirages où il est sorti (fréquence
relative). LotoLab IA calcule ces deux valeurs sur l'historique complet ou
sur des fenêtres glissantes (10, 20, 50, 100 derniers tirages).

## Ce qu'un écart de fréquence signifie réellement

Sur un historique long, les fréquences de tous les numéros convergent vers
une valeur proche (voir notre article sur la loi des grands nombres). Sur une
fenêtre courte (les 20 ou 50 derniers tirages), des écarts plus visibles
apparaissent — c'est normal et attendu pour un échantillon de cette taille :
ils ne traduisent aucune propriété particulière du numéro lui-même.

## Comment l'utiliser sans se tromper

Un graphique de fréquences est un outil de lecture historique, pas un outil
de anticipation. Il permet de comprendre comment les tirages se sont
répartis, de vérifier la cohérence des données importées, ou simplement de
satisfaire sa curiosité — pas de déduire ce qui va sortir ensuite.
""",
    "methodes-miracles-loto-pieges": """
## Pourquoi une « méthode » ne peut pas changer la probabilité de gain

Le Loto est un tirage aléatoire simple : à chaque tirage, chaque combinaison
de 5 numéros parmi 49 (plus un numéro Chance parmi 10) a exactement la même
probabilité théorique de sortir. Aucune manière de choisir ses numéros —
qu'elle s'appuie sur des statistiques, des dates, des rêves ou un
générateur — ne peut modifier cette probabilité. C'est une propriété
mathématique du jeu, pas une question d'habileté.

## Ce que vendent réellement les « méthodes miracles »

Beaucoup de méthodes commerciales s'appuient sur des corrélations
statistiques repérées a posteriori sur un historique limité, puis présentées
comme des règles prédictives. Le problème : sur un tirage aléatoire, on
trouve toujours des motifs a posteriori si on cherche assez — ce que les
statisticiens appellent le sur-ajustement (overfitting). Ces motifs ne se
reproduisent pas de façon fiable sur les tirages futurs.

## L'approche de LotoLab IA

Les outils statistiques de LotoLab IA (fréquences, retards, écarts,
simulations Monte-Carlo) servent à explorer et comprendre l'historique réel
des tirages — pas à prédire l'avenir. Chaque grille générée, quelle que soit
la méthode choisie, conserve exactement la même probabilité théorique de
gain que n'importe quelle autre grille valide.
""",
    "ecart-type-tirages-loto": """
## Une mesure de dispersion, pas de tendance

L'écart-type mesure à quel point des valeurs s'écartent de leur moyenne.
Appliqué à la somme des 5 numéros d'une grille de Loto, il indique si les
sommes observées sur un ensemble de tirages sont plutôt regroupées près de
la moyenne ou au contraire dispersées.

## Pourquoi la somme suit une distribution en cloche

La somme de 5 numéros tirés parmi 49 suit, sur un grand nombre de tirages,
une distribution proche d'une loi normale : les sommes proches de la
moyenne théorique (environ 125) sont plus fréquentes que les sommes très
faibles (comme 1+2+3+4+5=15) ou très élevées (comme 45+46+47+48+49=235),
simplement parce qu'il existe beaucoup plus de combinaisons de 5 numéros qui
donnent une somme moyenne que de combinaisons donnant une somme extrême.

## Ce que ça change concrètement

Cela n'avantage aucune grille en particulier : toutes les combinaisons ont la
même probabilité individuelle. Mais cela explique pourquoi, statistiquement,
une grille avec une somme extrême (très basse ou très haute) est un choix
rare parmi l'ensemble des combinaisons possibles — une information purement
descriptive, disponible dans le générateur de LotoLab IA via l'option de
contrôle de somme.
""",
    "comment-fonctionne-generateur-lotolab-ia": """
## Un générateur transparent, pas une boîte noire

Le générateur de grilles de LotoLab IA propose plusieurs méthodes de
sélection aléatoire : aléatoire pur, pondération par fréquence historique,
pondération par retard, équilibrage pair/impair, équilibrage bas/haut,
contrôle de somme, ou diversification par rapport à des grilles précédentes.
Chaque méthode est documentée et son code est public.

## Ce que « pondération » veut dire ici

Pondérer par fréquence ou par retard ne change pas la probabilité théorique
de la grille obtenue : cela influence seulement la façon dont les numéros
sont piochés dans l'algorithme, en donnant un poids différent à certains
numéros pendant le tirage aléatoire. Le résultat reste une grille aléatoire
parmi l'ensemble des combinaisons valides, avec exactement la même
probabilité de gain que toute autre grille.

## Pourquoi utiliser une graine (seed) reproductible

Chaque génération peut être rejouée à l'identique grâce à une graine
optionnelle : utile pour comparer deux méthodes sur le même tirage aléatoire
sous-jacent, ou pour retrouver une grille générée précédemment sans avoir à
la sauvegarder manuellement.

## Le seul objectif : explorer, pas prédire

Le générateur est un outil d'exploration ludique et pédagogique. Il ne
prétend jamais augmenter les chances de gain — cela n'est mathématiquement
pas possible sur un tirage aléatoire équiprobable.
""",
    "numero-chance-statistiques-limites": """
## Un tirage indépendant, sur une plage plus petite

Le numéro Chance est tiré parmi 1 à 10, indépendamment des 5 numéros
principaux tirés parmi 1 à 49. Comme il n'existe que 10 valeurs possibles, sa
distribution statistique se stabilise généralement plus vite que celle des
numéros principaux sur un historique donné, simplement parce que
l'échantillon de tirages représente une part plus importante de l'ensemble
des valeurs possibles.

## Ce que les statistiques peuvent montrer

LotoLab IA calcule pour le numéro Chance les mêmes indicateurs que pour les
numéros principaux : fréquence absolue et relative, retard depuis la
dernière sortie, écarts entre sorties. Ces chiffres décrivent fidèlement
l'historique réel des tirages.

## Ce qu'elles ne peuvent pas montrer

Aucune de ces statistiques ne permet d'anticiper le numéro Chance du
prochain tirage. Comme pour les numéros principaux, chaque tirage du numéro
Chance est un événement indépendant des précédents, avec une probabilité
théorique strictement égale à 1/10 à chaque tirage, quel que soit
l'historique récent.
""",
    "cycles-sequences-pareidolie-statistique": """
## Pourquoi on croit voir des « cycles »

Le cerveau humain est câblé pour détecter des motifs, même dans des données
purement aléatoires — un phénomène appelé pareidolie lorsqu'il s'agit de
formes visuelles, et biais de motif (patternicity) de façon plus générale.
Face à une série de tirages, il est naturel de croire percevoir des cycles,
des séquences ou des régularités qui reviendraient périodiquement.

## Ce que dit la théorie des probabilités

Sur une séquence de tirages réellement aléatoires et indépendants, des
répétitions, des suites de numéros consécutifs ou des regroupements
apparents se produisent naturellement, avec une fréquence prévisible par le
calcul des probabilités. Leur apparition n'indique donc aucun mécanisme
caché : c'est le comportement normal attendu d'un processus aléatoire.

## Comment LotoLab IA aide à s'en rendre compte

Les simulations Monte-Carlo de LotoLab IA permettent de générer des tirages
purement aléatoires simulés en grand nombre, pour comparer leur allure à
celle des tirages réels. On y observe les mêmes types de régularités
apparentes — la meilleure preuve qu'elles ne trahissent aucun mécanisme
prédictif dans les données réelles.
""",
    "simulation-monte-carlo-loto-expliquee": """
## Le principe : simuler pour observer, pas pour prédire

Une simulation Monte-Carlo consiste à générer un très grand nombre de
tirages aléatoires simulés, afin d'observer la distribution statistique d'un
phénomène plutôt que de la calculer analytiquement. LotoLab IA l'utilise
pour deux usages : simuler des tirages aléatoires purs à des fins pédagogiques,
et évaluer comment une grille se serait comportée face à l'historique réel
des tirages.

## Ce que la simulation permet de vérifier

En simulant des dizaines de milliers de tirages aléatoires, on retrouve les
probabilités théoriques officielles du Loto — par exemple une probabilité de
1 sur 19 068 840 pour le rang 1 (5 numéros + le numéro Chance). Ces
simulations confirment empiriquement les calculs théoriques : elles ne les
contredisent jamais et ne les améliorent pas.

## Ce que la simulation ne permet pas

Simuler des tirages, même des millions de fois, ne donne aucune information
sur le tirage réel à venir. La simulation Monte-Carlo est un outil de
vérification et de pédagogie statistique, utile pour comprendre l'ordre de
grandeur des probabilités en jeu — pas un outil d'anticipation.
""",
    "jeu-responsable-comprendre-les-risques": """
## Le Loto reste un jeu d'argent

Malgré tous les outils statistiques qu'un site comme LotoLab IA peut
proposer, le Loto reste fondamentalement un jeu de hasard où l'espérance de
gain est structurellement négative sur le long terme (comme pour tout jeu
d'argent organisé par un opérateur). Jouer doit rester une activité de
loisir, avec un budget défini à l'avance et jamais dépassé.

## Les signaux à surveiller

Certains signes doivent alerter : jouer pour se refaire après une perte,
augmenter les mises pour retrouver les sensations initiales, jouer en cachette
de ses proches, ou ressentir de l'anxiété à l'idée de ne pas pouvoir jouer.
Ces signaux peuvent indiquer un rapport au jeu qui devient problématique.

## Où trouver de l'aide

En France, Joueurs Info Service (09 74 75 13 13, appel non surtaxé,
anonyme et gratuit) propose une écoute et un accompagnement pour toute
personne concernée par un usage problématique du jeu, joueur ou proche.
LotoLab IA rappelle cette ressource sur l'ensemble de ses pages liées au jeu,
et propose dans les préférences de compte des options pour limiter les
notifications liées au jeu.

## L'indépendance de LotoLab IA

LotoLab IA est un outil d'analyse statistique indépendant. Il n'est affilié
à aucun opérateur de jeux d'argent et ne perçoit aucune commission sur les
mises des joueurs.
""",
}


def write_evergreen(topic: Topic) -> ArticleDraft:
    body = _EVERGREEN_BODIES.get(topic.slug)
    if body is None:
        raise KeyError(f"Aucun contenu évergreen rédigé pour « {topic.slug} ».")
    full_body = body.strip() + _footer()
    assert_compliant(topic.title + "\n" + full_body)
    return ArticleDraft(
        slug=topic.slug,
        title=topic.title,
        meta_description=(body.strip().split("\n\n")[1][:280] if "\n\n" in body else topic.title),
        body_md=full_body,
    )


# ---------------------------------------------------------------------------
# Bilans data-driven (mensuel / annuel / palmarès glissant)
# ---------------------------------------------------------------------------
def _draws_in_month(draws: list[Draw], year: int, month: int) -> list[Draw]:
    return [d for d in draws if d.draw_date.year == year and d.draw_date.month == month]


def _draws_in_year(draws: list[Draw], year: int) -> list[Draw]:
    return [d for d in draws if d.draw_date.year == year]


def _top_numbers_md(freq: dict, limit: int = 5) -> str:
    top = sorted(freq["numbers"], key=lambda item: -item["count"])[:limit]
    lines = [f"- **{item['number']}** — sorti {item['count']} fois" for item in top]
    return "\n".join(lines)


def write_monthly_recap(topic: Topic, draws: list[Draw]) -> ArticleDraft | None:
    year, month = topic.context["year"], topic.context["month"]
    period_draws = sorted(_draws_in_month(draws, year, month), key=lambda d: d.draw_date)
    if not period_draws:
        return None
    freq = engine.frequencies(period_draws)
    overview = engine.overview(period_draws)
    label = f"{MONTH_NAMES_FR[month]} {year}"
    body = f"""
## {len(period_draws)} tirage(s) analysé(s) en {label}

Sur les {len(period_draws)} tirage(s) enregistré(s) en {label}, voici les
numéros les plus sortis :

{_top_numbers_md(freq)}

## Numéros les plus en retard fin {label}

En fin de période, les numéros affichant le plus grand nombre de tirages
sans sortie étaient :

{chr(10).join(f"- **{item['number']}** — {item['delay']} tirage(s) sans sortie" for item in overview['longest_delays']) or '- Données insuffisantes sur cette période.'}

## Comment lire ce bilan

Ce bilan est purement descriptif : il résume l'historique réel de
{label} tel qu'enregistré par LotoLab IA, à partir des données officielles
importées. Il ne permet en aucun cas d'anticiper les tirages à venir.
""".strip()
    full_body = body + _footer()
    assert_compliant(topic.title + "\n" + full_body)
    return ArticleDraft(
        slug=topic.slug,
        title=topic.title,
        meta_description=f"Bilan statistique réel des tirages du Loto en {label} : "
        f"numéros les plus sortis, retards, synthèse descriptive.",
        body_md=full_body,
    )


def write_yearly_recap(topic: Topic, draws: list[Draw]) -> ArticleDraft | None:
    year = topic.context["year"]
    period_draws = sorted(_draws_in_year(draws, year), key=lambda d: d.draw_date)
    if not period_draws:
        return None
    freq = engine.frequencies(period_draws)
    shapes = engine.draw_shapes(period_draws)
    body = f"""
## {len(period_draws)} tirages en {year}

L'année {year} a compté {len(period_draws)} tirage(s) enregistré(s) dans
l'historique LotoLab IA. Voici les numéros les plus sortis sur l'ensemble de
l'année :

{_top_numbers_md(freq, limit=10)}

## Répartition pair/impair et bas/haut

{shapes.get('explanation', '')}

## Une synthèse, pas une tendance à prolonger

Ces chiffres décrivent fidèlement les tirages réels de {year}. Ils ne se
prolongent pas mécaniquement sur {year + 1} : chaque tirage reste un
événement indépendant, avec la même probabilité théorique pour chaque
numéro.
""".strip()
    full_body = body + _footer()
    assert_compliant(topic.title + "\n" + full_body)
    return ArticleDraft(
        slug=topic.slug,
        title=topic.title,
        meta_description=f"Bilan statistique complet des tirages du Loto en {year}, "
        f"à partir des données officielles réellement enregistrées.",
        body_md=full_body,
    )


def write_rolling_top(topic: Topic, draws: list[Draw]) -> ArticleDraft | None:
    window = engine.apply_window(sorted(draws, key=lambda d: d.draw_date), 100)
    if not window:
        return None
    freq = engine.frequencies(window)
    delay = engine.delays(window)
    period_start = window[0].draw_date.isoformat()
    period_end = window[-1].draw_date.isoformat()
    delayed = sorted(
        (item for item in delay["numbers"] if item["delay"] is not None),
        key=lambda item: -item["delay"],
    )[:5]
    body = f"""
## Palmarès calculé sur {len(window)} tirages ({period_start} → {period_end})

Cette page est régénérée automatiquement à chaque exécution du planificateur
de contenu, sur la fenêtre des 100 derniers tirages disponibles.

### Numéros les plus sortis sur cette fenêtre

{_top_numbers_md(freq, limit=10)}

### Numéros les plus en retard sur cette fenêtre

{chr(10).join(f"- **{item['number']}** — {item['delay']} tirage(s) sans sortie" for item in delayed) or '- Données insuffisantes.'}

## Un palmarès descriptif, mis à jour régulièrement

Ce classement change à chaque nouveau tirage intégré à la base. Il décrit
l'historique récent — il ne présage en rien des numéros à venir.
""".strip()
    full_body = body + _footer()
    assert_compliant(topic.title + "\n" + full_body)
    return ArticleDraft(
        slug=topic.slug,
        title=topic.title,
        meta_description=f"Palmarès des numéros du Loto sur les {len(window)} derniers "
        f"tirages, mis à jour automatiquement.",
        body_md=full_body,
    )


def write_article(topic: Topic, draws: list[Draw]) -> ArticleDraft | None:
    if topic.kind == "evergreen":
        return write_evergreen(topic)
    if topic.kind == "monthly_recap":
        return write_monthly_recap(topic, draws)
    if topic.kind == "yearly_recap":
        return write_yearly_recap(topic, draws)
    if topic.kind == "rolling_top":
        return write_rolling_top(topic, draws)
    raise ValueError(f"Type de sujet inconnu : {topic.kind}")
