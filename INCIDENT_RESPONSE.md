# Plan de réponse aux incidents — LotoLab IA

## Classification

| Niveau | Exemples | Délai de réaction cible |
|---|---|---|
| **P1 — Critique** | Fuite de données, compromission de clé service role, RLS contournée | Immédiat (< 1 h) |
| **P2 — Majeur** | API indisponible, base injoignable, corruption de données de tirages | < 4 h |
| **P3 — Mineur** | Collecteur en échec répété, format source modifié, bug fonctionnel | < 48 h |

## Procédure générale

1. **Détecter** — alertes des jobs (`import_jobs.status=failed`, `sync_logs` niveau error),
   supervision `/health`, signalement utilisateur.
2. **Qualifier** — niveau P1/P2/P3, périmètre (données concernées, nombre d'utilisateurs).
3. **Contenir** :
   - P1 données/clés : **rotation immédiate** des clés Supabase (Dashboard → Settings →
     API → Rotate), invalidation des sessions (Auth → Sessions), coupure de l'API si
     nécessaire (mise à l'échelle à zéro chez l'hébergeur).
   - P2 : basculer le site web en mode dégradé (les pages tolèrent l'absence d'API).
4. **Corriger** — correctif, tests, déploiement via le pipeline (validation manuelle en prod).
5. **Notifier** :
   - Violation de données personnelles : **CNIL sous 72 h** (art. 33 RGPD) et personnes
     concernées si risque élevé (art. 34).
   - Utilisateurs : bannière in-app/site si le service a été indisponible > 4 h.
6. **Documenter** — post-mortem dans `docs/incidents/AAAA-MM-JJ-titre.md` :
   chronologie, cause racine, impact, actions correctives et préventives.

## Scénarios préparés

### Clé service role exposée
Rotation immédiate → mise à jour des secrets (hébergeur API + GitHub Actions) →
audit `audit_log` et logs Supabase sur la période d'exposition → post-mortem.

### Le format des fichiers officiels change
Le parseur lève `FormatChangeError` : le job passe en `failed` avec un message explicite
(aucune insertion hasardeuse). → Adapter `COLUMN_MAPPINGS` dans
`backend/app/collector/parser.py`, ajouter un test de non-régression avec le nouveau
format, redéployer, relancer via « Synchroniser maintenant ».

### Données de tirage erronées détectées
Vérifier contre la publication officielle → corriger via le back-office (action
journalisée) → « Recalcul global » pour vider les caches → identifier la cause
(parser ? source ?) et ajouter un test.

### Restauration de la base
Voir `docs/SUPABASE.md` § Sauvegardes. Après restauration : `Recalcul global`,
vérifier `GET /api/v1/admin/status`, contrôler le dernier tirage affiché.

## Contacts

- Responsable incident : Reine Elie (reine.elie@gmail.com)
- Supabase status : status.supabase.com — Netlify status : netlifystatus.com
- CNIL (notification de violation) : cnil.fr
