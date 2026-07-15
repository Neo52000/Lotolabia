# Feuille de route — LotoLab IA

## ✅ Lot 1 — Fondations (fait, ce dépôt)

- Base Supabase complète (13 tables, RLS totale, migrations versionnées appliquées).
- API FastAPI : auth Supabase, rate limiting, cache, erreurs centralisées,
  collecteur automatique planifié avec quarantaine, moteur statistique complet,
  générateur 6 méthodes, matrice Free/Premium, exports CSV/PDF, administration
  journalisée — 75 tests.
- Application Flutter : 22 écrans, Material 3 clair/sombre, offline dégradé.
- Site Next.js SEO (89 pages générées) + back-office /admin.
- Identité visuelle, CI/CD, documentation complète.

## Lot 2 — Bêta réelle (prochaines étapes, comptes externes requis)

- [ ] Valider les URLs officielles des fichiers historiques depuis la production et
      lancer le premier import complet (voir docs/IMPORT_AUTOMATIQUE.md).
- [ ] Déployer l'API (hébergeur UE) + activer `SCHEDULER_ENABLED` sur une instance.
- [ ] Domaine définitif + Search Console + première campagne d'indexation.
- [ ] Compléter mentions légales / contacts RGPD (placeholders signalés).
- [ ] Bêta fermée Android (Play Console — piste interne) et iOS (TestFlight).
- [ ] Notifications push réelles (FCM/APNs) branchées sur la table `notifications`
      et le collecteur (nouveau tirage), dans les limites jeu responsable.

## Lot 3 — Lancement stores

- [ ] Clés de signature Android + compte Apple Developer, builds signés via CI.
- [ ] Fiches stores (captures, descriptions — vocabulaire conforme).
- [ ] Achats intégrés : produits dans les consoles, validation des reçus serveur
      (`STORE_VALIDATION_ENABLED`), webhooks de renouvellement/remboursement.
- [ ] AdMob + CMP de consentement, activation progressive des emplacements.

## Lot 4 — Consolidation

- [ ] Purge automatique des comptes inactifs (> 24 mois, avec notification).
- [ ] Cache partagé (Redis) si multi-instances ; CDN devant l'API si besoin.
- [ ] Supervision externe (uptime, alerting) + tableau de bord d'usage anonyme.
- [ ] Tests end-to-end Playwright complets sur le back-office.
- [ ] i18n du site et de l'app (structure `language` déjà en base).

## Idées évaluées, non engagées

EuroMillions et autres jeux (le schéma `draw_type` le permet), API B2B facturée,
contenus pédagogiques Premium, mode « atelier probabilités » pour l'éducation.
