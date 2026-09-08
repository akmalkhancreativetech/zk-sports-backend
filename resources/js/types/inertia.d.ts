import type { PageProps as InertiaPageProps } from '@inertiajs/core';

export type UserRole = 'admin' | 'editor';

export interface AuthUser {
    id: number;
    name: string;
    email: string;
    role: UserRole;
}

export interface Auth {
    user: AuthUser | null;
}

export interface SharedProps extends InertiaPageProps {
    auth: Auth;
    flash: { success?: string; error?: string };
    /** Fortify's session `status` — auth screens render it as a banner. */
    status?: string;
    /** Persisted sidebar state, read from the `sidebar_state` cookie server-side. */
    sidebarOpen: boolean;
    /** Shared once the Orders module lands (plan.md §3.3). */
    newOrdersCount?: number;
}

declare module '@inertiajs/core' {
    interface PageProps extends SharedProps {}
}
