import 'package:flutter_test/flutter_test.dart';
import 'package:lotolab_ia/data/monte_carlo_fallback.dart';

void main() {
  test('distribution complète : 6 correspondances × 2 états Chance', () {
    final result = simulateRandomPlay(iterations: 500, seed: 1);
    final distribution = (result['distribution'] as List).cast<Map<String, dynamic>>();
    expect(result['iterations'], 500);
    expect(distribution, hasLength(12));
    expect(distribution.fold<int>(0, (sum, row) => sum + (row['count'] as int)), 500);
  });

  test('probabilité théorique du rang 1 conforme aux règles du jeu', () {
    final result = simulateRandomPlay(iterations: 10, seed: 1);
    expect(result['theoretical_jackpot_probability'], closeTo(1 / 19068840, 1e-12));
  });

  test('reproductible avec la même graine', () {
    expect(
      simulateRandomPlay(iterations: 200, seed: 42)['distribution'],
      simulateRandomPlay(iterations: 200, seed: 42)['distribution'],
    );
  });

  test("n'utilise jamais de vocabulaire proscrit", () {
    final result = simulateRandomPlay(iterations: 50, seed: 1);
    final text = '${result['explanation']} ${result['disclaimer']}'.toLowerCase();
    for (final phrase in ['gagnant', 'sûr', 'prédiction fiable', 'garantie']) {
      expect(text, isNot(contains(phrase)));
    }
  });
}
