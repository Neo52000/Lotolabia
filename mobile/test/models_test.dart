import 'package:flutter_test/flutter_test.dart';
import 'package:lotolab_ia/data/models.dart';

// Données fictives de test — jamais des résultats officiels.
void main() {
  group('Draw', () {
    test('désérialise une réponse API', () {
      final draw = Draw.fromJson({
        'id': 1,
        'draw_date': '2020-01-04',
        'numbers': [3, 12, 24, 37, 48],
        'chance': 6,
        'source': 'test_fixture',
      });
      expect(draw.numbers, hasLength(5));
      expect(draw.chance, 6);
      expect(draw.drawDate, '2020-01-04');
    });
  });

  group('DrawPage', () {
    test('gère le drapeau truncated absent', () {
      final page = DrawPage.fromJson({'items': [], 'total': 0, 'page': 1, 'page_size': 20});
      expect(page.truncated, isFalse);
    });
  });

  group('StatsResult', () {
    test('désérialise fréquences et disclaimer', () {
      final stats = StatsResult.fromJson({
        'draw_count': 10,
        'explanation': 'Explication.',
        'disclaimer': 'Avertissement.',
        'numbers': [
          {'number': 1, 'count': 3, 'relative': 0.3},
        ],
        'chance': [
          {'number': 1, 'count': 2, 'relative': 0.2},
        ],
      });
      expect(stats.drawCount, 10);
      expect(stats.numbers.single.count, 3);
      expect(stats.disclaimer, isNotEmpty);
    });

    test('tolère les retards null (numéro jamais sorti)', () {
      final stat = NumberStat.fromJson({'number': 13, 'delay': null});
      expect(stat.delay, isNull);
    });
  });

  group('GeneratedGrid', () {
    test('embarque toujours un avertissement', () {
      final grid = GeneratedGrid.fromJson({
        'numbers': [1, 2, 3, 4, 5],
        'chance': 1,
        'method_label': 'Aléatoire pur',
        'warning': 'Les tirages sont aléatoires.',
      });
      expect(grid.warning, isNotEmpty);
    });
  });
}
