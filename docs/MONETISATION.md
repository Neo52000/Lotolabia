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

### Web (Stripe) — implémenté sur le site, activé dès que les clés sont renseignées

Le paiement tourne dans le **site Next.js** (route handlers exécutés en fonctions
Netlify), sans API hébergée ; l'API Python garde son implémentation équivalente
(`backend/app/api/v1/users.py`, `billing.py`) pour le jour où elle sera déployée.

- `POST /api/premium/checkout` (jeton Supabase requis) : crée une session Stripe
  Checkout d'abonnement (`monthly` 4,99 € / `yearly` 39,96 €), liée au compte
  (`client_reference_id`, `metadata.user_id`). Refusé sans le consentement CGV +
  renonciation au droit de rétractation (case à cocher sur `/premium`, horodatage
  conservé dans la session Stripe), et si le compte est déjà Premium. **Aucun droit
  n'est accordé à la création de la session.**
- `POST /api/stripe/webhook` (public, signature Stripe vérifiée) :
  `checkout.session.completed` / `checkout.session.async_payment_succeeded` accordent
  le droit (`platform=stripe`, idempotent sur `receipt_ref`) ;
  `customer.subscription.updated` met à jour statut et échéance ;
  `customer.subscription.deleted` révoque. Écriture via la clé service role (seule
  autorisée par la RLS).
- `POST /api/premium/portal` : portail client Stripe (gestion, résiliation en ligne).
- Paliers appliqués sur le site (`web/src/lib/premium.ts`, port de `premium.py`) :
  méthodes du générateur, nombre de grilles, itérations Monte-Carlo. Le statut est lu
  par l'utilisateur dans `premium_entitlements` (RLS : ses lignes seulement). Les
  calculs se faisant dans le navigateur, ce contrôle est côté client : suffisant pour
  des données publiques, à renforcer côté serveur si l'API est déployée.
- Pages : `/premium` (offre, achat, gestion), `/premium/succes`, `/cgv`.
- **Mobile** : pas d'achat Stripe dans l'appli (règles Google Play pour les contenus
  numériques) ; affichage du statut Premium et paliers mobiles à faire ensuite.

Activation (mode test d'abord, puis mode réel) :
1. Dashboard Stripe : créer le produit « LotoLab IA Premium » avec deux prix
   récurrents (4,99 €/mois, 39,96 €/an) ; activer le portail client (Paramètres →
   Facturation → Portail client) ; activer les e-mails de reçu et de rappel de
   renouvellement (obligatoire pour l'offre annuelle).
2. Créer le endpoint webhook `https://<site>/api/stripe/webhook` avec les événements
   `checkout.session.completed`, `checkout.session.async_payment_succeeded`,
   `customer.subscription.updated`, `customer.subscription.deleted`.
3. Variables d'environnement du site sur Netlify (serveur uniquement, jamais
   `NEXT_PUBLIC_`) : `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`,
   `STRIPE_PRICE_MONTHLY`, `STRIPE_PRICE_YEARLY`, `SUPABASE_SERVICE_ROLE_KEY`,
   `SITE_URL`, puis redéployer.
4. Avant le mode réel : compléter l'adresse de l'éditeur et le médiateur de la
   consommation dans `/cgv` et `/mentions-legales`.

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
