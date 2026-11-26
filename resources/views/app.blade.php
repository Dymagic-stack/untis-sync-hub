<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{ env('APP_TITLE', 'WebUntis Sync-Hub') }}</title>
    <script>
        window.ATIW_CONFIG = {
            frontendMode: @json(env('APP_FRONTEND_MODE', 'webuntis')),
            syncHubUrl: @json(env('SYNC_HUB_URL', url('/'))),
            webuntisUrl: @json(env('WEBUNTIS_URL', url('/'))),
            moodleUrl: @json(env('MOODLE_URL', url('/'))),
            appLogoUrl: @json(env('APP_LOGO_URL', '/sync-logo.png')),
            apiBaseUrl: @json(rtrim(env('SYNC_HUB_URL', url('/')), '/') . '/api/sync-hub')
        };
    </script>
    @vite(['resources/css/app.css', 'resources/js/app.js'])
</head>
<body>
    <div id="app"></div>
</body>
</html>
