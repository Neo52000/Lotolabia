# Changelog — LotoLab IA

Format inspiré de [Keep a Changelog](https://keepachangelog.com/fr/) ; versionnage SemVer.

## [Non publié]

### Ajouté
- **Production éditoriale automatique** (`backend/app/content/`) : service qui
  produit régulièrement de nouveaux articles de blog à partir des vraies
  statistiques (`app/stats/engine.py`) — aucune donnée inventée. Sujets évergreen
  pédagogiques rédigés une fois, bilans mensuels/annuels générés dès qu'une
  période complète est disponible, palmarès glissant rafraîchi à chaque
  exécution. Vocabulaire proscrit bloqué automatiquement
  (`writer.assert_compliant`), avertissement obligatoire systématique.
  Planificateur hebdomadaire (`CONTENT_SCHEDULER_ENABLED`), déclenchement manuel
  depuis `/admin/seo` (« Générer maintenant »), point d'extension optionnel pour
  un modèle de langage de reformulation (désactivé par défaut). 11 nouveaux
  tests (`tests/test_content.py`).
- **SEO blog** : structured data `BlogPosting` (JSON-LD) sur les pages d'article.
- **Mise en production Netlify** : variables `NEXT_PUBLIC_SITE_URL`,
  `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` configurées ;
  `backend/Dockerfile` + `backend/fly.toml.example` pour l'hébergement de l'API.
- **Replis sans API hébergée** (`web/src/lib/`) : tirages bruts, fréquences,
  retards, synthèse, générateur (aléatoire + fréquence), simulation
  Monte-Carlo et contenus de blog fonctionnent désormais côté site web même
  sans backend hébergé, via des ports fidèles et testés (27 tests) du moteur
  Python. Le générateur/simulations affichent un bandeau indiquant le calcul
  local.
- **Blog amorcé** : les 10 articles évergreen de la production éditoriale
  automatique ont été publiés directement dans `seo_contents` (le pipeline
  n'ayant jamais pu s'exécuter sans API hébergée), tracé dans `audit_log`.

## [1.0.0-beta.1] — 2026-07-14

Refonte complète du MVP en produit prêt pour une bêta réelle.

### Ajouté
- **Base de données** : projet Supabase dédié, 13 tables avec contraintes d'intégrité,
  RLS sur la totalité, triggers (profil auto, updated_at, anti-escalade de rôle),
  5 migrations versionnées appliquées, fonctions durcies (advisors au vert).
- **API** (`/api/v1`) : authentification JWT Supabase (HS256 + JWKS), rôles admin en
  base, rate limiting, cache TTL invalidé à l'écriture, CORS restrictif, journalisation
  structurée sans données sensibles, gestion d'erreurs homogène.
- **Collecteur automatique** : parseur multi-formats (historique officiel + simple +
  ZIP) avec détection de changement de format, validation stricte, dédoublonnage,
  quarantaine, traçabilité source/horodatage, planification lun/mer/sam 22 h 30 +
  contrôles du lendemain, retries backoff avec alerte admin, bouton « Synchroniser
  maintenant », import manuel de secours (extensions/taille contrôlées).
- **Moteur statistique** : fréquences abs/rel, retards, écarts min/moy/max (cycles),
  paires, triplets, cooccurrences par numéro, consécutifs, dizaines, pair/impair,
  bas/haut, somme (min/max/moyenne/médiane/écart-type), amplitude, fenêtres
  10/20/50/100/complet, périodes (année/mois), comparaisons, profils par numéro et
  numéro Chance, Monte-Carlo reproductible — chaque réponse avec explication et
  avertissement obligatoire.
- **Générateur** : aléatoire, pondération fréquence/retard, équilibrages, contrôle de
  somme, diversification, exclusions, favoris, multi-grilles, seed reproductible.
- **Comptes** : profil, préférences (thème, langue, notifications limitées,
  consentements horodatés), grilles enregistrées, favoris, notifications, RGPD
  (export JSON, suppression de compte en cascade).
- **Monétisation** : matrice Free/Premium appliquée côté API, droits
  `premium_entitlements`, endpoint de validation de reçus (501 tant que les stores ne
  sont pas configurés), emplacements publicitaires désactivés par défaut.
- **Application Flutter** : 22 écrans (onboarding → suppression de compte),
  Material 3 clair/sombre à la charte, Riverpod, dio typé, go_router, cache hors
  connexion, partage, accessibilité, paywall derrière feature flag.
- **Site web Next.js** : 17 pages statiques éditoriales + pages dynamiques par tirage,
  par numéro (1-49), par numéro Chance, par année et par mois ; SEO technique complet
  (canonical, sitemap dynamique, robots, OG/Twitter, JSON-LD Dataset/FAQPage,
  fil d'Ariane, 404/500, noindex automatique des pages sans données).
- **Back-office `/admin`** : dashboard, sync manuelle, historique des imports +
  journaux, quarantaine, CRUD tirages + recalcul, utilisateurs/rôles/Premium,
  contenus SEO, emplacements pub, audit, état système — toutes actions journalisées.
- **Identité visuelle** : logos SVG (principal/horizontal/monochrome, clair/sombre),
  icône app, favicon, splash, PNG générés par script, guide de marque.
- **CI/CD** : lint + tests backend/web/Flutter, builds, audit de dépendances,
  déploiement staging Netlify, production derrière validation manuelle.
- **Documentation** : 14 documents (architecture, installation, déploiement, Supabase,
  import, SEO, monétisation, tests, roadmap, sécurité, confidentialité, incidents,
  audit, changelog) + rapport de travaux.

### Modifié
- Backend entièrement restructuré (le stockage CSV local du MVP est remplacé par
  Supabase/PostgREST avec dépôt mémoire pour les tests).
- Écran unique Flutter remplacé par l'application complète.

### Supprimé
- **Les 5 tirages fictifs de démonstration du MVP** (`backend/data/tirages.csv`) :
  aucune donnée officielle n'est embarquée ; la base démarre vide et se remplit via
  les sources officielles.
- CORS `*`, import destructif sans validation, schéma SQL sans RLS du MVP.

### Sécurité
- Voir `SECURITY.md` — auth obligatoire sur toute écriture, RLS totale, quarantaine
  des données, secrets hors dépôt, audit des actions admin.

## [0.1.0] — MVP d'origine (ZIP fourni)
Prototype : API FastAPI sur CSV local, 4 statistiques, 1 écran Flutter, schéma
Supabase embryonnaire. Voir `AUDIT_TECHNIQUE.md`.
