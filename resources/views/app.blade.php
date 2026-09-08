<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}" class="h-full">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    {{-- `data-inertia`, not `inertia`: v3 renamed the attribute. With the old
         name the client head manager does not recognise this title and appends
         a second <title> instead of replacing it. --}}
    <title data-inertia>{{ config('app.name') }}</title>

    {{-- Applies the persisted theme before first paint. Without this the app
         renders light, then next-themes corrects it after hydration. --}}
    <script>
        (() => {
            try {
                const stored = localStorage.getItem('zk-appearance') ?? 'system';
                const dark = stored === 'dark' || (stored === 'system' &&
                    window.matchMedia('(prefers-color-scheme: dark)').matches);
                const root = document.documentElement;
                root.classList.toggle('dark', dark);
                root.style.colorScheme = dark ? 'dark' : 'light';
            } catch {}
        })();
    </script>

    {{-- Boot indicator. Inline rather than Tailwind: this has to paint before
         the stylesheet and bundle arrive, which is the whole point of it. --}}
    <style>
        #app-boot {
            position: fixed;
            inset: 0;
            display: grid;
            place-items: center;
        }
        #app-boot span {
            width: 1.75rem;
            height: 1.75rem;
            border-radius: 9999px;
            border: 2px solid color-mix(in oklab, currentColor 20%, transparent);
            border-top-color: color-mix(in oklab, currentColor 70%, transparent);
            animation: app-boot-spin 0.7s linear infinite;
        }
        @keyframes app-boot-spin {
            to { transform: rotate(360deg); }
        }
        @media (prefers-reduced-motion: reduce) {
            #app-boot span { animation-duration: 2s; }
        }
    </style>

    @viteReactRefresh
    @vite(['resources/css/app.css', 'resources/js/app.tsx'])
    @inertiaHead
</head>
<body class="h-full font-sans antialiased">
    @inertia

    {{-- Removed by app.tsx once Inertia has mounted. --}}
    <div id="app-boot" role="status" aria-label="Loading"><span></span></div>

    <noscript>
        <p style="padding:2rem;text-align:center;font:1rem system-ui">
            This admin panel needs JavaScript enabled.
        </p>
    </noscript>
</body>
</html>