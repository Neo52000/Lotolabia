import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/widgets.dart';
import '../../data/models.dart';
import '../../data/providers.dart';

/// Classement générique de numéros (fréquences / retards).
class _RankedStatsScreen extends ConsumerWidget {
  final String title;
  final ProviderBase<AsyncValue<StatsResult>> provider;
  final String Function(NumberStat) valueLabel;
  final int Function(NumberStat) sortValue;

  const _RankedStatsScreen({
    required this.title,
    required this.provider,
    required this.valueLabel,
    required this.sortValue,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final result = ref.watch(provider);
    final window = ref.watch(analysisWindowProvider);
    return Scaffold(
      appBar: AppBar(title: Text(title)),
      body: result.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) =>
            ErrorRetryView(message: '$error', onRetry: () => ref.invalidate(provider)),
        data: (stats) {
          final sorted = [...stats.numbers]..sort((a, b) => sortValue(b).compareTo(sortValue(a)));
          final chanceSorted = [...stats.chance]
            ..sort((a, b) => sortValue(b).compareTo(sortValue(a)));
          return ListView(
            padding: const EdgeInsets.all(12),
            children: [
              WindowSelector(
                value: window,
                onChanged: (value) =>
                    ref.read(analysisWindowProvider.notifier).state = value,
              ),
              const SizedBox(height: 8),
              Text('${stats.drawCount} tirages analysés — ${stats.explanation}',
                  style: Theme.of(context).textTheme.bodySmall),
              const SizedBox(height: 8),
              SectionCard(
                title: 'Numéros principaux (1-49)',
                child: Column(
                  children: [
                    for (final stat in sorted)
                      ListTile(
                        dense: true,
                        contentPadding: EdgeInsets.zero,
                        leading: NumberBall(number: stat.number, size: 34),
                        title: LinearProgressIndicator(
                          value: _ratio(stat, sorted),
                          minHeight: 6,
                          borderRadius: BorderRadius.circular(3),
                        ),
                        trailing: Text(valueLabel(stat)),
                        onTap: () => _showNumberProfile(context, ref, stat.number),
                      ),
                  ],
                ),
              ),
              const SizedBox(height: 12),
              SectionCard(
                title: 'Numéro Chance (1-10)',
                child: Column(
                  children: [
                    for (final stat in chanceSorted)
                      ListTile(
                        dense: true,
                        contentPadding: EdgeInsets.zero,
                        leading: NumberBall(number: stat.number, isChance: true, size: 34),
                        trailing: Text(valueLabel(stat)),
                      ),
                  ],
                ),
              ),
              const SizedBox(height: 12),
              WarningBanner(text: stats.disclaimer),
            ],
          );
        },
      ),
    );
  }

  double _ratio(NumberStat stat, List<NumberStat> sorted) {
    final max = sortValue(sorted.first);
    if (max <= 0) return 0;
    return sortValue(stat) / max;
  }

  void _showNumberProfile(BuildContext context, WidgetRef ref, int number) {
    showModalBottomSheet<void>(
      context: context,
      showDragHandle: true,
      builder: (context) => Consumer(
        builder: (context, ref, _) {
          final profile = ref.watch(numberProfileProvider(number));
          return Padding(
            padding: const EdgeInsets.all(20),
            child: profile.when(
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (error, _) => Text('$error'),
              data: (data) => Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      NumberBall(number: number),
                      const SizedBox(width: 12),
                      Text('Profil du numéro $number',
                          style: Theme.of(context).textTheme.titleMedium),
                    ],
                  ),
                  const SizedBox(height: 12),
                  Text('Sorties : ${data['appearances']}'),
                  Text(
                      'Fréquence relative : ${((data['relative_frequency'] as num? ?? 0) * 100).toStringAsFixed(1)} %'),
                  Text('Retard actuel : ${data['current_delay'] ?? 'jamais sorti'}'),
                  Text('Écart moyen : ${data['gap_mean'] ?? '—'}'),
                  const SizedBox(height: 12),
                  const WarningBanner(),
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}

class FrequenciesScreen extends StatelessWidget {
  const FrequenciesScreen({super.key});

  @override
  Widget build(BuildContext context) => _RankedStatsScreen(
        title: 'Fréquences',
        provider: frequenciesProvider,
        valueLabel: (stat) => '${stat.count ?? 0}×',
        sortValue: (stat) => stat.count ?? 0,
      );
}

class DelaysScreen extends StatelessWidget {
  const DelaysScreen({super.key});

  @override
  Widget build(BuildContext context) => _RankedStatsScreen(
        title: 'Retards',
        provider: delaysProvider,
        valueLabel: (stat) => stat.delay == null ? 'jamais' : '${stat.delay} tirages',
        sortValue: (stat) => stat.delay ?? -1,
      );
}

/// Tendances : formes de tirage (pair/impair, bas/haut, sommes, dizaines…).
class TrendsScreen extends ConsumerWidget {
  const TrendsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final shapes = ref.watch(shapesProvider);
    final window = ref.watch(analysisWindowProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('Tendances')),
      body: shapes.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) =>
            ErrorRetryView(message: '$error', onRetry: () => ref.invalidate(shapesProvider)),
        data: (data) {
          final sum = data['sum'] as Map<String, dynamic>? ?? {};
          final amplitude = data['amplitude'] as Map<String, dynamic>? ?? {};
          return ListView(
            padding: const EdgeInsets.all(12),
            children: [
              WindowSelector(
                value: window,
                onChanged: (value) =>
                    ref.read(analysisWindowProvider.notifier).state = value,
              ),
              const SizedBox(height: 8),
              SectionCard(
                title: 'Somme des numéros',
                child: Text(
                  'Min ${sum['min'] ?? '—'} · Médiane ${sum['median'] ?? '—'} · '
                  'Moyenne ${sum['mean'] ?? '—'} · Max ${sum['max'] ?? '—'} · '
                  'Écart-type ${sum['std_dev'] ?? '—'}',
                ),
              ),
              const SizedBox(height: 10),
              SectionCard(
                title: 'Amplitude (max − min)',
                child: Text(
                  'Min ${amplitude['min'] ?? '—'} · Médiane ${amplitude['median'] ?? '—'} · '
                  'Moyenne ${amplitude['mean'] ?? '—'} · Max ${amplitude['max'] ?? '—'}',
                ),
              ),
              const SizedBox(height: 10),
              _distributionCard(context, 'Répartition pairs', data['even_odd'] as List? ?? [],
                  (item) => '${item['even_count']} pairs', (item) => item['draws'] as int),
              const SizedBox(height: 10),
              _distributionCard(context, 'Répartition bas (1-24)', data['low_high'] as List? ?? [],
                  (item) => '${item['low_count']} bas', (item) => item['draws'] as int),
              const SizedBox(height: 10),
              _distributionCard(context, 'Dizaines', data['decades'] as List? ?? [],
                  (item) => '${item['decade']}', (item) => item['count'] as int),
              const SizedBox(height: 10),
              _distributionCard(
                  context,
                  'Numéros consécutifs',
                  data['consecutive'] as List? ?? [],
                  (item) => '${item['consecutive_pairs']} paires consécutives',
                  (item) => item['draws'] as int),
              const SizedBox(height: 12),
              WarningBanner(text: (data['disclaimer'] ?? '') as String),
            ],
          );
        },
      ),
    );
  }

  Widget _distributionCard(BuildContext context, String title, List items,
      String Function(dynamic) label, int Function(dynamic) value) {
    final maxValue =
        items.isEmpty ? 1 : items.map(value).reduce((a, b) => a > b ? a : b).clamp(1, 1 << 30);
    return SectionCard(
      title: title,
      child: Column(
        children: [
          for (final item in items)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 3),
              child: Row(
                children: [
                  SizedBox(width: 150, child: Text(label(item), style: const TextStyle(fontSize: 13))),
                  Expanded(
                    child: LinearProgressIndicator(
                      value: value(item) / maxValue,
                      minHeight: 8,
                      borderRadius: BorderRadius.circular(4),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Text('${value(item)}'),
                ],
              ),
            ),
        ],
      ),
    );
  }
}

