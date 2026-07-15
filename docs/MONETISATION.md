# Monétisation — LotoLab IA

## Principes non négociables

- Ne jamais présenter l'application comme une méthode de gain.
- Vocabulaire proscrit : « grille gagnante », « numéros sûrs », « prédiction fiable »,
  « garantie de gain », « algorithme gagnant ».
- Aucun mécanisme agressif : pas de compte à rebours artificiel, pas de dark patterns,
  pas de ciblage des pertes ou des comportements compulsifs.
- Publicités discrètes uniquement, plafonnées par session, jamais sur les écrans
  jeu responsable / confidentialité, et personnalisées uniquement sur consentement
  explicite (désactivé par défaut).

## Offre gratuite vs Premium (implémentée côté API — `backend/app/services/premium.py`)

| Capacité | Anonyme | Gratuit | Premium |
|---|---|---|---|
| Statistiques principales (fréquences, retards, écarts, paires, tendances) | ✔ | ✔ | ✔ |
| Historique | 100 derniers | 100 derniers | complet |
| Statistiques avancées (triplets, comparaisons) | — | — | ✔ |
| Générateur : méthodes | aléatoire | aléatoire + fréquence | les 6 méthodes |
| Générateur : grilles/requête | 1 | 3 | 20 |
| Simulations Monte-Carlo | 1 000 it. | 10 000 it. | 250 000 it. |
| Export CSV | — | 100 lignes | complet |
| Export PDF | — | — | ✔ |
| Grilles enregistrées | — | 5 | illimité |
| Publicités | discrètes | discrètes | aucune |

Les administrateurs disposent des capacités Premium. Les limites gratuites sont
configurables (`FREE_*` dans `.env`).

## Achats intégrés (prévus techniquement, désactivés)

- **Formules** : mensuel, annuel, à vie (`premium_entitlements.product`), période
  d'essai possible (`trial`).
- **Plateformes** : Google Play Billing, App Store (StoreKit), et `stripe` prévu pour
  le web ; `manual` pour le support.
- **Flux** : le client soumet son reçu à `POST /api/v1/me/premium/receipt` → l'API le
  valide **serveur-à-serveur** auprès du store → `premium_entitlements` est créé/mis à
  jour (droits synchronisés sur tous les appareils via le même compte).
- **Restauration** : bouton « Restaurer mes achats » (mobile) → re-soumission des reçus.
- **État actuel** : l'endpoint répond `501 store_validation_disabled` tant que
  `STORE_VALIDATION_ENABLED=false`. Aucun droit n'est accordé sans validation réelle —
  jamais de validation simulée.

### Activation (quand les comptes stores existeront)
1. Créer les produits dans Play Console / App Store Connect
   (`premium_monthly`, `premium_yearly`, `premium_lifetime`).
2. Renseigner `GOOGLE_PLAY_PACKAGE_NAME`, `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON`,
   `APP_STORE_SHARED_SECRET`, `STORE_VALIDATION_ENABLED=true`.
3. Implémenter la validation dans `submit_receipt` (point d'intégration commenté) +
   webhooks (Real-time Developer Notifications / App Store Server Notifications) pour
   renouvellements et remboursements.
4. Côté Flutter : ajouter `in_app_purchase`, compiler avec
   `--dart-define=PURCHASES_ENABLED=true` (le paywall est déjà branché sur ce flag).

## Publicité

- Table `ad_placements` : chaque emplacement a un code, un réseau (AdMob), un ID
  d'unité et un plafond par session — **tout est désactivé par défaut** et ne
  s'active que depuis le back-office.
- Bannières discrètes sur écrans secondaires uniquement ; pas d'interstitiels
  intrusifs ; jamais pendant l'onboarding ni sur les écrans de conformité.
- Prérequis avant activation : compte AdMob, CMP de consentement (TCF), mise à jour
  de la politique de confidentialité (régie = sous-traitant).

## Revenus complémentaires (prévus, non activés)

| Piste | Condition d'activation |
|---|---|
| Affiliation responsable | Uniquement contenus pédagogiques ; jamais de « systèmes de gain » |
| Sponsoring contextuel | Partenaires identifiés clairement comme tels |
| API B2B (données/statistiques) | Clés API dédiées + facturation — l'architecture versionnée `/api/v1` le permet |
| Boutique / contenus pédagogiques Premium | Après validation de la demande |

## Indicateurs à suivre

MAU, rétention J1/J7/J30, conversion gratuit→Premium, churn, ARPU publicitaire,
taux de désinstallation après publicité, volume d'exports. La mesure d'audience
reste anonyme et soumise à consentement.
