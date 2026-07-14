# LotoLab IA — MVP

Application mobile Flutter + API Python/FastAPI pour analyser l'historique des tirages du Loto.

## Positionnement
LotoLab IA produit des analyses statistiques et des simulations. Il ne prédit pas les numéros gagnants et n'augmente pas mathématiquement la probabilité de gain d'une grille.

## Contenu
- `backend/` : API FastAPI, import CSV, fréquences, retards, cooccurrences, génération pondérée et simulation.
- `mobile/` : application Flutter Android/iOS.
- `supabase/` : schéma SQL initial.
- `docs/` : architecture, monétisation et mise en production.

## Démarrage API
```bash
cd backend
python -m venv .venv
source .venv/bin/activate      # Windows : .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

API : `http://127.0.0.1:8000`
Documentation : `http://127.0.0.1:8000/docs`

## Démarrage Flutter
```bash
cd mobile
flutter pub get
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:8000
```

Pour un appareil physique, remplacer l'URL par l'adresse IP locale de la machine exécutant FastAPI.

## Import des tirages
Déposer un CSV dans `backend/data/tirages.csv`.

Colonnes acceptées :
`date,n1,n2,n3,n4,n5,chance`

Exemple :
```csv
date,n1,n2,n3,n4,n5,chance
2026-07-11,3,12,24,37,48,6
```

## Étape production
1. Créer le projet Supabase.
2. Exécuter `supabase/schema.sql`.
3. Héberger l'API.
4. Configurer `API_BASE_URL`.
5. Ajouter les clés de signature Android et le compte Apple Developer.
6. Générer les builds :
```bash
flutter build appbundle --release
flutter build ipa --release
```
