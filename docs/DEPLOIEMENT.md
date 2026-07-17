# Déploiement — LotoLab IA

## Vue d'ensemble

| Composant | Cible recommandée | Mécanisme |
|---|---|---|
| Base + Auth | Supabase (projet `lotolab-ia`, eu-west-3) | Migrations versionnées |
| API FastAPI | Hébergeur conteneur UE (Fly.io, Railway, Scaleway, Clever Cloud…) | Docker/uvicorn |
| Site web + back-office | Netlify (plugin Next.js automatique) | CI ou Netlify build |
| Mobile | Google Play / App Store | Builds signés via CI |

## 1. API

```bash
# exécution production
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 2
```

Variables d'environnement requises (voir `backend/.env.example`) :
`ENVIRONMENT=production`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`,
`SUPABASE_JWT_SECRET` **ou** `SUPABASE_JWKS_URL`, `CORS_ORIGINS=https://<domaine>`,
`COLLECTOR_HISTORY_URLS`, `SCHEDULER_ENABLED=true` et `CONTENT_SCHEDULER_ENABLED=true`
(chacun sur **une seule** instance),
`RATE_LIMIT_DEFAULT`. Pour activer le paiement web (optionnel, voir
docs/MONETISATION.md) : `SITE_URL`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`,
`STRIPE_PRICE_MONTHLY`, `STRIPE_PRICE_YEARLY`, `STRIPE_PRICE_LIFETIME`.

Le `Dockerfile` est fourni dans `backend/Dockerfile` (image `python:3.11-slim`,
`uvicorn` en CMD, 2 workers). `backend/fly.toml` est prêt à l'emploi (app
`lotolabia`, région `cdg` pour rester proche de Supabase eu-west-3,
`min_machines_running = 0` pour rester dans l'offre gratuite au prix d'un cold
start) — `backend/fly.toml.example` reste disponible comme référence commentée.

**Point d'attention monorepo** : ce dépôt contient `web/`, `backend/` et `mobile/`
à la racine — il n'y a pas de `Dockerfile` à la racine. `fly launch` doit être
exécuté **depuis le dossier `backend/`**, ou le tableau de bord Fly.io connecté à
GitHub doit être configuré avec `backend` comme répertoire racine, sinon il ne
détecte rien.

```bash
cd backend
fly launch --copy-config --name lotolabia   # utilise fly.toml existant, ne pas régénérer
fly secrets set SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... SUPABASE_JWT_SECRET=... \
  CORS_ORIGINS=https://<domaine>
fly deploy
```

Points d'attention :
- `/docs` (Swagger) est automatiquement désactivé quand `ENVIRONMENT=production` ;
- supervision externe sur `GET /health` ;
- si plusieurs instances : une seule porte le planificateur, cache local par instance
  (TTL court) ou Redis à brancher.

## 2. Site web (Netlify)

- Base directory : `web` — Build : `npm run build` — le plugin officiel Next.js est
  détecté automatiquement (SSR/ISR pris en charge).
- Variables : `NEXT_PUBLIC_API_BASE_URL`, `NEXT_PUBLIC_SITE_URL`,
  `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- Le fichier `netlify.toml` du dépôt configure tout cela pour un déploiement direct.
- Après déploiement : vérifier `/sitemap.xml`, `/robots.txt`, une page numéro, `/admin`.

## 3. CI/CD (GitHub Actions)

| Workflow | Déclencheur | Contenu |
|---|---|---|
| `ci.yml` | push / PR | lint + tests backend (ruff, pytest), web (eslint, tsc, vitest, build), Flutter (analyze, test), vérification des migrations, audit des dépendances (pip-audit, npm audit) |
| `build-android.yml` | tag `v*` ou manuel | `flutter build appbundle --release` (signé si secrets présents, sinon artefact non signé) |
| `deploy-staging.yml` | push sur `main` | déploiement Netlify (site de staging) |
| `deploy-production.yml` | manuel (`workflow_dispatch`) | déploiement production **derrière l'environnement GitHub `production`** → approbation manuelle obligatoire (Settings → Environments → production → Required reviewers) |

Secrets GitHub à créer : `NETLIFY_AUTH_TOKEN`, `NETLIFY_SITE_ID`
(+ `NETLIFY_SITE_ID_PROD`), `NEXT_PUBLIC_*` (variables build web),
`ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`,
`ANDROID_KEY_PASSWORD` (builds signés).

## 4. Mobile

### Android
```bash
flutter build appbundle --release \
  --dart-define=API_BASE_URL=https://api.<domaine> \
  --dart-define=SUPABASE_URL=... --dart-define=SUPABASE_ANON_KEY=...
```
Signature : générer un keystore (`keytool -genkey ...`), configurer
`android/key.properties` (jamais commité — déjà dans .gitignore). Publier via la
Play Console (piste interne → fermée → production).

### iOS
```bash
flutter build ipa --release --dart-define=API_BASE_URL=... \
  --dart-define=SUPABASE_URL=... --dart-define=SUPABASE_ANON_KEY=...
```
Compte Apple Developer requis ; distribution TestFlight puis App Store.
Catégorie stores : les applications liées aux jeux d'argent ont des règles
spécifiques (classification 18+, déclarations) — prévoir la revue en conséquence.

## 5. Checklist de mise en production

- [ ] Migrations appliquées, advisors Supabase au vert.
- [ ] Premier admin promu (`profiles.role='admin'`).
- [ ] `COLLECTOR_HISTORY_URLS` validées + premier import complet vérifié.
- [ ] CORS restreint au(x) domaine(s) réel(s).
- [x] E-mails de contact et raison sociale complétés (mentions légales, confidentialité,
      SECURITY.md, INCIDENT_RESPONSE.md). Restent : forme juridique et adresse du siège.
- [ ] (Optionnel) Paiement web Stripe : clés renseignées + endpoint webhook créé dans
      le Dashboard Stripe. Sans compte utilisateur web, aucun parcours d'achat n'est
      encore exposé sur le site — voir docs/MONETISATION.md.
- [ ] Environnement GitHub `production` protégé par relecteur requis.
- [ ] Sauvegardes Supabase vérifiées (et PITR si plan le permettant).
- [ ] Supervision `/health` + alerte sur jobs `failed`.
