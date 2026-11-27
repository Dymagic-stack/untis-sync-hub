<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{ env('APP_TITLE', 'WebUntis Sync-Hub') }}</title>
    @php
        $ssoRole = request()->query('sso_role');
        $ssoRole = in_array($ssoRole, ['teacher', 'student'], true) ? $ssoRole : null;
        $ssoLocked = request()->boolean('sso_lock', false);
        $apiBaseUrl = $ssoLocked
            ? '/sync-hub/api/sync-hub'
            : rtrim(env('SYNC_HUB_URL', url('/')), '/') . '/api/sync-hub';
    @endphp
    <script>
        window.ATIW_CONFIG = {
            frontendMode: @json(env('APP_FRONTEND_MODE', 'webuntis')),
            syncHubUrl: @json(env('SYNC_HUB_URL', url('/'))),
            webuntisUrl: @json(env('WEBUNTIS_URL', url('/'))),
            moodleUrl: @json(env('MOODLE_URL', url('/'))),
            appLogoUrl: @json(env('APP_LOGO_URL', '/sync-logo.png')),
            apiBaseUrl: @json($apiBaseUrl),
            ssoRole: @json($ssoRole),
            ssoLocked: @json($ssoLocked),
            ssoCanAccessSync: @json(request()->boolean('sso_sync_access', true))
        };
    </script>
    @vite(['resources/css/app.css', 'resources/js/app.js'])
</head>
<body>
    <div id="app"></div>
</body>
</html>
