# Installation — LotoLab IA

## Prérequis

| Outil | Version | Composant |
|---|---|---|
| Python | 3.11+ | backend |
| Node.js | 20+ (22 recommandé) | web |
| Flutter SDK | 3.22+ (Dart ≥ 3.4) | mobile |
| Compte Supabase | — | base de données + auth |

## 1. Base de données Supabase

1. Créer un projet sur supabase.com (région UE recommandée — le projet de référence est
   `lotolab-ia`, eu-west-3).
2. Appliquer les migrations **dans l'ordre** via l'éditeur SQL du Dashboard (ou
   `supabase db push` avec la CLI) :
   `supabase/migrations/0001_draws_and_imports.sql` → `0002_users_grids_premium.sql`
   → `0003_admin_content_audit.sql` → `0004_rls_policies.sql` → `0005_harden_functions.sql`.
3. Relever dans Settings → API : l'URL du projet, la clé **anon** (publique) et la clé
   **service_role** (secrète, serveur uniquement), ainsi que le **JWT secret**.
4. Créer le premier administrateur : inscrire un compte (via l'app ou le Dashboard
   Auth), puis dans l'éditeur SQL :
   ```sql
   update public.profiles set role = 'admin' where id = '<uuid du compte>';
   ```

## 2. Backend

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements-dev.txt
cp .env.example .env
```

Renseigner dans `.env` : `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`,
`SUPABASE_JWT_SECRET` (ou `SUPABASE_JWKS_URL`), `CORS_ORIGINS`,
et `COLLECTOR_HISTORY_URLS` (voir `docs/IMPORT_AUTOMATIQUE.md`).

```bash
uvicorn app.main:app --reload      # http://127.0.0.1:8000/docs
pytest                             # 75 tests
ruff check app tests
```

Sans identifiants Supabase, l'API bascule en dépôt **mémoire** (message de log
explicite) : pratique pour développer, aucune persistance.

## 3. Site web + back-office

```bash
cd web
npm install
cp .env.example .env.local
```

Renseigner : `NEXT_PUBLIC_API_BASE_URL`, `NEXT_PUBLIC_SITE_URL`,
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (la clé anon est publique
par conception ; la sécurité repose sur la RLS).

```bash
npm run dev          # http://localhost:3000 — back-office : /admin
npm run build        # vérification production (89 pages)
npm test && npm run lint && npm run typecheck
```

## 4. Application mobile

```bash
cd mobile
flutter pub get
flutter run \
  --dart-define=API_BASE_URL=http://10.0.2.2:8000 \
  --dart-define=SUPABASE_URL=https://<ref>.supabase.co \
  --dart-define=SUPABASE_ANON_KEY=<clé anon>
```

- Émulateur Android : `10.0.2.2` pointe vers le localhost de la machine hôte.
- Appareil physique : utiliser l'IP locale de la machine exécutant l'API.
- Sans `SUPABASE_URL`, l'app fonctionne en mode anonyme (statistiques publiques).

```bash
flutter analyze && flutter test
```

## 5. Premier remplissage des données

Aucune donnée de tirage n'est embarquée dans le dépôt. Deux options :

1. **Collecteur automatique** : configurer `COLLECTOR_HISTORY_URLS` puis, dans le
   back-office, cliquer « Synchroniser maintenant ».
2. **Import manuel** : back-office → Imports → déposer un CSV/ZIP officiel
   (formats acceptés documentés dans `docs/IMPORT_AUTOMATIQUE.md`).

## Dépannage

| Symptôme | Cause probable |
|---|---|
| `401 Vérification JWT non configurée` | `SUPABASE_JWT_SECRET`/`SUPABASE_JWKS_URL` absents côté API |
| `403 Réservé aux administrateurs` | Le compte n'a pas `profiles.role='admin'` |
| Site web : « données en cours de collecte » | API injoignable depuis le serveur web ou base vide |
| L'app mobile n'atteint pas l'API | Mauvaise `API_BASE_URL` (émulateur vs appareil) ou CORS |
