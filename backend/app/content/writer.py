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
    "repartition-dizaines-loto": """
## Qu'est-ce qu'une « dizaine » au Loto ?

Les 49 numéros du Loto se répartissent en cinq groupes de dix : 1-9 (souvent
compté à part), 10-19, 20-29, 30-39 et 40-49. LotoLab IA calcule, pour
chaque tirage et chaque période, combien de numéros tombent dans chaque
tranche — une lecture complémentaire aux fréquences numéro par numéro.

## Pourquoi les dizaines se répartissent-elles de façon homogène ?

Sur un grand nombre de tirages, chaque dizaine contient environ le même
nombre de numéros (9 ou 10 selon la tranche), donc la probabilité qu'un
numéro tiré appartienne à telle ou telle dizaine est proche d'une tranche à
l'autre. Sur un historique long, la répartition observée des dizaines tend
donc à se rapprocher de cette proportion théorique — sans jamais la
respecter exactement à court terme, exactement comme pour n'importe quelle
autre statistique de fréquence.

## À quoi sert cette lecture ?

Regrouper par dizaines aide à visualiser la répartition d'un tirage en un
coup d'œil (une grille avec cinq numéros dans la même dizaine est
statistiquement rare, sans être impossible ni « anormale »). C'est un outil
de lecture descriptive, pas un critère de sélection qui changerait la
probabilité de gain d'une grille.
""",
    "paires-cooccurrences-expliquees": """
## Une cooccurrence, qu'est-ce que c'est ?

Une cooccurrence mesure combien de fois deux numéros sont sortis ensemble
dans le même tirage. LotoLab IA calcule, pour chaque numéro, ses
« compagnons » les plus fréquents — les numéros qui partagent le plus
souvent un tirage avec lui sur l'historique analysé.

## Pourquoi certaines paires paraissent plus fréquentes que d'autres

Avec 49 numéros possibles, il existe 1 176 paires distinctes. Sur un
historique de plusieurs milliers de tirages, chaque paire n'apparaît que
quelques dizaines de fois en moyenne — un échantillon assez petit pour que
des écarts visibles apparaissent naturellement, sans qu'aucune paire ne
soit réellement favorisée par le mécanisme du tirage (chaque boule est
tirée indépendamment des autres).

## Ce qu'il ne faut pas en déduire

Voir qu'une paire est sortie plus souvent que d'autres dans le passé ne
change rien à sa probabilité de ressortir ensemble au prochain tirage :
chaque combinaison de 5 numéros reste strictement équiprobable. Les
cooccurrences sont un outil d'exploration de l'historique, pas un signal
prédictif.
""",
    "numeros-consecutifs-frequence-reelle": """
## Deux numéros qui se suivent, c'est fréquent ou rare ?

Un tirage contient des numéros consécutifs (comme 23 et 24) plus souvent
qu'on ne l'imagine intuitivement. LotoLab IA compte, sur l'historique
analysé, la proportion de tirages contenant au moins une paire de numéros
consécutifs.

## Le calcul qui surprend

Sur les combinaisons de 5 numéros parmi 49, une majorité contient au moins
deux numéros consécutifs — c'est un résultat purement combinatoire, pas une
propriété du hasard « bien ou mal réparti ». L'intuition qui voit les
numéros consécutifs comme rares ou suspects se trompe sur ce point précis.

## Pourquoi cette intuition trompeuse est courante

Face à une grille avec des numéros consécutifs, on a tendance à y voir un
motif remarquable — alors qu'une grille sans aucun numéro consécutif est en
réalité statistiquement moins fréquente parmi l'ensemble des combinaisons
possibles. Les deux types de grilles ont pourtant exactement la même
probabilité théorique de sortir.
""",
    "equilibrage-pair-impair-bas-haut": """
## Deux équilibrages descriptifs parmi d'autres

L'équilibrage pair/impair compte combien de numéros pairs et impairs
compose une grille (sur 5 numéros, un équilibre 2-3 ou 3-2 est le plus
fréquent). L'équilibrage bas/haut compare le nombre de numéros inférieurs
ou égaux à 24 contre ceux supérieurs — même logique.

## Pourquoi ces répartitions reviennent souvent

Il existe davantage de combinaisons de 5 numéros proches d'un équilibre 2-3
que de combinaisons totalement déséquilibrées (5 numéros pairs, ou 5
numéros tous « bas ») — un résultat de dénombrement, pas un effet du
hasard qui « chercherait » l'équilibre. C'est la même logique que pour la
somme des numéros (voir notre article sur l'écart-type).

## L'option « équilibrage » du générateur

Le générateur de LotoLab IA propose de contraindre une grille générée à
respecter ces répartitions les plus fréquentes. Cela ne change rien à sa
probabilité théorique de gain : cela influence uniquement la manière dont
les numéros sont choisis pendant la génération, pas les règles du tirage
réel.
""",
    "controle-somme-grille-loto": """
## Contrôler la somme, concrètement

Le générateur de LotoLab IA permet de fixer une somme minimale et maximale
pour les 5 numéros d'une grille générée. Par défaut, la fourchette proposée
(100 à 150) correspond à la zone où se concentre la majorité des
combinaisons possibles — voir notre article sur l'écart-type appliqué aux
tirages pour le détail du calcul.

## Pourquoi proposer cette option

Certains joueurs souhaitent éviter les grilles à somme extrême (très basse
ou très haute), simplement parce qu'elles sont rares parmi l'ensemble des
combinaisons — une préférence esthétique ou exploratoire, pas une stratégie
qui changerait la probabilité de gain.

## Une contrainte parmi d'autres, jamais un avantage

Contrôler la somme réduit le nombre de grilles possibles parmi lesquelles le
générateur peut piocher, sans favoriser aucune d'entre elles par rapport aux
autres grilles valides du jeu réel. Chaque grille générée avec cette option
conserve exactement la même probabilité théorique de gain que n'importe
quelle autre grille.
""",
    "mediane-dispersion-grille-loto": """
## Deux mesures complémentaires à l'écart-type

La médiane d'une grille est la valeur qui sépare ses 5 numéros triés en deux
moitiés égales (le troisième numéro sur cinq, une fois triés). La
dispersion, elle, décrit l'étendue des valeurs — du minimum au maximum de la
grille (aussi appelée amplitude).

## Ce que ces mesures racontent sur une grille

Une grille avec une médiane proche de 25 et une dispersion large (numéros
répartis sur toute la plage 1-49) ressemble à la majorité des combinaisons
observées dans l'historique. Une grille avec une médiane extrême ou une
dispersion très faible (numéros tous proches les uns des autres) est plus
rare parmi l'ensemble des combinaisons possibles — sans être ni impossible,
ni moins probable au tirage suivant.

## Une lecture descriptive du passé, pas un critère de choix fiable

LotoLab IA affiche ces indicateurs pour permettre d'explorer et de comparer
des grilles ou des périodes de tirages. Comme pour toutes les statistiques
du site, ils décrivent ce qui s'est passé — ils ne permettent pas de
prévoir ce qui va se passer.
""",
    "histoire-loto-francais-reforme-2008": """
## Les débuts du Loto en France

Le Loto national français a été lancé en 1976. Sa formule a évolué plusieurs
fois au fil des décennies, avec des changements de nombre de numéros et de
mécanisme du numéro complémentaire.

## La réforme de 2008

En 2008, le jeu a été profondément réformé pour adopter le format encore en
vigueur aujourd'hui : 5 numéros tirés parmi 49, plus un numéro Chance tiré
indépendamment parmi 10. L'ancien format (6 numéros parmi 49, plus un numéro
complémentaire) a été abandonné à cette occasion — un changement de règles
suffisamment important pour que les statistiques d'avant et d'après 2008 ne
soient pas directement comparables.

## Pourquoi LotoLab IA commence son historique en 2008

La base de données de LotoLab IA couvre le Loto dans son format actuel,
c'est-à-dire depuis la réforme de 2008. Les données antérieures, dans
l'ancien format à 6 numéros, décrivent un jeu différent de celui joué
aujourd'hui et ne sont pas mélangées aux statistiques du Loto actuel, pour
éviter toute confusion entre deux jeux aux règles distinctes.
""",
    "tirage-equiprobable-explication": """
## La définition simple

Un tirage est dit équiprobable quand chaque résultat possible a exactement
la même probabilité de se produire. Au Loto, cela signifie que chacune des
1 906 884 combinaisons possibles de 5 numéros parmi 49 (multipliée par les
10 valeurs du numéro Chance, soit 19 068 840 combinaisons complètes) a
exactement la même chance de sortir à chaque tirage.

## Ce que ça implique concrètement

La combinaison 1-2-3-4-5 a exactement la même probabilité de sortir que
n'importe quelle autre combinaison de 5 numéros, aussi « aléatoire » ou
« organisée » qu'elle puisse paraître. Notre intuition a tendance à juger
certaines combinaisons comme plus ou moins probables selon leur apparence
(numéros consécutifs, dates de naissance, motifs visuels) — une erreur de
raisonnement, puisque le mécanisme du tirage ne « voit » aucune de ces
propriétés.

## Pourquoi c'est la base de tout le reste

L'équiprobabilité est le principe fondamental qui sous-tend tous les autres
articles de ce blog : aucune statistique, aucune méthode de génération,
aucun outil ne peut modifier cette égalité de probabilité entre les
combinaisons. C'est une propriété du jeu lui-même, assurée par son
mécanisme de tirage.
""",
    "glossaire-termes-statistiques-loto": """
## Fréquence

Nombre de fois qu'un numéro est sorti sur une période donnée (fréquence
absolue), ou part des tirages où il est sorti (fréquence relative,
généralement exprimée en pourcentage).

## Retard

Nombre de tirages écoulés depuis la dernière sortie d'un numéro. Un retard
de 0 signifie que le numéro est sorti au dernier tirage ; « jamais sorti »
signifie qu'il n'est apparu à aucun moment sur la période analysée.

## Écart (ou cycle)

Nombre de tirages entre deux sorties consécutives d'un même numéro. LotoLab
IA calcule l'écart minimal, moyen et maximal observés pour chaque numéro.

## Cooccurrence

Fréquence à laquelle deux numéros sortent ensemble dans le même tirage —
voir notre article dédié aux paires et cooccurrences.

## Écart-type, médiane, dispersion (amplitude)

Trois mesures qui décrivent comment les valeurs (par exemple la somme des 5
numéros d'une grille) se répartissent autour de leur moyenne — voir nos
articles dédiés à l'écart-type et à la médiane/dispersion.

## Pourquoi ce glossaire

Ces termes reviennent dans toutes les pages statistiques de LotoLab IA :
avoir leurs définitions précises à portée de main aide à interpréter
correctement chaque chiffre affiché, sans lui prêter un pouvoir prédictif
qu'il n'a pas.
""",
    "esperance-de-gain-mathematiques-du-jeu": """
## Qu'est-ce que l'espérance de gain ?

L'espérance de gain est la moyenne théorique de ce qu'un joueur peut
attendre de gagner (ou perdre) par mise, si l'on répétait le jeu un très
grand nombre de fois. Elle se calcule en pondérant chaque gain possible par
sa probabilité de survenir, moins le coût de la mise.

## Pourquoi elle est structurellement négative

Comme pour tout jeu d'argent organisé par un opérateur, une partie des mises
collectées sert à financer l'organisation du jeu et les taxes, avant
redistribution du reste en gains. Mathématiquement, cela signifie que
l'espérance de gain d'une mise est toujours inférieure à son coût, quelle
que soit la grille jouée ou la méthode utilisée pour la choisir.

## Ce que ça signifie pour un joueur

Aucune stratégie de sélection de numéros ne peut rendre l'espérance de gain
positive : c'est une propriété mathématique du jeu, indépendante des
numéros choisis. Comprendre cela permet de jouer en connaissance de cause,
comme une activité de loisir avec un coût attendu, et non comme un moyen
d'obtenir un rendement financier.
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
