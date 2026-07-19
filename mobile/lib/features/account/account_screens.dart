import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../core/config.dart';
import '../../core/disclaimers.dart';
import '../../core/widgets.dart';
import '../../data/providers.dart';
import '../../main.dart';

/// Écran de connexion / inscription (Supabase Auth, e-mail + mot de passe).
class AuthScreen extends ConsumerStatefulWidget {
  const AuthScreen({super.key});

  @override
  ConsumerState<AuthScreen> createState() => _AuthScreenState();
}

class _AuthScreenState extends ConsumerState<AuthScreen> {
  final _email = TextEditingController();
  final _password = TextEditingController();
  bool _signUp = false;
  bool _loading = false;
  String? _message;

  Future<void> _submit() async {
    if (!AppConfig.supabaseConfigured) {
      setState(() => _message =
          'Authentification non configurée dans cette version (SUPABASE_URL absent).');
      return;
    }
    setState(() {
      _loading = true;
      _message = null;
    });
    try {
      final auth = Supabase.instance.client.auth;
      if (_signUp) {
        await auth.signUp(email: _email.text.trim(), password: _password.text);
        setState(() => _message = 'Compte créé. Vérifiez votre boîte mail pour confirmer.');
      } else {
        await auth.signInWithPassword(email: _email.text.trim(), password: _password.text);
        if (mounted) context.go('/profile');
      }
    } on AuthException catch (error) {
      setState(() => _message = error.message);
    } finally {
      setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(_signUp ? 'Créer un compte' : 'Connexion')),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          TextField(
            controller: _email,
            keyboardType: TextInputType.emailAddress,
            decoration: const InputDecoration(labelText: 'E-mail'),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _password,
            obscureText: true,
            decoration: const InputDecoration(labelText: 'Mot de passe'),
          ),
          const SizedBox(height: 16),
          FilledButton(
            onPressed: _loading ? null : _submit,
            child: Text(_signUp ? 'Créer mon compte' : 'Se connecter'),
          ),
          TextButton(
            onPressed: () => setState(() => _signUp = !_signUp),
            child: Text(_signUp ? 'J\'ai déjà un compte' : 'Créer un compte'),
          ),
          if (_message != null)
            Padding(padding: const EdgeInsets.only(top: 12), child: Text(_message!)),
          const SizedBox(height: 16),
          const WarningBanner(text: Disclaimers.ageRestriction),
        ],
      ),
    );
  }
}

/// Écran « profil ».
class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final signedIn = ref.watch(isSignedInProvider);
    final profile = signedIn ? ref.watch(myProfileProvider) : null;

    return Scaffold(
      appBar: AppBar(title: const Text('Profil')),
      body: ListView(
        padding: const EdgeInsets.all(12),
        children: [
          if (!signedIn)
            SectionCard(
              title: 'Compte',
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                      'Créez un compte gratuit pour enregistrer vos grilles, favoris et préférences, '
                      'et les synchroniser entre vos appareils.'),
                  const SizedBox(height: 10),
                  FilledButton(
                    onPressed: () => context.go('/auth'),
                    child: const Text('Connexion / inscription'),
                  ),
                ],
              ),
            )
          else
            SectionCard(
              title: 'Compte',
              child: profile!.when(
                loading: () => const LinearProgressIndicator(),
                error: (error, _) => Text('$error'),
                data: (data) => Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(data['email'] ?? ''),
                    Text(
                      (data['is_premium'] as bool? ?? false)
                          ? 'Offre Premium active'
                          : 'Offre gratuite',
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                    const SizedBox(height: 8),
                    OutlinedButton(
                      onPressed: () async {
                        if (AppConfig.supabaseConfigured) {
                          await Supabase.instance.client.auth.signOut();
                        }
                      },
                      child: const Text('Se déconnecter'),
                    ),
                  ],
                ),
              ),
            ),
          const SizedBox(height: 12),
          Card(
            child: Column(
              children: [
                _link(context, Icons.grid_on, 'Mes grilles', '/grids'),
                _link(context, Icons.star_border, 'Favoris', '/favorites'),
                _link(context, Icons.notifications_none, 'Notifications', '/notifications'),
                _link(context, Icons.tune, 'Préférences', '/preferences'),
                _link(context, Icons.workspace_premium, 'Premium', '/premium'),
              ],
            ),
          ),
          const SizedBox(height: 12),
          Card(
            child: Column(
              children: [
                _link(context, Icons.favorite_border, 'Jeu responsable', '/responsible-gaming'),
                _link(context, Icons.privacy_tip_outlined, 'Confidentialité et données', '/privacy'),
                _link(context, Icons.delete_outline, 'Supprimer mon compte', '/delete-account'),
              ],
            ),
          ),
          const SizedBox(height: 12),
          Text(Disclaimers.independence, style: Theme.of(context).textTheme.bodySmall),
        ],
      ),
    );
  }

  Widget _link(BuildContext context, IconData icon, String label, String route) => ListTile(
        leading: Icon(icon),
        title: Text(label),
        trailing: const Icon(Icons.chevron_right),
        onTap: () => context.go(route),
      );
}

