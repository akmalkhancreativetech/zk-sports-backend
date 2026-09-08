import '../css/app.css';

import { createInertiaApp } from '@inertiajs/react';
import { ThemeProvider } from 'next-themes';
import type { ComponentType } from 'react';

import { Toaster } from '@/components/ui/sonner';

const appName = import.meta.env.VITE_APP_NAME || 'ZK Sports';
const pages = import.meta.glob<{ default: ComponentType<any> }>('./pages/**/*.tsx');

createInertiaApp({
    title: (title) => (title ? `${title} — ${appName}` : appName),

    resolve: async (name) => {
        const page = pages[`./pages/${name}.tsx`];

        if (!page) {
            throw new Error(`Inertia page not found: ./pages/${name}.tsx`);
        }

        return (await page()).default;
    },

    // `withApp` instead of `setup`: Inertia owns mounting, so it finds #app and
    // picks createRoot vs hydrateRoot itself. Providers are declared once here
    // rather than duplicated across a client and a server entry point.
    withApp: (app) => (
        <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            storageKey="zk-appearance"
        >
            {app}
            <Toaster position="bottom-right" richColors closeButton />
        </ThemeProvider>
    ),

    // `strictMode: true` is available in this mode (it is not with `setup`), but
    // it double-invokes effects in dev, which duplicates the flash toasts. Opt in
    // deliberately, not as a side effect of switching the mount.

    // Theme token, so the bar is legible in both light and dark.
    progress: { color: 'var(--primary)' },
})
    // The blade boot spinner covers the gap before this resolves.
    .then(() => document.getElementById('app-boot')?.remove());