/// Paires les plus fréquentes.
class PairsScreen extends ConsumerWidget {
  const PairsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return _CombinationsScreen(
      title: 'Paires fréquentes',
      provider: pairsProvider,
      onRetry: () => ref.invalidate(pairsProvider),
    );
  }
}

/// Triplets (Premium).
class TripletsScreen extends ConsumerWidget {
  const TripletsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return _CombinationsScreen(
      title: 'Triplets fréquents',
      provider: tripletsProvider,
      onRetry: () => ref.invalidate(tripletsProvider),
    );
  }
}

class _CombinationsScreen extends ConsumerWidget {
  final String title;
  final ProviderBase<AsyncValue<Map<String, dynamic>>> provider;
  final VoidCallback onRetry;

  const _CombinationsScreen(
      {required this.title, required this.provider, required this.onRetry});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final result = ref.watch(provider);
    final window = ref.watch(analysisWindowProvider);
    return Scaffold(
      appBar: AppBar(title: Text(title)),
      body: result.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) {
          if (error is PremiumRequiredException) {
            return Center(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.workspace_premium, size: 48),
                    const SizedBox(height: 12),
                    Text(error.message, textAlign: TextAlign.center),
                    const SizedBox(height: 16),
                    FilledButton(
                      onPressed: () => context.go('/premium'),
                      child: const Text('Découvrir Premium'),
                    ),
                  ],
                ),
              ),
            );
          }
          return ErrorRetryView(message: '$error', onRetry: onRetry);
        },
        data: (data) {
          final combos = data['combinations'] as List? ?? [];
          return ListView(
            padding: const EdgeInsets.all(12),
            children: [
              WindowSelector(
                value: window,
                onChanged: (value) =>
                    ref.read(analysisWindowProvider.notifier).state = value,
              ),
              const SizedBox(height: 8),
              for (final combo in combos)
                Card(
                  child: ListTile(
                    title: Wrap(
                      spacing: 6,
                      children: [
                        for (final number in (combo['numbers'] as List))
                          NumberBall(number: number as int, size: 32),
                      ],
                    ),
                    trailing: Text('${combo['count']}× ensemble'),
                  ),
                ),
              if (combos.isEmpty)
                const EmptyView(message: 'Pas encore assez de tirages pour cette analyse.'),
              const SizedBox(height: 12),
              WarningBanner(text: (data['disclaimer'] ?? '') as String),
            ],
          );
        },
      ),
    );
  }
}
