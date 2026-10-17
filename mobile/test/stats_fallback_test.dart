import 'package:flutter_test/flutter_test.dart';
import 'package:lotolab_ia/data/models.dart';
import 'package:lotolab_ia/data/stats_fallback.dart';

const _disclaimer = 'avertissement de test';

// Mêmes fixtures que backend/tests/test_stats.py et web/src/lib/statsFallback.test.ts
// (résultats vérifiés à la main) : le repli mobile doit reproduire le moteur Python.
const _draws = [
  Draw(id: 1, drawDate: '2020-01-04', numbers: [1, 2, 3, 4, 5], chance: 1, source: 'test'),
  Draw(id: 2, drawDate: '2020-01-06', numbers: [1, 6, 7, 8, 9], chance: 2, source: 'test'),
  Draw(id: 3, drawDate: '2020-01-08', numbers: [1, 2, 10, 20, 30], chance: 1, source: 'test'),
  Draw(id: 4, drawDate: '2020-01-11', numbers: [40, 41, 45, 47, 49], chance: 5, source: 'test'),
];

Map<String, dynamic> _find(List items, int number) =>
    (items.cast<Map<String, dynamic>>()).firstWhere((item) => item['number'] == number);

void main() {
  test('computeFrequencies reproduit les fréquences du moteur Python', () {
    final result = computeFrequencies(_draws, _disclaimer);
    expect(_find(result['numbers'] as List, 1)['count'], 3);
    expect(_find(result['numbers'] as List, 1)['relative'], 0.75);
    expect(_find(result['chance'] as List, 1)['count'], 2);
    expect(result['disclaimer'], _disclaimer);
    expect(result['draw_count'], 4);
    expect(result['period_start'], '2020-01-04');
    expect(result['period_end'], '2020-01-11');
    // Lisible tel quel par le modèle utilisé pour les réponses de l'API.
    expect(StatsResult.fromJson(result).numbers, hasLength(49));
  });

  test('computeDelays reproduit les retards du moteur Python', () {
    final numbers = computeDelays(_draws, _disclaimer)['numbers'] as List;
    expect(_find(numbers, 40)['delay'], 0);
    expect(_find(numbers, 1)['delay'], 1);
    expect(_find(numbers, 5)['delay'], 3);
    expect(_find(numbers, 13)['delay'], isNull);
  });

  test('computeOverview donne les plus fréquents et les plus en retard', () {
    final result = computeOverview(_draws, _disclaimer);
    final most = result['most_frequent'] as List;
    expect(most.first['number'], 1);
    expect(most.first['count'], 3);
    expect(result['longest_delays'] as List, isNotEmpty);
  });

  test('computeOverview gère un historique vide sans planter', () {
    final result = computeOverview(const [], _disclaimer);
    expect(result['least_frequent'], isEmpty);
    expect(result['draw_count'], 0);
  });

  test('applyWindow garde les N derniers tirages', () {
    expect(applyWindow(_draws, 2).map((d) => d.id), [3, 4]);
    expect(applyWindow(_draws, null), _draws);
    expect(applyWindow(_draws, 10), _draws);
  });

  group('computeNumberProfile', () {
    test('numéro principal', () {
      final profile = computeNumberProfile(_draws, 1, isChance: false, disclaimer: _disclaimer);
      expect(profile['appearances'], 3);
      expect(profile['current_delay'], 1);
      expect((profile['top_companions'] as List).first['number'], 2);
    });

    test('numéro Chance', () {
      final profile = computeNumberProfile(_draws, 1, isChance: true, disclaimer: _disclaimer);
      expect(profile['appearances'], 2);
      expect(profile.containsKey('top_companions'), isFalse);
    });

    test('numéro hors plage', () {
      expect(
        () => computeNumberProfile(_draws, 50, isChance: false, disclaimer: _disclaimer),
        throwsA(isA<ApiException>()),
      );
    });

    test('numéro jamais sorti', () {
      final profile = computeNumberProfile(_draws, 13, isChance: false, disclaimer: _disclaimer);
      expect(profile['appearances'], 0);
      expect(profile['current_delay'], isNull);
      expect(profile['gap_mean'], isNull);
    });
  });
}
