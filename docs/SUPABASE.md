# Supabase — base de données et authentification

Projet de référence : **lotolab-ia** (`kasapoqvsravyuejjjdq`, région eu-west-3 / Paris,
PostgreSQL 17). Les 5 migrations de `supabase/migrations/` y sont appliquées.

## Schéma (13 tables)

| Table | Rôle | Accès (RLS) |
|---|---|---|
| `draws` | Tirages officiels (unique `draw_date+draw_type`, contraintes 1-49/1-10, distinctness) | Lecture publique ; écriture service role |
| `import_jobs` | Historique des imports (statut, compteurs, erreur, déclencheur) | Admin lecture ; service role écriture |
| `import_quarantine` | Lignes rejetées à l'import (données brutes + raison) | Admin lecture/révision |
| `sync_logs` | Journal détaillé des synchronisations | Admin lecture |
| `profiles` | Miroir de `auth.users` + rôle (`user`/`admin`) — créé par trigger à l'inscription | Propriétaire + admin ; rôle protégé par trigger anti-escalade |
| `saved_grids` | Grilles enregistrées (contraintes de plage en base) | CRUD propriétaire |
| `favorites` | Numéros suivis (unicité par utilisateur) | CRUD propriétaire |
| `user_preferences` | Thème, langue, notifications, consentements horodatés | CRUD propriétaire |
| `notifications` | Notifications in-app | Lecture/lu/suppression propriétaire ; création service role |
| `premium_entitlements` | Droits Premium (produit, plateforme, statut, expiration, reçu) | Lecture propriétaire+admin ; écriture service role |
| `audit_log` | Actions sensibles du back-office | Admin lecture ; service role écriture |
| `seo_contents` | Contenus éditoriaux (blog/pages) | Public si `published` ; gestion admin |
| `ad_placements` | Emplacements publicitaires (désactivés par défaut) | Public si `enabled` ; gestion admin |

Fonctions : `is_admin()` (utilisée par les politiques RLS), `has_premium(uid)`
(réservée service role), `handle_new_user()` (trigger), `set_updated_at()`,
`prevent_role_self_escalation()`, `array_distinct_count()`.
Durcissement : EXECUTE révoqué pour anon/authenticated sur les fonctions
`SECURITY DEFINER` (sauf `is_admin`, nécessaire et sans fuite).

## Appliquer les migrations

Via le Dashboard (SQL Editor) dans l'ordre 0001→0005, ou avec la CLI :

```bash
supabase link --project-ref <ref>
supabase db push          # applique supabase/migrations/
```

Règles :
- **Jamais de modification directe du schéma en production** hors migration versionnée.
- Chaque nouvelle migration = nouveau fichier numéroté (`0006_...sql`), idempotent
  autant que possible (`create ... if not exists`).
- Après application : vérifier les advisors (Dashboard → Advisors, ou MCP
  `get_advisors`) — zéro erreur attendu, seule exception documentée : `is_admin`.

## Authentification

- Fournisseur e-mail/mot de passe activé par défaut ; confirmez l'URL du site dans
  Auth → URL Configuration (redirections).
- L'API vérifie les JWT : renseigner `SUPABASE_JWT_SECRET` (clés legacy HS256) **ou**
  `SUPABASE_JWKS_URL=https://<ref>.supabase.co/auth/v1/.well-known/jwks.json` (clés
  asymétriques modernes).
- Promotion admin : `update public.profiles set role='admin' where id='<uuid>';`
  (ou via le back-office par un admin existant — action journalisée).

## Sauvegardes et restauration

- Plan payant : sauvegardes quotidiennes automatiques ; PITR activable (recommandé
  en production réelle).
- Restauration : Dashboard → Database → Backups → Restore. Ensuite :
  1. vérifier `GET /api/v1/admin/status` (base OK) ;
  2. « Recalcul global » dans le back-office (vide les caches) ;
  3. contrôler le dernier tirage affiché contre la publication officielle.
- Export manuel ponctuel : `pg_dump` via la chaîne de connexion (Settings → Database).

## Clés et rotation

| Clé | Usage | Exposition |
|---|---|---|
| `anon` (publishable) | Mobile + web (auth, lectures RLS) | Publique par conception |
| `service_role` | API backend uniquement | **Secret absolu** — jamais côté client, jamais dans le dépôt |
| JWT secret / JWKS | Vérification des tokens par l'API | Secret serveur |

Rotation : Dashboard → Settings → API. Après rotation, mettre à jour les variables
d'environnement de l'API et les secrets GitHub Actions, redéployer.