/// Écran « mes grilles ».
class MyGridsScreen extends ConsumerWidget {
  const MyGridsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final signedIn = ref.watch(isSignedInProvider);
    if (!signedIn) return const _SignInRequired(title: 'Mes grilles');
    final grids = ref.watch(myGridsProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('Mes grilles')),
      body: grids.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) =>
            ErrorRetryView(message: '$error', onRetry: () => ref.invalidate(myGridsProvider)),
        data: (items) => items.isEmpty
            ? const EmptyView(
                message: 'Aucune grille enregistrée.\n'
                    'Générez une grille puis touchez l\'icône « enregistrer ».')
            : ListView(
                padding: const EdgeInsets.all(12),
                children: [
                  for (final grid in items)
                    Card(
                      child: ListTile(
                        title: Wrap(
                          spacing: 5,
                          children: [
                            for (final number in grid.numbers)
                              NumberBall(number: number, size: 30),
                            NumberBall(number: grid.chance, isChance: true, size: 30),
                          ],
                        ),
                        subtitle: Text(grid.name ?? grid.method),
                        trailing: IconButton(
                          icon: const Icon(Icons.delete_outline),
                          onPressed: () async {
                            final api = ref.read(apiClientProvider);
                            await api.delete('/api/v1/me/grids/${grid.id}');
                            ref.invalidate(myGridsProvider);
                          },
                        ),
                      ),
                    ),
                  const SizedBox(height: 8),
                  const WarningBanner(),
                ],
              ),
      ),
    );
  }
}

/// Écran « favoris » (numéros suivis).
class FavoritesScreen extends ConsumerWidget {
  const FavoritesScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final signedIn = ref.watch(isSignedInProvider);
    if (!signedIn) return const _SignInRequired(title: 'Favoris');
    final favorites = ref.watch(myFavoritesProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('Numéros favoris')),
      body: favorites.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) =>
            ErrorRetryView(message: '$error', onRetry: () => ref.invalidate(myFavoritesProvider)),
        data: (items) {
          final favoriteNumbers =
              items.where((item) => item['is_chance'] != true).map((item) => item['number'] as int).toSet();
          return ListView(
            padding: const EdgeInsets.all(12),
            children: [
              SectionCard(
                title: 'Touchez un numéro pour le suivre',
                child: Wrap(
                  spacing: 6,
                  runSpacing: 6,
                  children: [
                    for (var number = 1; number <= 49; number++)
                      GestureDetector(
                        onTap: () async {
                          final api = ref.read(apiClientProvider);
                          if (favoriteNumbers.contains(number)) {
                            await api.delete('/api/v1/me/favorites',
                                body: {'number': number, 'is_chance': false});
                          } else {
                            await api.postJson('/api/v1/me/favorites',
                                {'number': number, 'is_chance': false});
                          }
                          ref.invalidate(myFavoritesProvider);
                        },
                        child: Container(
                          width: 34,
                          height: 34,
                          alignment: Alignment.center,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: favoriteNumbers.contains(number)
                                ? Theme.of(context).colorScheme.tertiary
                                : Theme.of(context).colorScheme.surfaceContainerHighest,
                          ),
                          child: Text(
                            '$number',
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                              color: favoriteNumbers.contains(number) ? Colors.white : null,
                            ),
                          ),
                        ),
                      ),
                  ],
                ),
              ),
              const SizedBox(height: 12),
              if (favoriteNumbers.isNotEmpty)
                SectionCard(
                  title: 'Profils de vos favoris',
                  child: Column(
                    children: [
                      for (final number in favoriteNumbers)
                        _FavoriteProfileTile(number: number),
                    ],
                  ),
                ),
            ],
          );
        },
      ),
    );
  }
}

class _FavoriteProfileTile extends ConsumerWidget {
  final int number;
  const _FavoriteProfileTile({required this.number});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final profile = ref.watch(numberProfileProvider(number));
    return profile.maybeWhen(
      data: (data) => ListTile(
        dense: true,
        contentPadding: EdgeInsets.zero,
        leading: NumberBall(number: number, size: 32),
        title: Text('${data['appearances']} sorties'),
        trailing: Text('retard : ${data['current_delay'] ?? '—'}'),
      ),
      orElse: () => const SizedBox.shrink(),
    );
  }
}

