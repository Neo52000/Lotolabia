# Import automatique des tirages

## Sources — règles impératives

Le collecteur n'utilise que des **sources légalement accessibles**, dans cet ordre de
priorité :

1. **Fichiers historiques officiels** publiés par l'opérateur (CSV/ZIP téléchargeables
   publiquement) — source principale ;
2. Pages officielles publiquement accessibles (si un format exploitable est publié) ;
3. **Import manuel de secours** via le back-office (CSV/ZIP, 5 Mo max).

Interdictions absolues (codées dans la philosophie du collecteur, à respecter dans
toute évolution) : contourner une authentification, un captcha, une limitation
technique, une interdiction explicite ou des conditions d'utilisation. Le collecteur
s'identifie avec un User-Agent transparent
(`LotoLabIA-Collector/1.0 (outil independant d'analyse statistique)`).

## Configuration

```env
# URLs des fichiers historiques officiels, séparées par des virgules
COLLECTOR_HISTORY_URLS=https://.../loto_YYYYMM.zip,https://.../loto_archive.zip
SCHEDULER_ENABLED=true          # sur UNE seule instance
SCHEDULER_TIMEZONE=Europe/Paris
COLLECTOR_MAX_RETRIES=5
COLLECTOR_RETRY_BACKOFF_SECONDS=60
```

> ⚠️ **À valider au premier déploiement** : l'environnement de développement de ce
> dépôt n'a aucun accès réseau à `fdj.fr` (tout le domaine et ses sous-domaines sont
> refusés par le proxy — `CONNECT tunnel failed, 403`). La page de référence est
> https://www.fdj.fr/jeux-de-tirage/loto/historique, mais c'est un **portail**, pas
> un lien de fichier direct : le(s) véritable(s) URL(s) de téléchargement CSV/ZIP
> doivent être extraites manuellement (bouton de téléchargement du site, ou onglet
> Réseau des outils développeur du navigateur) puis renseignées dans
> `COLLECTOR_HISTORY_URLS`. Le pipeline, lui, est intégralement testé sur des
> fixtures reproduisant les formats publiés (voir `backend/app/collector/parser.py`
> et `backend/tests/test_parser.py`) ; si le format réel diffère de ceux couverts
> par `COLUMN_MAPPINGS`, l'import échoue explicitement (`FormatChangeError`, job
> `failed` + alerte) au lieu d'insérer des données incorrectes — envoyer un
> échantillon du fichier réel (quelques lignes, en-têtes compris) pour ajuster le
> mappage si nécessaire.

## Planification

| Moment (Europe/Paris) | Tâche |
|---|---|
| Lundi, mercredi, samedi 22 h 30 | Synchronisation post-tirage |
| Mardi, jeudi, dimanche 12 h 00 | Contrôle du lendemain (rattrapage) |
| Après un échec | Retries avec backoff exponentiel (60 s, 120 s, 240 s…) jusqu'à `COLLECTOR_MAX_RETRIES`, puis **alerte administrateur** (job `failed` + log niveau error visibles dans le back-office) |

Bouton **« Synchroniser maintenant »** dans le back-office (`POST /api/v1/admin/sync`,
action journalisée, JWT admin requis).

### Trois façons de déclencher le calendrier ci-dessus

1. **Cron GitHub Actions, sans API hébergée** (`.github/workflows/collector-sync.yml`,
   **méthode par défaut**, aucun hébergement d'API requis) : le workflow planifié
   installe les dépendances Python et exécute directement
   `backend/scripts/run_scheduled_sync.py` dans le runner GitHub, contre Supabase (clé
   service role). `CollectorService` ne dépend pas du serveur FastAPI, donc il n'y a ni
   Fly.io, ni `SCHEDULER_ENABLED`, ni secret cron HTTP à gérer — seulement les
   identifiants Supabase. Les cron GitHub Actions étant fixés en UTC (pas d'awareness de
   fuseau horaire), le workflow planifie **deux appels par créneau** (un pour l'heure
   d'été, un pour l'heure d'hiver) ; l'appel superflu est sans risque grâce au
   dédoublonnage sur `draw_date + draw_type`. Configuration requise dans le dépôt GitHub
   (Settings → Secrets and variables → Actions → Secrets) :
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `COLLECTOR_HISTORY_URLS`
2. **Cron GitHub Actions vers une API déployée** (`POST /api/v1/cron/sync`, endpoint
   dédié authentifié par secret partagé `COLLECTOR_CRON_SECRET`, jamais par JWT) : utile
   si une API est de toute façon déployée (ex. Fly.io en scale-to-zero) et qu'on préfère
   déclencher la synchro via un appel HTTP qui réveille la machine à la demande plutôt
   que d'exécuter le script dans le runner. Non utilisé par défaut.
3. **Planificateur interne** (`SyncScheduler`, APScheduler) : actif uniquement si
   `SCHEDULER_ENABLED=true`. Nécessite qu'**une** instance de l'API tourne en continu —
   incompatible avec un déploiement en scale-to-zero, puisqu'aucun processus n'est alors
   actif à 22 h 30 pour déclencher le job.

   Ne pas activer plusieurs mécanismes simultanément (double synchronisation inutile,
   sans risque de corruption mais redondante).

## Pipeline d'un import

```
téléchargement (timeout, UA transparent)
   └─ parsing (backend/app/collector/parser.py)
       ├─ détection automatique du séparateur (; ou ,)
       ├─ détection du mappage de colonnes connu :
       │    · format historique : date_de_tirage, boule_1..boule_5, numero_chance
       │    · format simple     : date, n1..n5, chance
       ├─ ZIP → extraction du premier CSV
       └─ colonnes inconnues → FormatChangeError = job failed + alerte
           (jamais d'insertion hasardeuse)
   └─ validation ligne à ligne : dates (4 formats), plages 1-49 / 1-10,
      unicité des 5 numéros, pas de date future, pas avant 1976
       ├─ ligne valide   → normalisation (dates ISO, numéros triés)
       └─ ligne invalide → QUARANTAINE (donnée brute + raison), jamais insérée
   └─ insertion avec dédoublonnage (contrainte unique draw_date+draw_type,
      upsert ignore-duplicates) — la source et l'heure de récupération sont
      enregistrées sur chaque tirage
   └─ journalisation : import_jobs (compteurs, statut success/partial/failed)
      + sync_logs (détail) — consultables dans le back-office
   └─ invalidation du cache statistique
```

## Quarantaine

Back-office → Quarantaine : chaque ligne rejetée s'affiche avec sa donnée brute et sa
raison. Deux actions (journalisées) :
- **Valider et importer** : re-passe toutes les règles de validation ; n'insère que si
  la ligne corrigée est devenue conforme ;
- **Rejeter** : archive la ligne (statut `rejected`).

## Formats de fichier acceptés (import manuel)

```csv
date,n1,n2,n3,n4,n5,chance
2026-07-12,3,12,24,37,48,6
```
ou le format historique officiel (`;`, colonnes `date_de_tirage;boule_1..boule_5;numero_chance`,
dates `JJ/MM/AAAA`), directement ou dans un ZIP.

## Tests

`backend/tests/test_parser.py` (formats, ZIP, changement de format, lignes invalides,
encodages) et `backend/tests/test_collector.py` (pipeline, doublons, échec réseau,
alerte sans source, quarantaine → validation). Toute évolution du parser exige un test.
