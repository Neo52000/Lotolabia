# Politique de sécurité — LotoLab IA

## Signaler une vulnérabilité

Écrivez à **reine.elie@gmail.com** avec une description, les étapes de
reproduction et l'impact estimé. Nous accusons réception sous 72 h. Merci de ne pas
divulguer publiquement avant correction (divulgation coordonnée, 90 jours max).

## Mesures en place

### Authentification et autorisations
- Identité unique via **Supabase Auth** ; l'API vérifie les JWT (HS256 via
  `SUPABASE_JWT_SECRET` ou ES256/RS256 via JWKS).
- Rôle administrateur stocké en base (`profiles.role`), jamais déduit d'un claim
  contrôlable par le client ; auto-promotion bloquée par trigger SQL.
- Tous les endpoints d'écriture exigent une authentification ; les endpoints
  d'administration exigent le rôle admin et sont **journalisés** (`audit_log`).

### Base de données
- **RLS activée sur 100 % des tables** : lecture publique limitée aux tirages,
  contenus publiés et emplacements pub actifs ; données utilisateur cloisonnées
  par `auth.uid()` ; tables d'administration réservées aux admins.
- La clé **service role** n'existe que côté serveur API (variable d'environnement).
- Requêtes paramétrées exclusivement (PostgREST) — aucune concaténation SQL.
- Contraintes d'intégrité en base (plages 1-49/1-10, unicité, distinctness).
- Fonctions `SECURITY DEFINER` durcies (EXECUTE révoqué pour anon/authenticated
  sauf `is_admin()`, nécessaire aux politiques RLS et sans fuite d'information).

### API
- **Rate limiting** global (slowapi, configurable `RATE_LIMIT_DEFAULT`).
- **CORS restrictif** : origines explicites via `CORS_ORIGINS` (jamais `*` en production).
- Gestion d'erreurs centralisée : aucun détail interne exposé, incidents journalisés.
- Validation stricte Pydantic sur toutes les entrées.
- Imports de fichiers : extensions `.csv`/`.zip` uniquement, taille max 5 Mo,
  parsing défensif, lignes invalides en quarantaine (jamais insérées).
- Simulations plafonnées par niveau d'offre (protection CPU).
- Journalisation structurée **sans données sensibles** (pas de tokens, pas d'e-mails
  complets dans les logs techniques).
- CSRF : non applicable en l'état (API stateless à jeton Bearer, pas de cookies de
  session) ; à réévaluer si des cookies sont introduits.

### Secrets
- **Aucun secret dans le dépôt** ; `.env.example` documente chaque variable.
- Rotation recommandée : clés Supabase et secrets JWT tous les 90 jours, et
  immédiatement après tout départ d'un membre de l'équipe ou soupçon de fuite
  (Dashboard Supabase → Settings → API → Rotate).
- CI/CD : secrets GitHub Actions chiffrés, environnement `production` protégé.

### Sauvegardes et restauration
- Sauvegardes gérées par Supabase (quotidiennes ; PITR selon plan) — procédure de
  restauration documentée dans `docs/SUPABASE.md`.
- Les migrations versionnées permettent de reconstruire le schéma à l'identique.

### Surveillance
- Journal des synchronisations (`sync_logs`) et statut des jobs (`import_jobs`)
  visibles dans le back-office ; échecs répétés du collecteur = alerte admin.
- Endpoint `/health` pour la supervision externe ; `GET /api/v1/admin/status`
  pour l'état détaillé (base, planificateur, sources).

## Gestion des incidents

Voir [INCIDENT_RESPONSE.md](INCIDENT_RESPONSE.md).
