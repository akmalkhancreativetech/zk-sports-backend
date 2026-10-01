import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
    plugins: [
        laravel({
            input: ['resources/css/app.css', 'resources/js/app.tsx'],
            refresh: true,
        }),
        react(),
        tailwindcss(),
    ],
    resolve: {
        alias: {
            '@': '/resources/js'
        },
    },
    /**
     * Pages load through a dynamic `import.meta.glob`, so Vite's dependency
     * scanner — which only follows static imports from the entry — never sees
     * the libraries that live inside a page. It discovers them on the first
     * visit instead, re-optimizes, and forces a full reload mid-session. Naming
     * them here moves that work to server start, once.
     */
    optimizeDeps: {
        include: [
            '@dnd-kit/core',
            '@dnd-kit/sortable',
            '@dnd-kit/utilities',
            '@tanstack/react-table',
            'cmdk',
            'date-fns',
            'lucide-react',
            'react-day-picker',
            'sonner',
            'next-themes',
        ],
    },
    server: {
        host: '0.0.0.0',
        // `localhost` resolves to ::1 first, which nothing listens on here, so
        // every request pays a ~200ms IPv6 timeout before falling back to IPv4.
        // The literal skips it. Change back to a LAN IP to serve other devices.
        hmr: { host: '127.0.0.1' },
        // Transform the shell and the admin pages up front rather than on the
        // first navigation to each.
        warmup: {
            clientFiles: [
                './resources/js/app.tsx',
                './resources/js/pages/admin/**/*.tsx',
                './resources/js/components/admin/*.tsx',
            ],
        },
    },
});
