# Politique de confidentialité — LotoLab IA

*Version développeur. La version utilisateur est publiée sur le site (`/confidentialite`)
et dans l'application (écran Confidentialité).*

## Principes

1. **Minimisation** : seules les données strictement nécessaires sont collectées.
2. **Aucune donnée sensible** (santé, opinions, biométrie…) n'est collectée, jamais.
3. **Aucune revente** de données ; aucune publicité personnalisée sans consentement
   explicite (désactivé par défaut, `user_preferences.consent_ads`).
4. **Libre-service** : export et suppression accessibles sans contact humain.

## Données traitées

| Donnée | Table | Finalité | Base légale | Durée |
|---|---|---|---|---|
| E-mail | `auth.users` (Supabase) | Compte | Contrat | Vie du compte |
| Nom d'affichage | `profiles` | Personnalisation | Contrat | Vie du compte |
| Grilles, favoris | `saved_grids`, `favorites` | Fonctionnalités | Contrat | Vie du compte |
| Préférences + consentements horodatés | `user_preferences` | Réglages, preuve du consentement | Contrat / consentement | Vie du compte |
| Notifications | `notifications` | Alertes demandées | Consentement | Vie du compte |
| Droits Premium + référence de reçu | `premium_entitlements` | Gestion des achats | Contrat | Vie du compte + obligations comptables |
| Journal d'audit admin | `audit_log` | Traçabilité des actions sensibles | Intérêt légitime | 24 mois |
| Journaux techniques | logs applicatifs | Sécurité | Intérêt légitime | 12 mois |

Les tirages du Loto sont des **données publiques**, sans caractère personnel.

## Droits des personnes (RGPD)

- **Accès / portabilité** : `GET /api/v1/me/export` — export JSON intégral, en
  libre-service dans l'app (Confidentialité → Exporter mes données).
- **Effacement** : `DELETE /api/v1/me` (confirmation « SUPPRIMER ») — supprime le
  compte Supabase Auth et, par cascade SQL, toutes les données liées. Irréversible.
- **Rectification** : préférences et profil modifiables dans l'application.
- **Retrait du consentement** : interrupteurs dédiés (publicité, mesure d'audience),
  horodatés dans `consent_updated_at`.

## Conservation et purge

- Comptes inactifs > 24 mois : notification puis suppression (tâche à planifier
  en production — voir docs/ROADMAP.md).
- Suppression de compte : effet immédiat en base (cascade), sauvegardes purgées au
  cycle de rotation des sauvegardes Supabase.

## Sous-traitants

| Prestataire | Rôle | Localisation |
|---|---|---|
| Supabase | Base de données + auth | eu-west-3 (Paris) |
| Netlify | Hébergement web | UE/US (CDN) |
| Hébergeur API | À déterminer au déploiement | Privilégier l'UE |
| Régie publicitaire (si activée) | Publicité consentie | Selon régie — à documenter avant activation |

## Points à compléter avant la mise en production

- [ ] E-mail de contact RGPD/DPO dans l'app, le site et ce document.
- [ ] Registre des traitements (obligation art. 30).
- [ ] Tâche automatique de purge des comptes inactifs.
- [ ] CMP (consent management) si des SDK publicitaires tiers sont activés.
