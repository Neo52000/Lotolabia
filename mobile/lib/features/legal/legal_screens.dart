import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../core/config.dart';
import '../../core/disclaimers.dart';
import '../../core/widgets.dart';
import '../../data/providers.dart';

/// Écran « jeu responsable ».
class ResponsibleGamingScreen extends StatelessWidget {
  const ResponsibleGamingScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Jeu responsable')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: const [
          SectionCard(
            title: 'L\'essentiel',
            child: Text(
              'Le Loto est un jeu de hasard : chaque combinaison a exactement la même '
              'probabilité de sortir à chaque tirage, quels que soient les résultats passés.\n\n'
              'LotoLab IA est un outil pédagogique d\'analyse descriptive. Il ne fournit '
              'aucune prédiction et n\'augmente pas vos chances de gagner.',
            ),
          ),
          SizedBox(height: 12),
          SectionCard(
            title: 'Restriction d\'âge',
            child: Text(
              'Les jeux d\'argent sont interdits aux personnes de moins de 18 ans.',
            ),
          ),
          SizedBox(height: 12),
          SectionCard(
            title: 'Garder le contrôle',
            child: Text(
              '• Fixez-vous un budget de jeu et ne le dépassez jamais.\n'
              '• Ne jouez pas pour « vous refaire » après une perte.\n'
              '• Le jeu ne doit jamais être une source de revenus.\n'
              '• Les notifications de l\'application sont limitées et désactivables '
              'dans les préférences.\n\n'
              'Besoin d\'aide ? Joueurs Info Service : 09 74 75 13 13 (appel non surtaxé), '
              'www.joueurs-info-service.fr',
            ),
          ),
          SizedBox(height: 12),
          WarningBanner(text: Disclaimers.independence),
        ],
      ),
    );
  }
}

/// Écran « confidentialité et données » (RGPD).
class PrivacyScreen extends ConsumerWidget {
  const PrivacyScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final signedIn = ref.watch(isSignedInProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('Confidentialité')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          const SectionCard(
            title: 'Vos données',
            child: Text(
              'LotoLab IA collecte le strict minimum : votre e-mail (compte), vos grilles '
              'et préférences. Aucune donnée sensible, aucune revente, aucune publicité '
              'sans votre consentement explicite.\n\n'
              'Conservation : les comptes inactifs plus de 24 mois sont supprimés après '
              'notification. La politique complète est disponible sur le site web '
              '(page Confidentialité).',
            ),
          ),
          const SizedBox(height: 12),
          SectionCard(
            title: 'Vos droits (RGPD)',
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  '• Accès et portabilité : exportez toutes vos données en JSON.\n'
                  '• Rectification : modifiez vos préférences à tout moment.\n'
                  '• Effacement : supprimez définitivement votre compte.',
                ),
                const SizedBox(height: 10),
                if (signedIn)
                  Wrap(
                    spacing: 8,
                    children: [
                      OutlinedButton.icon(
                        icon: const Icon(Icons.download),
                        label: const Text('Exporter mes données'),
                        onPressed: () async {
                          final api = ref.read(apiClientProvider);
                          final data =
                              await api.getJson('/api/v1/me/export', cacheable: false);
                          if (context.mounted) {
                            showDialog<void>(
                              context: context,
                              builder: (context) => AlertDialog(
                                title: const Text('Export de vos données'),
                                content: SingleChildScrollView(child: Text('$data')),
                                actions: [
                                  TextButton(
                                    onPressed: () => Navigator.pop(context),
                                    child: const Text('Fermer'),
                                  ),
                                ],
                              ),
                            );
                          }
                        },
                      ),
                      OutlinedButton.icon(
                        icon: const Icon(Icons.delete_forever),
                        label: const Text('Supprimer mon compte'),
                        onPressed: () => context.go('/delete-account'),
                      ),
                    ],
                  )
                else
                  const Text('Connectez-vous pour exercer ces droits depuis l\'application.'),
              ],
            ),
          ),
          const SizedBox(height: 12),
          const WarningBanner(text: Disclaimers.independence),
        ],
      ),
    );
  }
}

/// Écran « suppression de compte » avec double confirmation.
class DeleteAccountScreen extends ConsumerStatefulWidget {
  const DeleteAccountScreen({super.key});

  @override
  ConsumerState<DeleteAccountScreen> createState() => _DeleteAccountScreenState();
}

class _DeleteAccountScreenState extends ConsumerState<DeleteAccountScreen> {
  final _confirmController = TextEditingController();
  bool _loading = false;
  String? _error;

  Future<void> _delete() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final api = ref.read(apiClientProvider);
      await api.delete('/api/v1/me', body: {'confirm': _confirmController.text.trim()});
      if (AppConfig.supabaseConfigured) {
        await Supabase.instance.client.auth.signOut();
      }
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Compte supprimé définitivement.')));
        context.go('/');
      }
    } on Exception catch (error) {
      setState(() => _error = '$error');
    } finally {
      setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final signedIn = ref.watch(isSignedInProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('Supprimer mon compte')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          const SectionCard(
            title: 'Action irréversible',
            child: Text(
              'La suppression efface définitivement :\n'
              '• votre compte et votre profil ;\n'
              '• vos grilles enregistrées et favoris ;\n'
              '• vos préférences et notifications ;\n'
              '• vos droits Premium éventuels.\n\n'
              'Aucune restauration ne sera possible.',
            ),
          ),
          const SizedBox(height: 16),
          if (!signedIn)
            const Text('Vous devez être connecté pour supprimer votre compte.')
          else ...[
            TextField(
              controller: _confirmController,
              decoration: const InputDecoration(
                labelText: 'Tapez SUPPRIMER pour confirmer',
                border: OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 12),
            FilledButton.tonal(
              style: FilledButton.styleFrom(
                backgroundColor: Theme.of(context).colorScheme.errorContainer,
                foregroundColor: Theme.of(context).colorScheme.onErrorContainer,
              ),
              onPressed: _loading ? null : _delete,
              child: const Text('Supprimer définitivement mon compte'),
            ),
            if (_error != null)
              Padding(padding: const EdgeInsets.only(top: 10), child: Text(_error!)),
          ],
        ],
      ),
    );
  }
}
