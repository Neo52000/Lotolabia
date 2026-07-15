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

Le back-office (Contenus SEO) permet de publier des articles/pages en Markdown avec
title + meta description dédiés. Ligne éditoriale : pédagogie des probabilités,
lecture critique des « méthodes miracles », coulisses des données. Jamais de contenu
généré en masse ni d'échange de liens artificiel.

## Checklist avant mise en production

- [ ] Renseigner `NEXT_PUBLIC_SITE_URL` avec le domaine définitif (canonical + sitemap).
- [ ] Vérifier `https://domaine/sitemap.xml` et `robots.txt` après déploiement.
- [ ] Déclarer le sitemap dans Google Search Console / Bing Webmaster Tools.
- [ ] Créer une image Open Graph dédiée (1200×630) à partir du logo horizontal.
- [ ] Contrôler les Core Web Vitals réels (PageSpeed Insights) après la première indexation.
