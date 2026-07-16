# SEO — stratégie et implémentation

## Principes

1. **Zéro page pauvre** : toute page dynamique sans données réelles est servie en
   `noindex` et exclue du sitemap. Le contenu doit apporter une statistique réelle,
   une explication, un graphique, du contexte et des liens internes.
2. **Zéro promesse trompeuse** : les title/description parlent d'analyse et de
   statistiques, jamais de « numéros gagnants ». C'est à la fois une exigence éthique
   et une protection contre les pénalités.
3. **Mise à jour datée** : les pages de données affichent leur période d'analyse et se
   régénèrent par ISR après chaque tirage.

## Inventaire des pages

### Statiques (contenu éditorial riche)
`/` · `/resultats` · `/historique` · `/statistiques` · `/frequences` · `/retards` ·
`/comparaisons` · `/generateur` · `/simulations` · `/methodologie` · `/probabilites` ·
`/jeu-responsable` · `/faq` · `/blog` · `/mentions-legales` (noindex) ·
`/confidentialite` · `/contact`

### Dynamiques (générées depuis les données réelles)
- `/tirage/[date]` — une page par tirage : combinaison, caractéristiques descriptives,
  liens vers les fiches numéros, JSON-LD `Dataset` ;
- `/numero/[1..49]` — fiche complète par numéro : fréquence, retard, écarts,
  compagnons, dernières sorties, navigation précédent/suivant ;
- `/numero-chance/[1..10]` — idem pour le numéro Chance ;
- `/historique/[année]` et `/historique/[année]/[mois]` — navigation temporelle ;
- `/blog/[slug]` — contenus rédigés dans le back-office (table `seo_contents`).

## Implémentation technique

| Élément | Où |
|---|---|
| Titles/descriptions uniques | `metadata`/`generateMetadata` de chaque page |
| Canonical | `alternates.canonical` (base `NEXT_PUBLIC_SITE_URL`) |
| Sitemap dynamique | `src/app/sitemap.ts` — n'inclut les pages de données que si la base contient des tirages |
| robots.txt | `src/app/robots.ts` — `Disallow: /admin` |
| Open Graph / Twitter Cards | `metadata.openGraph`/`twitter` (layout + pages) |
| Schema.org | JSON-LD `Dataset` (pages tirage), `FAQPage` (/faq), fil d'Ariane visible sur toutes les pages internes |
| 404 / 500 | `not-found.tsx` / `error.tsx` personnalisées |
| Redirections | `next.config.mjs` (`redirects()`) |
| Pagination | `/historique?page=n` avec liens `rel=prev/next` |
| Maillage interne | boules cliquables → fiches numéros ; tirages → fiches ; footer ; blocs « explorer » |
| Prévention du duplicate | canonical systématique + une seule URL par contenu (les fenêtres d'analyse sont des sections, pas des pages) |
| Core Web Vitals | pages 100 % server-rendered (~96 kB First Load JS), graphiques en SVG/CSS natifs sans bibliothèque cliente, aucune image bloquante, lazy par défaut |
| Indexation maîtrisée | `noindex` automatique si API indisponible ou base vide ; `/admin` et mentions légales exclus |

## Contenus éditoriaux

Le back-office (Contenus SEO) permet de publier/éditer manuellement des articles en
Markdown avec title + meta description dédiés. Ligne éditoriale : pédagogie des
probabilités, lecture critique des « méthodes miracles », coulisses des données.
Jamais d'échange de liens artificiel.

### Production automatique (`backend/app/content/`)

En complément de l'édition manuelle, un service produit régulièrement de nouveaux
articles de blog, avec un principe strict : **aucune donnée n'est inventée**, tout
article s'appuie sur le vrai moteur statistique (`app/stats/engine.py`) ou sur un
texte pédagogique rédigé une fois pour toutes (jamais de génération de texte libre
non vérifiée).

- **Sujets évergreen** (`app/content/topics.py::EVERGREEN_TOPICS`) — une dizaine
  d'articles pédagogiques rédigés à la main (loi des grands nombres, biais du
  joueur, écart-type, Monte-Carlo, jeu responsable...), publiés une fois puis
  laissés stables.
- **Bilans mensuels/annuels** — générés dès qu'une période complète de tirages
  réels est disponible en base (`bilan-loto-AAAA-MM`, `bilan-loto-AAAA`), à partir
  de `frequencies`/`overview`/`draw_shapes`.
- **Palmarès glissant** (`palmares-100-derniers-tirages`) — recalculé et republié
  à chaque exécution (contenu « vivant », signal de fraîcheur légitime car basé sur
  des données réellement mises à jour).

Chaque article généré passe par `writer.assert_compliant()` : la publication est
bloquée si un mot du vocabulaire proscrit (« grille gagnante », « garantie de
gain »...) apparaît, et l'avertissement obligatoire est systématiquement inclus en
pied d'article (voir tests `backend/tests/test_content.py`).

**Cron** : `CONTENT_SCHEDULER_ENABLED=true` (une seule instance en production)
déclenche `ContentScheduler` chaque semaine (`CONTENT_SCHEDULE_DAY_OF_WEEK/HOUR/MINUTE`,
lundi 6 h par défaut), qui publie jusqu'à `CONTENT_BATCH_SIZE` nouveaux articles et
rafraîchit le palmarès glissant. Déclenchement manuel possible depuis
`/admin/seo` (bouton « Générer maintenant », `POST /api/v1/admin/content/generate`),
journalisé dans `audit_log` comme toute action sensible.

**Extension IA optionnelle** : `CONTENT_AI_ENABLED` + `CONTENT_AI_API_KEY` sont un
point d'extension pour brancher un modèle de langage qui reformule le texte
template-based avant publication (`ContentGenerationService.__init__(enhancer=...)`).
Désactivé par défaut — la production fonctionne sans clé externe, l'enrichissement
n'est qu'une amélioration optionnelle et n'est jamais bloquant (échec = publication
du texte de base).

## Checklist avant mise en production

- [ ] Renseigner `NEXT_PUBLIC_SITE_URL` avec le domaine définitif (canonical + sitemap).
- [ ] Vérifier `https://domaine/sitemap.xml` et `robots.txt` après déploiement.
- [ ] Déclarer le sitemap dans Google Search Console / Bing Webmaster Tools.
- [ ] Créer une image Open Graph dédiée (1200×630) à partir du logo horizontal.
- [ ] Contrôler les Core Web Vitals réels (PageSpeed Insights) après la première indexation.
