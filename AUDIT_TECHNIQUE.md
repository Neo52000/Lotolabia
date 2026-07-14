# Audit technique — LotoLab IA

**Date de l'audit :** 2026-07-14
**Périmètre :** contenu intégral du ZIP `LotoLab_IA_MVP.zip` (16 fichiers), importé tel quel dans le commit initial du dépôt.
**Statut :** les corrections listées ici sont appliquées dans les commits qui suivent le commit d'import.

---

## 1. État actuel du projet (au moment de l'import)

| Composant | État | Détail |
|---|---|---|
| Backend FastAPI | Prototype | 8 endpoints, stockage **CSV local** (pas de base), 4 statistiques (fréquences, retards, cooccurrences, Monte-Carlo simpliste), 1 générateur pondéré |
| Application Flutter | Écran unique | 1 dashboard (grille pondérée + top fréquences), pas de navigation, pas de gestion d'état, pas de thème sombre, couleur hors charte (`#17324D`) |
| Supabase | Schéma seulement | 3 tables (`draws`, `profiles`, `saved_grids`), **pas de migrations versionnées**, RLS absente sur `draws` |
| Site web | **Absent** | — |
| Back-office | **Absent** | — |
| Collecteur automatique | **Absent** | import CSV manuel uniquement |
| Notifications | **Absentes** | — |
| Monétisation / Premium | Doc seulement | `docs/MONETISATION.md`, aucune implémentation |
| Identité visuelle | **Absente** | aucun logo, icône, splash |
| CI/CD | **Absent** | — |
| Tests | 3 tests unitaires | uniquement `frequencies`, `delays`, `weighted_grid` |
| Documentation | 4 fichiers partiels | README, ARCHITECTURE, MONETISATION, ROADMAP (sur les 14 demandés) |

## 2. Failles de sécurité identifiées

1. **CORS `allow_origins=["*"]`** avec toutes méthodes et tous en-têtes — à restreindre par configuration.
2. **Aucune authentification** : tous les endpoints, y compris `POST /draws` et `POST /draws/import` (écriture), sont publics.
3. **Aucune autorisation / notion d'administrateur.**
4. **Aucune limitation de débit** : Monte-Carlo jusqu'à 250 000 itérations accessible sans contrainte → vecteur d'épuisement CPU.
5. **`POST /draws/import` écrase la totalité des données** (`save_draws(imported)`) sans validation de fichier, sans limite de taille, sans contrôle d'extension, sans dédoublonnage.
6. **Parsing CSV non défensif** : `KeyError`/`ValueError` non gérés → 500 non maîtrisés.
7. **RLS Supabase incomplète** : `draws` sans RLS ; `saved_grids` sans contrainte de plage sur les numéros côté SQL.
8. **Pas de journalisation**, pas de gestion centralisée des erreurs, pas de variables d'environnement (aucune config, aucun `.env.example`).
9. **`__import__("csv")` inline** dans `main.py` : code obscur, non idiomatique.

## 3. Éléments simulés ou fictifs détectés

- **`backend/data/tirages.csv` : 5 tirages inventés** (dates de juin-juillet 2026 avec numéros fictifs). Ce ne sont **pas** des résultats officiels. → **Supprimés**. La base de production démarre vide et se remplit exclusivement via le collecteur officiel ou l'import manuel contrôlé.
- Les jeux de données utilisés par les tests sont conservés mais explicitement marqués comme fixtures de test (jamais présentés comme données officielles).

## 4. Incohérences fonctionnelles

- Le dédoublonnage de `POST /draws` se fait sur la date seule, mais `POST /draws/import` n'en fait aucun et remplace tout l'historique.
- `delays()` retourne `null` pour un numéro jamais tiré : ambigu (jamais sorti vs sorti au dernier tirage = 0) — à re-spécifier.
- Monte-Carlo compare des grilles aléatoires aux 50 derniers tirages sans pondération temporelle ni documentation de la méthode.
- Le README documente un flux « production » (Supabase) alors que le code ne parle qu'au CSV local : le schéma Supabase n'est branché nulle part.
- L'app Flutter appelle `/analysis/grid` et `/analysis/frequencies` mais aucun écran ne présente l'avertissement complet exigé avant génération.

## 5. Dépendances manquantes / erreurs de compilation

