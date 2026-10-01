<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Cross-Origin Resource Sharing (CORS) Configuration
    |--------------------------------------------------------------------------
    |
    | Here you may configure your settings for cross-origin resource sharing
    | or "CORS". This determines what cross-origin operations may execute
    | in web browsers. You are free to adjust these settings as needed.
    |
    | To learn more: https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS
    |
    */

    /*
     * Fortify's auth endpoints live in the `web` group, not under `api/*`, so
     * the public site reaches them at their bare paths — they have to be listed
     * here or the browser blocks the login POST.
     */
    'paths' => [
        'api/*',
        'sanctum/csrf-cookie',
        'login',
        'logout',
        'register',
        'forgot-password',
        'reset-password',
        'user/profile-information',
        'user/password',
    ],

    'allowed_methods' => ['*'],

    /*
     * Must stay an explicit list: a browser rejects a credentialed response
     * whose `Access-Control-Allow-Origin` is `*`, and cookie auth makes every
     * request credentialed.
     */
    'allowed_origins' => [env('FRONTEND_URL', 'http://localhost:3000')],

    'allowed_origins_patterns' => [],

    'allowed_headers' => ['*'],

    'exposed_headers' => [],

    'max_age' => 0,

    // Non-negotiable for Sanctum SPA mode: without it the browser neither sends
    // the session cookie nor keeps the one the login response sets.
    'supports_credentials' => true,

];
