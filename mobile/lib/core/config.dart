/// Configuration de l'application, injectée à la compilation via --dart-define.
/// Aucun secret n'est embarqué : la clé Supabase « anon » est publique par
/// conception (la sécurité repose sur la RLS côté base).
class AppConfig {
  static const apiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://10.0.2.2:8000',
  );

  static const supabaseUrl = String.fromEnvironment('SUPABASE_URL');
  static const supabaseAnonKey = String.fromEnvironment('SUPABASE_ANON_KEY');

  static bool get supabaseConfigured =>
      supabaseUrl.isNotEmpty && supabaseAnonKey.isNotEmpty;

  /// Vide (`--dart-define=API_BASE_URL=`) quand aucune API n'est hébergée :
  /// l'appli lit alors directement Supabase et calcule les statistiques en local.
  static bool get apiConfigured => apiBaseUrl.isNotEmpty;
}
