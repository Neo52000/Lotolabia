# Stratégie de tests — LotoLab IA

Règle : **aucune fonctionnalité critique n'est considérée terminée sans test.**
Toutes les données de test sont des fixtures fictives explicitement identifiées —
jamais des résultats officiels.

## Backend (pytest — 75 tests, `backend/tests/`)

| Fichier | Couverture |
|---|---|
| `test_parser.py` | Formats CSV (historique `;`, simple `,`), ZIP, encodages (UTF-8/latin-1), détection de changement de format, fichiers vides, lignes invalides (doublons, hors plage, dates illisibles/futures/avant 1976) |
| `test_collector.py` | Pipeline complet import→quarantaine→journaux, dédoublonnage au réimport, échec réseau (job `failed`), absence de source (alerte), validation d'une ligne de quarantaine corrigée |
| `test_stats.py` | Chaque métrique vérifiée sur des valeurs calculées à la main : fréquences abs/rel, retards (0/jamais sorti), écarts min/moy/max, paires/triplets, formes (consécutifs, dizaines, pair/impair, bas/haut, somme, amplitude, médiane, dispersion), périodes, comparaisons de fenêtres, profil numéro, historique vide, Monte-Carlo reproductible par seed |
| `test_generator.py` | Validité des 6 méthodes, reproductibilité par seed, exclusions/favoris respectés, contraintes d'équilibrage et de somme, diversification (≤ 2 numéros communs), erreurs claires sur contraintes impossibles, absence de vocabulaire interdit |
| `test_api.py` | Intégration HTTP : santé, erreurs homogènes (404/422), pagination et tri, filtre année, fenêtres, disclaimer présent partout, quotas par niveau (anonyme/gratuit/Premium) sur stats avancées, générateur, Monte-Carlo, exports CSV/PDF, auth (jeton invalide/absent), grilles (limite gratuite 402), favoris (doublon 409), préférences + consentements horodatés, RGPD (export, suppression avec confirmation), reçu d'achat 501 |
| `test_admin_api.py` | Autorisations (401/403), dashboard, import manuel (+ rejet d'extension), sync sans source, CRUD tirages avec audit, quarantaine (valider/rejeter), Premium (accorder → is_premium → révoquer), rôles, SEO, pubs, statut système |

Lancement : `cd backend && .venv/bin/python -m pytest -q`
Lint/analyse statique : `ruff check app tests` (+ config mypy fournie).

## Web (`web/`)

- **vitest** (`npm test`) : formatage des dates FR, avertissements obligatoires et
  absence de vocabulaire interdit.
- **eslint** (`npm run lint`) : règles next/core-web-vitals.
- **tsc** (`npm run typecheck`) : typage strict.
- **Build de production** (`npm run build`) : agit comme test d'intégration SSG/ISR —
  89 pages doivent se générer, y compris avec API indisponible (états vides).

## Mobile (`mobile/` — exécutés en CI, le SDK n'étant pas dans l'environnement de dev)

- `test/models_test.dart` : désérialisation des réponses API (tirages, stats, retards
  null, grilles générées avec avertissement).
- `test/widgets_test.dart` : NumberBall (sémantique accessible), WarningBanner,
  vocabulaire interdit, ErrorRetryView (retry), WindowSelector (fenêtres 10/20/50/100/tout).
- `flutter analyze` : analyse statique complète.

## Test de charge minimal

`backend/tests/load/locustfile.py` (locust installé en dev) :

```bash
cd backend && .venv/bin/locust -f tests/load/locustfile.py \
  --host http://localhost:8000 --users 50 --spawn-rate 5 --run-time 1m --headless
```

Cible indicative : P95 < 300 ms sur les endpoints statistiques avec cache chaud,
zéro erreur 5xx à 50 utilisateurs simultanés. (Le rate limiting doit être relevé via
`RATE_LIMIT_DEFAULT` pour un tir de charge.)

## Régression

- Tout bug corrigé = un test qui l'aurait détecté (exigence de revue).
- Les tests de parsing servent de non-régression face aux changements de format
  source : tout nouveau mappage de colonnes doit arriver avec sa fixture.

## CI

Le workflow `.github/workflows/ci.yml` exécute lint + tests backend, web et Flutter,
les builds (web, Android) et l'audit des dépendances sur chaque PR — voir
`docs/DEPLOIEMENT.md` pour la chaîne complète.
