import 'package:supabase_flutter/supabase_flutter.dart';

import 'models.dart';

/// Lecture directe des tirages dans Supabase (clé publique `anon`, RLS en
/// lecture seule publique sur `draws`) quand l'API n'est pas joignable —
/// équivalent de `web/src/lib/supabasePublic.ts`. Uniquement des SELECT.
class SupabaseDrawsSource {
  SupabaseDrawsSource(this._client);

  final SupabaseClient _client;

  static const _columns = 'id, draw_date, numbers, chance, source';
  static const _pageSize = 1000; // limite par défaut de PostgREST

  Future<Draw> latestDraw() async {
    final row = await _client
        .from('draws')
        .select(_columns)
        .order('draw_date', ascending: false)
        .limit(1)
        .maybeSingle();
    if (row == null) throw const ApiException('Aucun tirage disponible pour le moment.');
    return Draw.fromJson(row);
  }

  Future<DrawPage> drawsPage(int page, int pageSize) async {
    final from = (page - 1) * pageSize;
    final response = await _client
        .from('draws')
        .select(_columns)
        .order('draw_date', ascending: false)
        .range(from, from + pageSize - 1)
        .count(CountOption.exact);
    return DrawPage(
      items: response.data.map(Draw.fromJson).toList(),
      total: response.count,
      truncated: false,
    );
  }

  Future<Draw> drawByDate(String date) async {
    final row = await _client.from('draws').select(_columns).eq('draw_date', date).maybeSingle();
    if (row == null) throw const ApiException('Tirage introuvable.', statusCode: 404);
    return Draw.fromJson(row);
  }

  /// Tous les tirages, triés par date croissante (ordre attendu par les
  /// calculs de `stats_fallback.dart`).
  Future<List<Draw>> allDraws() async {
    final all = <Draw>[];
    for (var from = 0;; from += _pageSize) {
      final rows = await _client
          .from('draws')
          .select(_columns)
          .order('draw_date', ascending: true)
          .range(from, from + _pageSize - 1);
      all.addAll(rows.map(Draw.fromJson));
      if (rows.length < _pageSize) break;
    }
    return all;
  }
}
