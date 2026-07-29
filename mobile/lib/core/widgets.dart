import 'package:flutter/material.dart';

import 'disclaimers.dart';
import 'theme.dart';

/// Boule de numéro (numéro principal ou Chance).
class NumberBall extends StatelessWidget {
  final int number;
  final bool isChance;
  final double size;

  const NumberBall({
    required this.number,
    this.isChance = false,
    this.size = 44,
    super.key,
  });

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Semantics(
      label: isChance ? 'Numéro Chance $number' : 'Numéro $number',
      excludeSemantics: true,
      child: Container(
        width: size,
        height: size,
        alignment: Alignment.center,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          gradient: isChance
              ? const LinearGradient(colors: [BrandColors.pink, BrandColors.violet])
              : LinearGradient(colors: [scheme.primary, BrandColors.violet]),
        ),
        child: Text(
          '$number',
          style: TextStyle(
            color: Colors.white,
            fontWeight: FontWeight.w800,
            fontSize: size * 0.38,
          ),
        ),
      ),
    );
  }
}

/// Bandeau d'avertissement statistique obligatoire.
class WarningBanner extends StatelessWidget {
  final String text;
  const WarningBanner({this.text = Disclaimers.stats, super.key});

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: scheme.secondaryContainer.withValues(alpha: 0.5),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        children: [
          Icon(Icons.info_outline, size: 20, color: scheme.onSecondaryContainer),
          const SizedBox(width: 10),
          Expanded(
            child: Text(text, style: Theme.of(context).textTheme.bodySmall),
          ),
        ],
      ),
    );
  }
}

/// Bandeau « données hors connexion ».
class OfflineBanner extends StatelessWidget {
  const OfflineBanner({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(vertical: 6, horizontal: 12),
      color: BrandColors.yellow.withValues(alpha: 0.25),
      child: const Text(
        'Mode hors connexion : données mises en cache, possiblement anciennes.',
        style: TextStyle(fontSize: 12),
      ),
    );
  }
}

/// Vue d'erreur avec bouton réessayer.
class ErrorRetryView extends StatelessWidget {
  final String message;
  final VoidCallback onRetry;
  const ErrorRetryView({required this.message, required this.onRetry, super.key});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.cloud_off, size: 42),
            const SizedBox(height: 12),
            Text(message, textAlign: TextAlign.center),
            const SizedBox(height: 16),
            FilledButton.icon(
              onPressed: onRetry,
              icon: const Icon(Icons.refresh),
              label: const Text('Réessayer'),
            ),
          ],
        ),
      ),
    );
  }
}

/// État vide.
class EmptyView extends StatelessWidget {
  final String message;
  const EmptyView({required this.message, super.key});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.inbox_outlined, size: 42),
            const SizedBox(height: 12),
            Text(message, textAlign: TextAlign.center),
          ],
        ),
      ),
    );
  }
}

/// Carte de section avec titre.
class SectionCard extends StatelessWidget {
  final String title;
  final Widget child;
  final Widget? trailing;

  const SectionCard({required this.title, required this.child, this.trailing, super.key});

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(title, style: Theme.of(context).textTheme.titleMedium),
                ),
                if (trailing != null) trailing!,
              ],
            ),
            const SizedBox(height: 12),
            child,
          ],
        ),
      ),
    );
  }
}

/// Sélecteur de fenêtre d'analyse (10 / 20 / 50 / 100 / tout).
class WindowSelector extends StatelessWidget {
  final int? value;
  final ValueChanged<int?> onChanged;
  const WindowSelector({required this.value, required this.onChanged, super.key});

  static const options = [10, 20, 50, 100, null];

  @override
  Widget build(BuildContext context) {
    return Wrap(
      spacing: 8,
      children: [
        for (final option in options)
          ChoiceChip(
            label: Text(option == null ? 'Tout' : '$option derniers'),
            selected: value == option,
            onSelected: (_) => onChanged(option),
          ),
      ],
    );
  }
}
