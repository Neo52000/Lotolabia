import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/disclaimers.dart';
import '../../core/widgets.dart';
import '../../data/providers.dart';

class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final latest = ref.watch(latestDrawProvider);
    final overview = ref.watch(overviewProvider);
    final api = ref.watch(apiClientProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('LotoLab IA')),
      body: RefreshIndicator(
        onRefresh: () async {
          ref.invalidate(latestDrawProvider);
          ref.invalidate(overviewProvider);
        },
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            if (api.lastResponseFromCache) const OfflineBanner(),
            Text('Analysez. Comprenez. Jouez mieux.',
                style: Theme.of(context).textTheme.titleLarge),
            const SizedBox(height: 4),
            Text(Disclaimers.independence,
                style: Theme.of(context).textTheme.bodySmall),
            const SizedBox(height: 16),
            SectionCard(
              title: 'Dernier tirage',
              trailing: TextButton(
                onPressed: () => context.go('/latest'),
                child: const Text('Détail'),
              ),
              child: latest.when(
                loading: () => const LinearProgressIndicator(),
                error: (error, _) => Text('$error'),
                data: (draw) => Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(draw.drawDate),
                    const SizedBox(height: 10),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: [
                        for (final number in draw.numbers) NumberBall(number: number),
                        NumberBall(number: draw.chance, isChance: true),
                      ],
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 12),
            SectionCard(
              title: 'Synthèse descriptive',
              child: overview.when(
                loading: () => const LinearProgressIndicator(),
                error: (error, _) => Text('$error'),
                data: (data) {
                  final most = (data['most_frequent'] as List? ?? []).take(5);
                  final delays = (data['longest_delays'] as List? ?? []).take(5);
                  return Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('${data['draw_count']} tirages analysés',
                          style: Theme.of(context).textTheme.bodySmall),
                      const SizedBox(height: 8),
                      const Text('Numéros les plus sortis :'),
                      const SizedBox(height: 6),
                      Wrap(
                        spacing: 6,
                        children: [
                          for (final item in most)
                            NumberBall(number: item['number'] as int, size: 36),
                        ],
                      ),
                      const SizedBox(height: 10),
                      const Text('Retards les plus longs :'),
                      const SizedBox(height: 6),
                      Wrap(
                        spacing: 6,
                        children: [
                          for (final item in delays)
                            NumberBall(number: item['number'] as int, size: 36),
                        ],
                      ),
                    ],
                  );
                },
              ),
            ),
            const SizedBox(height: 12),
            GridView.count(
              crossAxisCount: 2,
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              mainAxisSpacing: 10,
              crossAxisSpacing: 10,
              childAspectRatio: 2.4,
              children: [
                _QuickAction(icon: Icons.bar_chart, label: 'Fréquences', route: '/stats/frequencies'),
                _QuickAction(icon: Icons.hourglass_bottom, label: 'Retards', route: '/stats/delays'),
                _QuickAction(icon: Icons.casino, label: 'Générateur', route: '/generator'),
                _QuickAction(icon: Icons.science, label: 'Simulation', route: '/simulation'),
                _QuickAction(icon: Icons.show_chart, label: 'Graphiques', route: '/stats/charts'),
                _QuickAction(icon: Icons.history, label: 'Historique', route: '/history'),
              ],
            ),
            const SizedBox(height: 12),
            const WarningBanner(),
          ],
        ),
      ),
    );
  }
}

class _QuickAction extends StatelessWidget {
  final IconData icon;
  final String label;
  final String route;
  const _QuickAction({required this.icon, required this.label, required this.route});

  @override
  Widget build(BuildContext context) {
    return Card(
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: () => context.go(route),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 14),
          child: Row(
            children: [
              Icon(icon, color: Theme.of(context).colorScheme.primary),
              const SizedBox(width: 10),
              Expanded(child: Text(label, overflow: TextOverflow.ellipsis)),
            ],
          ),
        ),
      ),
    );
  }
}
