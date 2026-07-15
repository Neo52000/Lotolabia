# Architecture — LotoLab IA

## Vue d'ensemble

```
┌────────────┐   ┌────────────┐   ┌─────────────────┐
│  Flutter   │   │  Next.js   │   │  Back-office    │
│ (Android/  │   │ (site SEO) │   │  (/admin, web)  │
│   iOS)     │   └─────┬──────┘   └───────┬─────────┘
└─────┬──────┘         │ ISR/SSR + fetch  │ JWT admin
      │ JWT user       ▼                  ▼
      │        ┌──────────────────────────────────┐
      └───────▶│        API FastAPI /api/v1       │
               │ auth · rate limit · cache · logs │
               │ stats · générateur · exports     │
               │ collecteur + APScheduler         │
               └───────────────┬──────────────────┘
                               │ service role (PostgREST, paramétré)
                               ▼
               ┌──────────────────────────────────┐
               │       Supabase PostgreSQL        │
               │  13 tables · RLS totale · Auth   │
               └──────────────────────────────────┘
```

L'identité est portée par **Supabase Auth** : mobile et web obtiennent un JWT, l'API le
vérifie (HS256/JWKS) et applique les autorisations (utilisateur / Premium / admin).
Les clients peuvent aussi lire certaines tables directement via PostgREST (RLS), mais le
chemin nominal passe par l'API, qui centralise règles métier, quotas et avertissements.

## Backend (`backend/`)

```
app/
├── main.py            création de l'app, middlewares, lifespan (repo, cache, scheduler)
├── core/              config (env), logging JSON, erreurs typées, sécurité JWT,
│                      cache TTL, rate limiting
├── db/                Repository (protocole) + MemoryRepository (tests/dev)
│                      + SupabaseRepository (PostgREST, service role)
├── schemas/           modèles Pydantic (tirages, grilles)
├── stats/             moteur statistique + Monte-Carlo + avertissements obligatoires
├── generator/         6 méthodes de génération, contraintes, seed
├── collector/         parser (multi-formats, détection de changement),
│                      service (pipeline import→quarantaine→logs), scheduler (cron+retries)
├── services/          matrice Free/Premium, exports CSV/PDF
└── api/v1/            draws, stats, generator, me (RGPD), content, admin
```

Décisions structurantes :
- **Protocole `Repository`** : les tests tournent sans réseau (mémoire), la production
  parle à Supabase via PostgREST (async httpx, requêtes paramétrées). Brancher un autre
  stockage = une classe.
- **Cache TTL en mémoire** : suffisant mono-instance ; interface compatible avec un
  Redis ultérieur. Invalidé à chaque écriture de tirage.
- **Planificateur dans l'API** (APScheduler) activé par `SCHEDULER_ENABLED=true` sur
  **une seule** instance ; les autres instances restent stateless.
- Toute réponse statistique embarque `explanation` + `disclaimer`.

## Web (`web/`)

Next.js 14 App Router. Pages publiques en **SSG/ISR** (`revalidate` 15 min à 24 h) qui
tolèrent l'absence d'API (état « collecte en cours » + `noindex`), maillage interne
dense, JSON-LD (Dataset, FAQPage), sitemap dynamique excluant les pages vides.
Le back-office `/admin` est un client React (Supabase Auth) qui appelle les endpoints
admin de l'API ; il est exclu de l'indexation (robots).

## Mobile (`mobile/`)

Flutter Material 3, architecture par features, Riverpod pour l'état, dio pour l'API
(injection JWT, erreurs typées dont `PremiumRequiredException` → paywall), go_router.
Mode dégradé hors connexion : les GET récents sont mis en cache (SharedPreferences) et
resservis avec bannière « données en cache ». Thèmes clair/sombre à la charte.

## Base de données (`supabase/migrations/`)

13 tables : `draws`, `import_jobs`, `import_quarantine`, `sync_logs`, `profiles`,
`saved_grids`, `favorites`, `user_preferences`, `notifications`,
`premium_entitlements`, `audit_log`, `seo_contents`, `ad_placements`.
RLS sur toutes ; contraintes d'intégrité en base ; triggers (profil auto,
`updated_at`, anti-escalade de rôle). Détail : `docs/SUPABASE.md`.

## Flux critiques

**Import d'un tirage** : source officielle → téléchargement → parsing (détection de
format) → validation ligne à ligne → dédoublonnage (contrainte unique + upsert
ignore-duplicates) → insertion / quarantaine → journaux → invalidation du cache.

**Suppression de compte (RGPD)** : `DELETE /me` (confirmation) → audit → suppression
Supabase Auth → cascades SQL sur toutes les tables utilisateur.
