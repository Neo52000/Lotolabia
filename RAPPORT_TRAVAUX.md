# Rapport des travaux — LotoLab IA

**Période :** 14-15 juillet 2026 · **Branche :** `claude/lotolab-ia-fullstack-6lbsw9`
**Point de départ :** MVP de 16 fichiers (audit détaillé dans `AUDIT_TECHNIQUE.md`)
**Résultat :** monorepo complet prêt pour une bêta réelle.

> 🌐 **Site déployé** : le projet Netlify `lotolabia` a été connecté au dépôt et le
> build de la branche a réussi (statut `ready` confirmé côté Netlify) :
> http://lotolabia.netlify.app — les pages tolèrent l'absence d'API tant qu'elle
> n'est pas hébergée (voir §3, point 2) et s'affichent alors avec la mention
> « données en cours de collecte ».
>
> 📊 **Base de données peuplée** : l'utilisateur a fourni 4 fichiers ZIP officiels
> (`nouveau_loto.zip`, `loto2017.zip`, `loto_201902.zip`, `loto_201911.zip`).
> Validés avec le parseur réel du projet (**0 ligne rejetée**), ils ont été
> importés dans la table `draws` du projet Supabase `lotolab-ia` :
> **2781 tirages officiels, du 06/10/2008 au 13/07/2026**, sans trou. L'import
> est journalisé (`import_jobs` #1, `sync_logs`) comme le ferait le collecteur
> automatique. Les fichiers sources n'ont pas été commités dans le dépôt (la
> donnée officielle vit en base, pas dans git — conformément à l'audit).

---

## 1. Travaux réalisés

### Audit et stabilisation
- Audit intégral du ZIP (`AUDIT_TECHNIQUE.md`) : 9 failles de sécurité, données
  fictives, incohérences fonctionnelles — toutes traitées.
- **Suppression des 5 tirages fictifs** du MVP : aucune donnée officielle n'est
  inventée ni embarquée ; la base démarre vide.

### Base de données (Supabase — projet `lotolab-ia`, réf. `kasapoqvsravyuejjjdq`, eu-west-3)
- 5 migrations versionnées **écrites et appliquées** : 13 tables (tirages, pipeline
  d'import avec quarantaine et journaux, profils, grilles, favoris, préférences,
  notifications, droits Premium, audit, contenus SEO, emplacements pub).
- **RLS sur 100 % des tables**, contraintes d'intégrité en base, triggers (profil
  auto à l'inscription, anti-escalade de rôle), fonctions durcies — advisors Supabase
  au vert (1 avertissement résiduel documenté et volontaire : `is_admin`).

### API FastAPI (backend/) — 75 tests pytest, ruff propre
- Socle : configuration par variables d'environnement, logging structuré sans données
  sensibles, erreurs homogènes, **auth JWT Supabase** (HS256 + JWKS), rôles admin en
  base, **rate limiting**, cache TTL invalidé aux écritures, CORS restrictif.
- **Collecteur automatique** : sources officielles configurables, parseur
  multi-formats avec **détection de changement de format** (échec explicite + alerte,
  jamais d'insertion hasardeuse), validation stricte, dédoublonnage, **quarantaine**,
  traçabilité source/horodatage, planification lun/mer/sam 22 h 30 + contrôles du
  lendemain, retries backoff → alerte admin, bouton « Synchroniser maintenant »,
  import manuel de secours (extension/taille contrôlées).
- **Moteur statistique complet** : fréquences abs/rel, retards, écarts min/moy/max,
  cycles, paires, triplets, cooccurrences, consécutifs, dizaines, pair/impair,
  bas/haut, somme (min/max/moyenne/médiane/écart-type), amplitude, fenêtres
  10/20/50/100/historique, périodes, comparaisons, profils par numéro (+ Chance),
  Monte-Carlo reproductible — chaque réponse avec explication pédagogique et
  **avertissement obligatoire**.
- **Générateur** : 6 méthodes (aléatoire, fréquence, retard, équilibrages, somme,
  diversification) + exclusions, favoris, multi-grilles, seed reproductible.
- Comptes : profil, préférences + consentements horodatés, grilles, favoris,
  notifications, **RGPD** (export JSON, suppression de compte en cascade).
- Exports CSV/PDF ; matrice Free/Premium appliquée côté serveur ; endpoints admin
  tous journalisés dans `audit_log`.

### Application mobile Flutter (mobile/)
- **22 écrans** (onboarding → suppression de compte), Material 3, thèmes clair/sombre
  à la charte, Riverpod, client dio typé (JWT, erreurs, paywall 402), go_router,
  **mode dégradé hors connexion** (cache local + bannière), partage, accessibilité,
  Premium derrière feature flag (`PURCHASES_ENABLED`). Tests unitaires + widgets ;
  compilation vérifiée par la CI (SDK absent de l'environnement de développement).

### Site web Next.js + SEO (web/) — build : 89 pages
- 17 pages éditoriales + **pages dynamiques riches** : par tirage (JSON-LD Dataset),
  par numéro 1-49, par numéro Chance, par année, par mois, comparaisons — avec
  statistiques réelles, graphiques SVG server-rendered, maillage interne, dates de
  mise à jour, **noindex automatique tant que les données manquent** (zéro page pauvre).
- SEO technique : titles/descriptions uniques, canonical, sitemap dynamique,
  robots.txt, Open Graph/Twitter, FAQPage JSON-LD, fil d'Ariane, 404/500,
  redirections, pagination rel prev/next, ~96 kB First Load JS.

### Back-office /admin
- Dashboard (dernier import, prochain contrôle, quarantaine, santé base),
  synchronisation manuelle, historique des imports + journaux, **quarantaine
  (valider/rejeter)**, CRUD tirages + recalcul global, utilisateurs/rôles,
  Premium (accorder/révoquer), contenus SEO, emplacements pub (off par défaut),
  journal d'audit, état système. Auth Supabase + rôle admin obligatoire.

### Monétisation & conformité
- Free vs Premium (voir `docs/MONETISATION.md`) ; achats mensuel/annuel/à vie prévus,
  endpoint de reçus **volontairement en 501** tant que les stores ne sont pas
  configurés (aucune validation simulée) ; restauration prévue ; pubs configurables
  désactivées par défaut.
- Jeu responsable : avertissement systématique, 18+, notifications limitées (3/sem.
  par défaut) et désactivables, ressources Joueurs Info Service, mention
  d'indépendance FDJ sur toutes les surfaces, vocabulaire interdit proscrit (testé).
- RGPD : consentements horodatés, export, suppression, politique de conservation.

### Identité visuelle (branding/)
- Symbole original (boule de tirage + histogramme), logos principal/horizontal/
  monochrome en variantes claires/sombres, icône d'app (1024→96), favicons, splash —
  SVG sources + **PNG générés** par script reproductible + guide de marque.
  Aucune reprise des codes visuels FDJ.

### Qualité, CI/CD, documentation
- **75 tests backend**, 4 tests web + build 89 pages, tests Flutter, lint/analyse
  statique partout, test de charge minimal (locust).
- Workflows GitHub Actions : CI complète (dont vérification des migrations sur un
  Postgres 17 vierge), build Android, déploiement staging Netlify, **production
  derrière validation manuelle** (environment GitHub).
- **14 documents** : README, AUDIT_TECHNIQUE, ARCHITECTURE, INSTALLATION, DEPLOIEMENT,
  SUPABASE, IMPORT_AUTOMATIQUE, SEO, MONETISATION, SECURITY, PRIVACY, TESTS, ROADMAP,
  CHANGELOG (+ INCIDENT_RESPONSE et le présent rapport).

---

## 2. Vérifications effectuées

| Vérification | Résultat |
|---|---|
| `pytest` backend | **75/75 verts** |
| `ruff check` backend | propre |
| Démarrage réel API + curl (santé, stats, générateur, admin 401) | OK |
| Migrations sur le projet Supabase réel + advisors | appliquées, au vert |
| `next build` (lint + typecheck inclus) | **89 pages générées** |
| `vitest` web | 4/4 verts |
| Tests/analyse Flutter | via CI GitHub Actions (SDK absent localement) |

---

## 3. Éléments nécessitant des comptes externes ou des clés privées (à votre main)

| # | Élément | Où le renseigner |
|---|---|---|
| 1 | **URLs officielles des fichiers historiques de tirages** — le format réel a été validé avec succès (4 fichiers officiels fournis, 0 rejet, historique 2008-2026 importé) ; il reste à identifier les URLs de téléchargement direct depuis un réseau non filtré (l'environnement de dev bloque fdj.fr) pour automatiser les futures synchronisations | `COLLECTOR_HISTORY_URLS` (API) |
| 2 | Hébergeur de l'API (Fly.io/Railway/Scaleway…) + variables d'env — **le site est déployé (http://lotolabia.netlify.app) mais n'a pas encore d'API à interroger** | `docs/DEPLOIEMENT.md` §1, puis `NEXT_PUBLIC_API_BASE_URL` sur Netlify |
| 3 | Domaine définitif du site (actuellement `lotolabia.netlify.app`) | `NEXT_PUBLIC_SITE_URL`, Netlify → Domain settings, Search Console |
| 4 | Jeton + site Netlify pour la CI automatisée (le déploiement initial a été fait manuellement via l'interface Netlify) | secrets `NETLIFY_AUTH_TOKEN`, `NETLIFY_SITE_ID(_PROD)` |
| 5 | Google Play Console (25 $ une fois) + keystore de signature | secrets `ANDROID_*` du workflow |
| 6 | Compte Apple Developer (99 $/an) | build iOS/TestFlight |
| 7 | Produits d'achat intégré dans les deux consoles + activation validation des reçus | `STORE_VALIDATION_ENABLED`, `GOOGLE_PLAY_*`, `APP_STORE_SHARED_SECRET` |
| 8 | Compte AdMob + CMP de consentement (si publicité activée) | back-office → Publicités |
| 9 | FCM/APNs pour les notifications push réelles | intégration mobile (roadmap Lot 2) |
| 10 | E-mails de contact (support, RGPD/DPO) + raison sociale | mentions légales, confidentialité, SECURITY.md — placeholders signalés |
| 11 | Premier administrateur | `update profiles set role='admin' where id='<uuid>';` |

## 4. Hypothèses documentées

- Les fixtures de test reproduisent les formats publiés (`date_de_tirage;boule_1..5;
  numero_chance` et `date,n1..n5,chance`) ; tout écart réel sera détecté par la
  `FormatChangeError` et se corrige dans `COLUMN_MAPPINGS` avec un test.
- Le cache est en mémoire (mono-instance) ; passage à Redis documenté si multi-instances.
- La probabilité rang 1 (1/19 068 840) correspond aux règles publiques actuelles du
  jeu (5/49 + 1/10) ; se référer au règlement officiel pour les rangs et montants.
