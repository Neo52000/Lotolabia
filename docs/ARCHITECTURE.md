# Architecture cible

## Mobile
Flutter Android/iOS :
- accueil et dernier tirage ;
- fréquences, retards, paires et tendances descriptives ;
- générateur de grilles expérimentales ;
- favoris ;
- notifications ;
- consentement publicitaire et achats intégrés éventuels.

## API
FastAPI :
- ingestion et normalisation ;
- endpoints d'analyse ;
- simulation Monte Carlo ;
- cache ;
- authentification Supabase ;
- tâches planifiées pour mise à jour des tirages.

## Données
Supabase PostgreSQL :
- tirages ;
- profils ;
- grilles sauvegardées ;
- événements analytiques anonymisés ;
- abonnements et droits.

## Sécurité
- aucune clé secrète dans Flutter ;
- validation stricte des plages de numéros ;
- limitation de débit ;
- journalisation ;
- sauvegardes ;
- RLS Supabase ;
- politique de confidentialité et suppression du compte.
