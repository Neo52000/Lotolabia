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

## Achats intégrés

- **Formules** : mensuel, annuel, à vie (`premium_entitlements.product`), période
  d'essai possible (`trial`).
- **Plateformes** : Google Play Billing, App Store (StoreKit) pour le mobile ;
  Stripe pour le web ; `manual` pour le support (octroi/révocation par un admin,
  `POST/DELETE /api/v1/admin/premium/...`).
- **Restauration** : bouton « Restaurer mes achats » (mobile) → re-soumission des reçus.

### Mobile (Google Play / App Store) — prévu techniquement, désactivé

Le client soumet son reçu à `POST /api/v1/me/premium/receipt` → l'API le valide
**serveur-à-serveur** auprès du store → `premium_entitlements` est créé/mis à jour
(droits synchronisés sur tous les appareils via le même compte). L'endpoint répond
`501 store_validation_disabled` tant que `STORE_VALIDATION_ENABLED=false`. Aucun
droit n'est accordé sans validation réelle — jamais de validation simulée.

Activation (quand les comptes stores existeront) :
1. Créer les produits dans Play Console / App Store Connect
   (`premium_monthly`, `premium_yearly`, `premium_lifetime`).
2. Renseigner `GOOGLE_PLAY_PACKAGE_NAME`, `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON`,
   `APP_STORE_SHARED_SECRET`, `STORE_VALIDATION_ENABLED=true`.
3. Implémenter la validation dans `submit_receipt` (point d'intégration commenté) +
   webhooks (Real-time Developer Notifications / App Store Server Notifications) pour
   renouvellements et remboursements.
4. Côté Flutter : ajouter `in_app_purchase`, compiler avec
   `--dart-define=PURCHASES_ENABLED=true` (le paywall est déjà branché sur ce flag).

### Web (Stripe) — implémenté, désactivé tant que les clés ne sont pas renseignées

- `POST /api/v1/me/premium/checkout` (authentifié) : crée une session Stripe
  Checkout (`stripe.checkout.Session`) pour l'offre demandée — abonnement
  (`monthly`/`yearly`) ou paiement unique (`lifetime`) — et renvoie son URL de
  redirection. Aucun droit accordé à la création de la session.
- `POST /api/v1/billing/stripe/webhook` (public, signature Stripe vérifiée) :
  `checkout.session.completed` accorde le droit Premium (`platform=stripe`) ;
  `customer.subscription.updated` met à jour le statut et la date d'expiration ;
  `customer.subscription.deleted` révoque le droit. Un remboursement se traite
  manuellement via `DELETE /api/v1/admin/premium/{id}`, comme pour tout achat.
- **État actuel** : `POST /me/premium/checkout` répond `501 stripe_not_configured`
  tant que `STRIPE_SECRET_KEY` et `STRIPE_WEBHOOK_SECRET` sont vides — voir
  `backend/.env.example`.
- **Pas encore de bouton côté site web** : le site n'a aucun compte utilisateur
  (ni connexion, ni inscription) — seul le back-office admin est authentifié.
  L'endpoint est prêt et testé (`backend/tests/test_billing.py`), mais un parcours
  d'achat visible sur le site nécessite d'abord une connexion/inscription web.

Activation (quand un compte Stripe existe) :
1. Créer les produits et prix dans le Dashboard Stripe (mensuel, annuel, à vie).
2. Renseigner `STRIPE_SECRET_KEY`, `STRIPE_PRICE_MONTHLY`, `STRIPE_PRICE_YEARLY`,
   `STRIPE_PRICE_LIFETIME`, `SITE_URL` dans les secrets du déploiement.
3. Créer le endpoint webhook dans le Dashboard Stripe
   (`https://<domaine-api>/api/v1/billing/stripe/webhook`, événements
   `checkout.session.completed`, `customer.subscription.updated`,
   `customer.subscription.deleted`) et renseigner `STRIPE_WEBHOOK_SECRET` avec le
   secret de signature généré.

## Publicité mobile (AdMob)

- Table `ad_placements` : chaque emplacement a un code, un réseau (AdMob), un ID
  d'unité et un plafond par session — **tout est désactivé par défaut** et ne
  s'active que depuis le back-office.
- Bannières discrètes sur écrans secondaires uniquement ; pas d'interstitiels
  intrusifs ; jamais pendant l'onboarding ni sur les écrans de conformité.
- Prérequis avant activation : compte AdMob, CMP de consentement (TCF), mise à jour
  de la politique de confidentialité (régie = sous-traitant).

## Publicité web (prévue, non activée)

Le site web n'a aujourd'hui aucun mécanisme publicitaire — ni compte régie, ni
script, ni emplacement réservé dans les pages. Piste envisagée à l'ouverture du
premier revenu web, dans le respect des mêmes principes non négociables que la
publicité mobile :

- **Régie envisagée** : Google AdSense (display), à défaut d'une régie française
  spécialisée jeu responsable si une option plus adaptée existe au moment de
  l'activation.
- Emplacements discrets uniquement (pied de page, barre latérale sur pages de
  statistiques) — jamais en préroll, jamais en interstitiel, jamais sur
  `/jeu-responsable`, `/confidentialite`, `/mentions-legales` ni `/contact`.
  Plafond par session, comme pour AdMob.
- Personnalisation des annonces uniquement sur consentement explicite (CMP TCF),
  désactivée par défaut — cohérent avec `docs/SEO.md`/`confidentialite`.
- **Prérequis avant toute activation** : compte AdSense approuvé, `ads.txt` publié,
  CMP intégré, section « Publicité » de `/confidentialite` mise à jour pour lister
  la régie comme sous-traitant.
- **État actuel** : aucune variable d'environnement, composant ou script AdSense
  n'existe dans `web/` — à créer uniquement une fois le compte AdSense obtenu, pour
  éviter du code non testable branché sur un identifiant fictif.

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
