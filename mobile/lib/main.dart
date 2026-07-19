import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'core/config.dart';
import 'core/theme.dart';
import 'router.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  if (AppConfig.supabaseConfigured) {
    await Supabase.initialize(
      url: AppConfig.supabaseUrl,
      publishableKey: AppConfig.supabaseAnonKey,
    );
  }
  final onboardingDone = await hasSeenOnboarding();
  runApp(ProviderScope(child: LotoLabApp(onboardingDone: onboardingDone)));
}

/// Mode de thème sélectionné (préférence locale, synchronisée avec l'API
/// quand l'utilisateur est connecté).
final themeModeProvider = StateProvider<ThemeMode>((ref) => ThemeMode.system);

class LotoLabApp extends ConsumerWidget {
  final bool onboardingDone;
  const LotoLabApp({required this.onboardingDone, super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final themeMode = ref.watch(themeModeProvider);
    return MaterialApp.router(
      title: 'LotoLab IA',
      debugShowCheckedModeBanner: false,
      theme: lightTheme,
      darkTheme: darkTheme,
      themeMode: themeMode,
      routerConfig: buildRouter(onboardingDone: onboardingDone),
    );
  }
}
