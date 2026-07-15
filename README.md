# LotoLab IA

**Analysez. Comprenez. Jouez mieux.**

LotoLab IA est un laboratoire statistique **indépendant** du Loto : application mobile
(Flutter, Android/iOS), site web SEO (Next.js) et API (FastAPI) adossés à Supabase.
Il analyse l'historique officiel des tirages — fréquences, retards, écarts, paires,
tendances, simulations Monte-Carlo — et génère des grilles expérimentales.

> ⚠️ **Les tirages sont aléatoires. Les statistiques passées ne permettent pas de prévoir
> avec certitude les résultats futurs. Toute grille valide conserve la même probabilité
> théorique de gain.** LotoLab IA n'est affilié ni à la FDJ ni à aucun opérateur de jeux.
> Jeux d'argent interdits aux mineurs (18+).

## Structure du dépôt

```
backend/    API FastAPI : collecteur automatique, moteur statistique, générateur,
            comptes, Premium, administration (Python 3.11, 75 tests pytest)
web/        Site public + back-office /admin (Next.js 14, TypeScript, Tailwind)
mobile/     Application Flutter (Material 3, Riverpod, 22 écrans)
supabase/   Migrations SQL versionnées (13 tables, RLS complète)
branding/   Identité visuelle (SVG sources, script PNG, guide de marque)
docs/       Documentation projet (architecture, déploiement, SEO, tests…)
.github/    CI/CD GitHub Actions
```

## Démarrage rapide

### API
```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements-dev.txt
cp .env.example .env        # renseigner Supabase pour la persistance réelle
uvicorn app.main:app --reload
# http://127.0.0.1:8000/docs
```
Sans identifiants Supabase, l'API démarre en mode mémoire (développement uniquement).

### Site web
```bash
cd web
npm install
cp .env.example .env.local
npm run dev                 # http://localhost:3000 — back-office : /admin
```

### Mobile
```bash
cd mobile
flutter pub get
flutter run \
  --dart-define=API_BASE_URL=http://10.0.2.2:8000 \
  --dart-define=SUPABASE_URL=https://<ref>.supabase.co \
  --dart-define=SUPABASE_ANON_KEY=<clé anon>
```

## Tests

```bash
cd backend && .venv/bin/python -m pytest && .venv/bin/ruff check app tests
cd web && npm test && npm run lint && npm run typecheck
cd mobile && flutter analyze && flutter test
```

## Documentation

| Document | Contenu |
|---|---|
| [AUDIT_TECHNIQUE.md](AUDIT_TECHNIQUE.md) | Audit du MVP d'origine et corrections appliquées |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Architecture détaillée des quatre composants |
| [docs/INSTALLATION.md](docs/INSTALLATION.md) | Installation complète pas à pas |
| [docs/DEPLOIEMENT.md](docs/DEPLOIEMENT.md) | Mise en production (API, web, stores) |
| [docs/SUPABASE.md](docs/SUPABASE.md) | Base de données, migrations, RLS, sauvegardes |
| [docs/IMPORT_AUTOMATIQUE.md](docs/IMPORT_AUTOMATIQUE.md) | Collecteur de tirages : sources, planification, quarantaine |
| [docs/SEO.md](docs/SEO.md) | Stratégie et implémentation SEO |
| [docs/MONETISATION.md](docs/MONETISATION.md) | Offre gratuite/Premium, publicité, achats |
| [docs/TESTS.md](docs/TESTS.md) | Stratégie de test et couverture |
| [docs/ROADMAP.md](docs/ROADMAP.md) | Feuille de route |
| [SECURITY.md](SECURITY.md) · [PRIVACY.md](PRIVACY.md) · [INCIDENT_RESPONSE.md](INCIDENT_RESPONSE.md) | Sécurité, confidentialité, incidents |
| [CHANGELOG.md](CHANGELOG.md) | Journal des versions |
| [RAPPORT_TRAVAUX.md](RAPPORT_TRAVAUX.md) | Rapport des travaux + éléments externes restants |

## Licence et marques

Code propriétaire du projet LotoLab IA. « Loto » et « FDJ » sont cités à titre descriptif ;
les marques appartiennent à leurs titulaires. Aucune donnée officielle n'est embarquée dans
le dépôt : la base se remplit via le collecteur officiel ou l'import manuel contrôlé.