/// Écran « notifications ».
class NotificationsScreen extends ConsumerWidget {
  const NotificationsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final signedIn = ref.watch(isSignedInProvider);
    if (!signedIn) return const _SignInRequired(title: 'Notifications');
    final notifications = ref.watch(myNotificationsProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('Notifications')),
      body: notifications.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => ErrorRetryView(
            message: '$error', onRetry: () => ref.invalidate(myNotificationsProvider)),
        data: (items) => items.isEmpty
            ? const EmptyView(
                message: 'Aucune notification.\n'
                    'Activez les alertes de nouveaux tirages dans les préférences.')
            : ListView(
                padding: const EdgeInsets.all(12),
                children: [
                  for (final notification in items)
                    Card(
                      child: ListTile(
                        leading: Icon(
                          notification.read
                              ? Icons.drafts_outlined
                              : Icons.mark_email_unread_outlined,
                        ),
                        title: Text(notification.title),
                        subtitle: Text(notification.body),
                        onTap: notification.read
                            ? null
                            : () async {
                                final api = ref.read(apiClientProvider);
                                await api.postJson(
                                    '/api/v1/me/notifications/${notification.id}/read', {});
                                ref.invalidate(myNotificationsProvider);
                              },
                      ),
                    ),
                ],
              ),
      ),
    );
  }
}

/// Écran « préférences » : thème, notifications, consentements.
class PreferencesScreen extends ConsumerWidget {
  const PreferencesScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final signedIn = ref.watch(isSignedInProvider);
    final themeMode = ref.watch(themeModeProvider);

    Future<void> save(Map<String, dynamic> patch) async {
      if (!signedIn) return;
      final api = ref.read(apiClientProvider);
      await api.putJson('/api/v1/me/preferences', patch);
      ref.invalidate(myPreferencesProvider);
    }

    final prefs = signedIn ? ref.watch(myPreferencesProvider) : null;
    final data = prefs?.valueOrNull ?? {};

    return Scaffold(
      appBar: AppBar(title: const Text('Préférences')),
      body: ListView(
        padding: const EdgeInsets.all(12),
        children: [
          SectionCard(
            title: 'Apparence',
            child: RadioGroup<ThemeMode>(
              groupValue: themeMode,
              onChanged: (mode) {
                if (mode == null) return;
                ref.read(themeModeProvider.notifier).state = mode;
                save({'theme': mode.name});
              },
              child: const Column(
                children: [
                  RadioListTile<ThemeMode>(
                    title: Text('Système'),
                    value: ThemeMode.system,
                  ),
                  RadioListTile<ThemeMode>(
                    title: Text('Clair'),
                    value: ThemeMode.light,
                  ),
                  RadioListTile<ThemeMode>(
                    title: Text('Sombre'),
                    value: ThemeMode.dark,
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 12),
          SectionCard(
            title: 'Notifications',
            child: Column(
              children: [
                SwitchListTile(
                  title: const Text('Activer les notifications'),
                  subtitle: const Text('Limitées à 3 par semaine par défaut (jeu responsable).'),
                  value: (data['notifications_enabled'] as bool?) ?? false,
                  onChanged: signedIn
                      ? (value) => save({'notifications_enabled': value})
                      : null,
                ),
                SwitchListTile(
                  title: const Text('Alerte nouveau tirage'),
                  value: (data['notify_new_draw'] as bool?) ?? false,
                  onChanged:
                      signedIn ? (value) => save({'notify_new_draw': value}) : null,
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),
          SectionCard(
            title: 'Consentements (RGPD)',
            child: Column(
              children: [
                SwitchListTile(
                  title: const Text('Publicités personnalisées'),
                  value: (data['consent_ads'] as bool?) ?? false,
                  onChanged: signedIn ? (value) => save({'consent_ads': value}) : null,
                ),
                SwitchListTile(
                  title: const Text('Mesure d\'audience anonyme'),
                  value: (data['consent_analytics'] as bool?) ?? false,
                  onChanged:
                      signedIn ? (value) => save({'consent_analytics': value}) : null,
                ),
              ],
            ),
          ),
          if (!signedIn)
            const Padding(
              padding: EdgeInsets.all(12),
              child: Text(
                  'Connectez-vous pour synchroniser vos préférences entre appareils.'),
            ),
        ],
      ),
    );
  }
}

class _SignInRequired extends StatelessWidget {
  final String title;
  const _SignInRequired({required this.title});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(title)),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.lock_outline, size: 42),
              const SizedBox(height: 12),
              const Text('Cette section nécessite un compte gratuit.',
                  textAlign: TextAlign.center),
              const SizedBox(height: 16),
              FilledButton(
                onPressed: () => context.go('/auth'),
                child: const Text('Connexion / inscription'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
