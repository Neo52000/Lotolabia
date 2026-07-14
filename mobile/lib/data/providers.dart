import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../core/api_client.dart';
import '../core/config.dart';
import 'models.dart';

final apiClientProvider = Provider<ApiClient>((ref) => ApiClient());

/// Session Supabase (null si non connecté ou Supabase non configuré).
final authStateProvider = StreamProvider<Session?>((ref) {
  if (!AppConfig.supabaseConfigured) return Stream.value(null);
  return Supabase.instance.client.auth.onAuthStateChange.map((event) => event.session);
});

final isSignedInProvider = Provider<bool>((ref) {
  final auth = ref.watch(authStateProvider);
  return auth.valueOrNull != null;
});

/// Fenêtre d'analyse sélectionnée (nombre de derniers tirages ; null = tout).
final analysisWindowProvider = StateProvider<int?>((ref) => null);

// ---------------------------------------------------------------- tirages
final latestDrawProvider = FutureProvider<Draw>((ref) async {
  final api = ref.watch(apiClientProvider);
  return Draw.fromJson(await api.getJson('/api/v1/draws/latest'));
});

final drawsPageProvider =
    FutureProvider.family<DrawPage, int>((ref, page) async {
  final api = ref.watch(apiClientProvider);
  return DrawPage.fromJson(
    await api.getJson('/api/v1/draws', query: {'page': page, 'page_size': 20}),
  );
});

final drawDetailProvider = FutureProvider.family<Draw, String>((ref, date) async {
  final api = ref.watch(apiClientProvider);
  return Draw.fromJson(await api.getJson('/api/v1/draws/$date'));
});

// ---------------------------------------------------------------- statistiques
Map<String, dynamic> _windowQuery(int? window) =>
    window == null ? {} : {'window': window};

final overviewProvider = FutureProvider<Map<String, dynamic>>((ref) async {
  final api = ref.watch(apiClientProvider);
  final window = ref.watch(analysisWindowProvider);
  return api.getJson('/api/v1/stats/overview', query: _windowQuery(window));
});

final frequenciesProvider = FutureProvider<StatsResult>((ref) async {
  final api = ref.watch(apiClientProvider);
  final window = ref.watch(analysisWindowProvider);
  return StatsResult.fromJson(
    await api.getJson('/api/v1/stats/frequencies', query: _windowQuery(window)),
  );
});

final delaysProvider = FutureProvider<StatsResult>((ref) async {
  final api = ref.watch(apiClientProvider);
  final window = ref.watch(analysisWindowProvider);
  return StatsResult.fromJson(
    await api.getJson('/api/v1/stats/delays', query: _windowQuery(window)),
  );
});

final shapesProvider = FutureProvider<Map<String, dynamic>>((ref) async {
  final api = ref.watch(apiClientProvider);
  final window = ref.watch(analysisWindowProvider);
  return api.getJson('/api/v1/stats/shapes', query: _windowQuery(window));
});

final pairsProvider = FutureProvider<Map<String, dynamic>>((ref) async {
  final api = ref.watch(apiClientProvider);
  final window = ref.watch(analysisWindowProvider);
  return api.getJson('/api/v1/stats/pairs', query: _windowQuery(window));
});

final tripletsProvider = FutureProvider<Map<String, dynamic>>((ref) async {
  final api = ref.watch(apiClientProvider);
  final window = ref.watch(analysisWindowProvider);
  return api.getJson('/api/v1/stats/triplets', query: _windowQuery(window));
});

final numberProfileProvider =
    FutureProvider.family<Map<String, dynamic>, int>((ref, number) async {
  final api = ref.watch(apiClientProvider);
  return api.getJson('/api/v1/stats/numbers/$number');
});

// ---------------------------------------------------------------- compte
final myProfileProvider = FutureProvider<Map<String, dynamic>>((ref) async {
  final api = ref.watch(apiClientProvider);
  ref.watch(authStateProvider);
  return api.getJson('/api/v1/me', cacheable: false);
});

final myGridsProvider = FutureProvider<List<SavedGrid>>((ref) async {
  final api = ref.watch(apiClientProvider);
  final rows = await api.getJsonList('/api/v1/me/grids');
  return rows.map((row) => SavedGrid.fromJson(row as Map<String, dynamic>)).toList();
});

final myFavoritesProvider = FutureProvider<List<Map<String, dynamic>>>((ref) async {
  final api = ref.watch(apiClientProvider);
  final rows = await api.getJsonList('/api/v1/me/favorites');
  return rows.cast<Map<String, dynamic>>();
});

final myNotificationsProvider = FutureProvider<List<AppNotification>>((ref) async {
  final api = ref.watch(apiClientProvider);
  final rows = await api.getJsonList('/api/v1/me/notifications');
  return rows.map((row) => AppNotification.fromJson(row as Map<String, dynamic>)).toList();
});

final myPreferencesProvider = FutureProvider<Map<String, dynamic>>((ref) async {
  final api = ref.watch(apiClientProvider);
  return api.getJson('/api/v1/me/preferences', cacheable: false);
});
