import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:share_plus/share_plus.dart';

import '../../core/widgets.dart';
import '../../data/models.dart';
import '../../data/providers.dart';

/// Écran « dernier tirage ».
class LatestDrawScreen extends ConsumerWidget {
  const LatestDrawScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final latest = ref.watch(latestDrawProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('Dernier tirage')),
      body: latest.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => ErrorRetryView(
          message: '$error',
          onRetry: () => ref.invalidate(latestDrawProvider),
        ),
        data: (draw) => _DrawDetailBody(draw: draw),
      ),
    );
  }
}

/// Écran « historique » avec pagination progressive.
class HistoryScreen extends ConsumerStatefulWidget {
  const HistoryScreen({super.key});

  @override
  ConsumerState<HistoryScreen> createState() => _HistoryScreenState();
}

class _HistoryScreenState extends ConsumerState<HistoryScreen> {
  int _pages = 1;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Historique des tirages')),
      body: ListView(
        padding: const EdgeInsets.all(12),
        children: [
          for (var page = 1; page <= _pages; page++) _HistoryPage(page: page),
          Consumer(
            builder: (context, ref, _) {
              final lastPage = ref.watch(drawsPageProvider(_pages));
              return lastPage.maybeWhen(
                data: (data) {
                  final loaded = _pages * 20;
                  if (data.truncated) {
                    return Padding(
                      padding: const EdgeInsets.all(12),
                      child: Column(
                        children: [
                          const Text(
                            'Historique limité dans l\'offre gratuite. '
                            'Passez à Premium pour l\'historique complet.',
                            textAlign: TextAlign.center,
                          ),
                          TextButton(
                            onPressed: () => context.go('/premium'),
                            child: const Text('Découvrir Premium'),
                          ),
                        ],
                      ),
                    );
                  }
                  if (loaded >= data.total) return const SizedBox.shrink();
                  return Padding(
                    padding: const EdgeInsets.all(12),
                    child: OutlinedButton(
                      onPressed: () => setState(() => _pages += 1),
                      child: const Text('Charger plus'),
                    ),
                  );
                },
                orElse: () => const SizedBox.shrink(),
              );
            },
          ),
        ],
      ),
    );
  }
}

class _HistoryPage extends ConsumerWidget {
  final int page;
  const _HistoryPage({required this.page});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final draws = ref.watch(drawsPageProvider(page));
    return draws.when(
      loading: () => const Padding(
        padding: EdgeInsets.all(16),
        child: Center(child: CircularProgressIndicator()),
      ),
      error: (error, _) => page == 1
          ? ErrorRetryView(
              message: '$error',
              onRetry: () => ref.invalidate(drawsPageProvider(page)),
            )
          : Text('$error'),
      data: (data) {
        if (data.items.isEmpty && page == 1) {
          return const EmptyView(
              message: 'Aucun tirage disponible pour le moment.\n'
                  'Les résultats apparaîtront après la première synchronisation.');
        }
        return Column(
          children: [
            for (final draw in data.items)
              Card(
                child: ListTile(
                  title: Text(draw.drawDate),
                  subtitle: Wrap(
                    spacing: 5,
                    runSpacing: 5,
                    children: [
                      for (final number in draw.numbers) NumberBall(number: number, size: 30),
                      NumberBall(number: draw.chance, isChance: true, size: 30),
                    ],
                  ),
                  trailing: const Icon(Icons.chevron_right),
                  onTap: () => context.go('/draws/${draw.drawDate}'),
                ),
              ),
          ],
        );
      },
    );
  }
}

/// Écran « détail d'un tirage ».
class DrawDetailScreen extends ConsumerWidget {
  final String date;
  const DrawDetailScreen({required this.date, super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final detail = ref.watch(drawDetailProvider(date));
    return Scaffold(
      appBar: AppBar(title: Text('Tirage du $date')),
      body: detail.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => ErrorRetryView(
          message: '$error',
          onRetry: () => ref.invalidate(drawDetailProvider(date)),
        ),
        data: (draw) => _DrawDetailBody(draw: draw),
      ),
    );
  }
}

class _DrawDetailBody extends StatelessWidget {
  final Draw draw;
  const _DrawDetailBody({required this.draw});

  @override
  Widget build(BuildContext context) {
    final numbers = draw.numbers;
    final sum = numbers.fold<int>(0, (a, b) => a + b);
    final even = numbers.where((n) => n.isEven).length;
    final low = numbers.where((n) => n <= 24).length;
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        SectionCard(
          title: 'Combinaison du ${draw.drawDate}',
          trailing: IconButton(
            icon: const Icon(Icons.share),
            tooltip: 'Partager',
            onPressed: () => Share.share(
              'Tirage Loto du ${draw.drawDate} : ${numbers.join(" - ")} / Chance ${draw.chance} '
              '(analyse LotoLab IA — outil indépendant, statistiques descriptives uniquement)',
            ),
          ),
          child: Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              for (final number in numbers) NumberBall(number: number),
              NumberBall(number: draw.chance, isChance: true),
            ],
          ),
        ),
        const SizedBox(height: 12),
        SectionCard(
          title: 'Caractéristiques descriptives',
          child: Column(
            children: [
              _row('Somme des numéros', '$sum'),
              _row('Amplitude', '${numbers.last - numbers.first}'),
              _row('Pairs / impairs', '$even pairs, ${5 - even} impairs'),
              _row('Bas (1-24) / haut (25-49)', '$low bas, ${5 - low} haut'),
              _row('Source', draw.source),
            ],
          ),
        ),
        const SizedBox(height: 12),
        const WarningBanner(),
      ],
    );
  }

  Widget _row(String label, String value) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 4),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [Text(label), Text(value, style: const TextStyle(fontWeight: FontWeight.w600))],
        ),
      );
}
