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
> dépôt n'avait pas accès réseau à fdj.fr (politique de proxy). Les URLs exactes des
> fichiers historiques officiels doivent donc être vérifiées depuis l'environnement de
> production (page « historique des tirages » du site officiel) et renseignées dans
> `COLLECTOR_HISTORY_URLS`. Le pipeline, lui, est intégralement testé sur des fixtures
> reproduisant les formats publiés.

## Planification

| Moment (Europe/Paris) | Tâche |
|---|---|
| Lundi, mercredi, samedi 22 h 30 | Synchronisation post-tirage |
| Mardi, jeudi, dimanche 12 h 00 | Contrôle du lendemain (rattrapage) |
| Après un échec | Retries avec backoff exponentiel (60 s, 120 s, 240 s…) jusqu'à `COLLECTOR_MAX_RETRIES`, puis **alerte administrateur** (job `failed` + log niveau error visibles dans le back-office) |

Bouton **« Synchroniser maintenant »** dans le back-office (`POST /api/v1/admin/sync`,
action journalisée).

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
