import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/widgets.dart';
import '../../data/providers.dart';

/// Paywall Premium.
///
/// Les achats intégrés (Google Play Billing / App Store) sont volontairement
/// derrière un drapeau de compilation : tant que les produits ne sont pas
/// créés dans les consoles des stores, l'écran présente l'offre sans bouton
/// d'achat actif. Voir docs/MONETISATION.md pour l'activation
/// (package in_app_purchase + PURCHASES_ENABLED=true).
class PremiumScreen extends ConsumerWidget {
  const PremiumScreen({super.key});

  static const purchasesEnabled = bool.fromEnvironment('PURCHASES_ENABLED');

  static const _features = [
    ('Suppression des publicités', Icons.block),
    ('Historique complet des tirages', Icons.history),
    ('Statistiques avancées : triplets, comparaisons de périodes', Icons.insights),
    ('Exports PDF et CSV illimités', Icons.file_download),
    ('Simulations Monte-Carlo étendues (250 000 itérations)', Icons.science),
    ('Génération multiple (jusqu\'à 20 grilles)', Icons.grid_view),
    ('Filtres et exclusions personnalisés', Icons.tune),
    ('Grilles enregistrées illimitées', Icons.bookmark),
    ('Alertes personnalisées', Icons.notifications_active),
  ];

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final signedIn = ref.watch(isSignedInProvider);
    final profile = signedIn ? ref.watch(myProfileProvider) : null;
    final isPremium = profile?.valueOrNull?['is_premium'] as bool? ?? false;

    return Scaffold(
      appBar: AppBar(title: const Text('LotoLab IA Premium')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          if (isPremium)
            const SectionCard(
              title: 'Premium actif',
              child: Text('Merci ! Vous profitez de toutes les fonctionnalités avancées.'),
            )
          else ...[
            SectionCard(
              title: 'Passez au laboratoire complet',
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  for (final feature in _features)
                    Padding(
                      padding: const EdgeInsets.symmetric(vertical: 4),
                      child: Row(
                        children: [
                          Icon(feature.$2, size: 18,
                              color: Theme.of(context).colorScheme.primary),
                          const SizedBox(width: 10),
                          Expanded(child: Text(feature.$1)),
                        ],
                      ),
                    ),
                ],
              ),
            ),
            const SizedBox(height: 12),
            SectionCard(
              title: 'Formules prévues',
              child: Column(
                children: [
                  _plan(context, 'Mensuel', 'Sans engagement, résiliable à tout moment'),
                  _plan(context, 'Annuel', 'Deux mois offerts par rapport au mensuel'),
                  _plan(context, 'À vie', 'Paiement unique, accès définitif'),
                ],
              ),
            ),
            const SizedBox(height: 16),
            if (purchasesEnabled)
              FilledButton(
                onPressed: () {
                  // Point d'intégration in_app_purchase : voir docs/MONETISATION.md.
                  ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
                      content: Text('Boutique en cours d\'activation.')));
                },
                child: const Text('Voir les offres'),
              )
            else
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(14),
                  child: Column(
                    children: [
                      const Text(
                        'Les achats intégrés seront disponibles au lancement sur les stores. '
                        'Cette version bêta présente l\'offre sans paiement.',
                        textAlign: TextAlign.center,
                      ),
                      if (!signedIn)
                        TextButton(
                          onPressed: () => context.go('/auth'),
                          child: const Text('Créer un compte pour être prévenu'),
                        ),
                    ],
                  ),
                ),
              ),
            const SizedBox(height: 8),
            TextButton(
              onPressed: () {
                // Restauration des achats : branchée sur in_app_purchase à l'activation.
                ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
                    content: Text('Aucun achat à restaurer dans cette version.')));
              },
              child: const Text('Restaurer mes achats'),
            ),
          ],
          const SizedBox(height: 12),
          const WarningBanner(),
        ],
      ),
    );
  }

  Widget _plan(BuildContext context, String name, String description) => ListTile(
        contentPadding: EdgeInsets.zero,
        leading: const Icon(Icons.workspace_premium),
        title: Text(name),
        subtitle: Text(description),
      );
}
