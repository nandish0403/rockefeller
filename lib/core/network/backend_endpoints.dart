const String _defaultApiBaseUrl = 'https://rockefeller-production.up.railway.app';

const String _configuredApiBaseUrl =
    String.fromEnvironment('API_BASE_URL', defaultValue: _defaultApiBaseUrl);

String get apiBaseUrl {
  var url = _configuredApiBaseUrl.trim();
  while (url.endsWith('/')) {
    url = url.substring(0, url.length - 1);
  }
  return url;
}

String get wsBaseUrl {
  final api = apiBaseUrl;
  if (api.startsWith('https://')) {
    return 'wss://${api.substring('https://'.length)}';
  }
  if (api.startsWith('http://')) {
    return 'ws://${api.substring('http://'.length)}';
  }
  return api;
}

Uri buildUserWsUri({required String userId, required String token}) {
  final safeUserId = Uri.encodeComponent(userId);
  return Uri.parse('$wsBaseUrl/ws/$safeUserId')
      .replace(queryParameters: {'token': token});
}

String resolveBackendMediaUrl(String raw) {
  final value = raw.trim();
  if (value.isEmpty) return value;

  final uri = Uri.tryParse(value);
  if (uri != null && uri.hasScheme) return value;
  if (value.startsWith('//')) return 'https:$value';
  if (value.startsWith('/')) return '$apiBaseUrl$value';
  return '$apiBaseUrl/$value';
}