- Backend : `pytest` absent de `requirements.txt` alors que des tests existent ; aucun `pyproject.toml`, lint ou typage.
- Mobile : dépendances minimales (`http` seul) — pas de gestion d'état, navigation, graphiques, Supabase, stockage local.
- Aucun code ne casse à la compilation en l'état (le MVP est petit mais cohérent) ; le risque est fonctionnel et sécuritaire, pas syntaxique.

## 6. Risques juridiques et de conformité

1. **Données des tirages** : les résultats doivent provenir des publications officielles FDJ légalement accessibles (fichiers historiques publiés). Interdiction de contourner authentification, captcha, limitations ou CGU. L'URL source est configurable et l'import manuel reste le secours.
2. **Aucune affiliation FDJ** : mention « outil indépendant d'analyse statistique, non affilié à la FDJ » requise sur toutes les surfaces ; aucune reprise visuelle des marques FDJ.
3. **Discours** : interdiction des formulations « grille gagnante », « numéros sûrs », « prédiction fiable », « garantie de gain », « algorithme gagnant ». Avertissement obligatoire sur toute statistique et toute grille générée.
4. **Jeu responsable** : restriction d'âge 18+, ressources d'aide (joueurs-info-service), limites de notifications.
5. **RGPD** : consentement, minimisation, export et suppression des données, politique de conservation — rien n'existait dans le MVP.

## 7. Choix techniques retenus

| Sujet | Choix | Justification |
|---|---|---|
| Persistance | **Supabase PostgreSQL** (projet dédié `lotolab-ia`) via `supabase-py`, migrations SQL versionnées dans `supabase/migrations/` | Demandé ; RLS native ; auth intégrée |
| Backend | FastAPI + Pydantic v2, settings par env vars, `slowapi` (rate limit), cache TTL, logging structuré | Continuité avec le MVP, écosystème mature |
| Auth API | Vérification des JWT Supabase (JWKS) + rôle admin par claim | Une seule source d'identité pour mobile/web/API |
| Collecteur | Module dédié multi-sources (fichier historique officiel → page publique → import manuel), quarantaine, journaux, APScheduler (lun/mer/sam 22h30 + contrôle lendemain 12h, retries backoff) | Exigence §4 |
| Web | Next.js (App Router) + TypeScript + Tailwind, SSG/ISR | Exigence §2 ; SEO |
| Back-office | Route `/admin` du site Next.js, protégée par rôle | Mutualisation du socle web |
| Mobile | Flutter, Material 3, Riverpod, dio, go_router, architecture par features | Exigence §2 |
| Exports | CSV natif + PDF (reportlab) côté API | Exigence §7/§10 |
| CI/CD | GitHub Actions ; production derrière un *environment* GitHub à validation manuelle | Exigence §14 |

## 8. Tâches prioritaires (ordre d'exécution)

1. ~~Audit~~ (ce document) ;
2. Suppression des données fictives, stabilisation du backend existant ;
3. Base Supabase : migrations complètes + RLS sur toutes les tables ;
4. Collecteur automatique avec quarantaine et planification ;
5. Moteur statistique complet et testé ;
6. API v1 sécurisée (auth, rate limit, cache, erreurs) ;
7. Application Flutter complète (22 écrans) ;
8. Site web + SEO ;
9. Back-office ;
10. Monétisation + conformité ;
11. Identité visuelle ;
12. Tests, CI/CD, documentation, livraison.

## 9. Éléments bloquants et hypothèses documentées

- **Réseau de développement** : l'environnement de build n'a pas accès à `fdj.fr` (politique réseau). Le collecteur est donc développé et testé sur des **fixtures au format documenté** ; les URLs réelles sont fournies par variables d'environnement (`COLLECTOR_HISTORY_URLS`, `COLLECTOR_RESULT_URL`) et devront être validées lors du premier déploiement.
- **SDK Flutter absent de l'environnement** : le code mobile est compilé et testé par la CI GitHub Actions (`flutter analyze`, `flutter test`, `flutter build appbundle`).
- **Comptes externes requis** (hors périmètre de cette session, listés aussi dans `RAPPORT_TRAVAUX.md`) : Google Play Console, Apple Developer, clés de signature, AdMob, produits d'achat intégré, domaine définitif, SMTP, FCM/APNs.
- **Aucune donnée officielle n'est embarquée dans le dépôt** : toute valeur de tirage présente dans le code est une fixture de test explicitement identifiée.
