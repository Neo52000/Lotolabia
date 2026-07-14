import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:lotolab_ia/core/disclaimers.dart';
import 'package:lotolab_ia/core/widgets.dart';

void main() {
  Widget wrap(Widget child) => MaterialApp(home: Scaffold(body: child));

  testWidgets('NumberBall affiche le numéro avec sémantique accessible', (tester) async {
    await tester.pumpWidget(wrap(const NumberBall(number: 42)));
    expect(find.text('42'), findsOneWidget);
    expect(find.bySemanticsLabel('Numéro 42'), findsOneWidget);
  });

  testWidgets('NumberBall Chance a une sémantique distincte', (tester) async {
    await tester.pumpWidget(wrap(const NumberBall(number: 7, isChance: true)));
    expect(find.bySemanticsLabel('Numéro Chance 7'), findsOneWidget);
  });

  testWidgets('WarningBanner affiche l\'avertissement obligatoire', (tester) async {
    await tester.pumpWidget(wrap(const WarningBanner()));
    expect(find.textContaining('probabilité théorique'), findsOneWidget);
  });

  testWidgets('Le vocabulaire interdit est absent des avertissements', (tester) async {
    for (final text in [Disclaimers.stats, Disclaimers.independence]) {
      expect(text.toLowerCase().contains('gagnant'), isFalse);
      expect(text.toLowerCase().contains('prédiction fiable'), isFalse);
      expect(text.toLowerCase().contains('garantie'), isFalse);
    }
  });

  testWidgets('ErrorRetryView déclenche le rappel', (tester) async {
    var retried = false;
    await tester.pumpWidget(wrap(
      ErrorRetryView(message: 'Erreur réseau', onRetry: () => retried = true),
    ));
    await tester.tap(find.text('Réessayer'));
    expect(retried, isTrue);
  });

  testWidgets('WindowSelector propose les fenêtres demandées', (tester) async {
    int? selected = 10;
    await tester.pumpWidget(wrap(StatefulBuilder(
      builder: (context, setState) => WindowSelector(
        value: selected,
        onChanged: (value) => setState(() => selected = value),
      ),
    )));
    for (final label in ['10 derniers', '20 derniers', '50 derniers', '100 derniers', 'Tout']) {
      expect(find.text(label), findsOneWidget);
    }
    await tester.tap(find.text('Tout'));
    await tester.pump();
    expect(selected, isNull);
  });
}
