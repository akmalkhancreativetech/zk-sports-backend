import { ShieldIcon } from 'lucide-react';
import type { PropsWithChildren, ReactNode } from 'react';

interface AuthLayoutProps {
    title: string;
    description?: string;
    /** Secondary action below the form, e.g. a link back to sign in. */
    footer?: ReactNode;
}

function Brand({ className }: { className?: string }) {
    return (
        <span className={`inline-flex items-center gap-2.5 ${className ?? ''}`}>
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <ShieldIcon className="size-4" />
            </span>
            <span className="font-semibold tracking-tight">ZK Sports</span>
        </span>
    );
}

export default function AuthLayout({
    title,
    description,
    footer,
    children,
}: PropsWithChildren<AuthLayoutProps>) {
    return (
        <div className="grid min-h-screen lg:grid-cols-2">
            {/* Brand panel — decorative, so it is dropped entirely on small screens. */}
            <aside className="relative hidden flex-col justify-between overflow-hidden bg-primary p-10 text-primary-foreground lg:flex">
                <div
                    aria-hidden
                    className="absolute -top-24 -right-24 size-96 rounded-full bg-primary-foreground/10 blur-3xl"
                />
                <Brand />
                <div className="relative max-w-md">
                    <p className="text-2xl font-medium leading-snug">
                        Sliders, services, blog and orders — managed in one place.
                    </p>
                    <p className="mt-3 text-sm text-primary-foreground/70">
                        Staff access only. Accounts are created by an administrator.
                    </p>
                </div>
                <p className="relative text-xs text-primary-foreground/60">
                    &copy; {new Date().getFullYear()} ZK Sports
                </p>
            </aside>

            <main className="flex flex-col justify-center px-6 py-12 sm:px-12">
                <div className="mx-auto w-full max-w-sm">
                    <Brand className="mb-10 lg:hidden" />

                    <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
                    {description && (
                        <p className="mt-2 text-sm text-muted-foreground">{description}</p>
                    )}

                    <div className="mt-8">{children}</div>

                    {footer && <div className="mt-6 text-sm text-muted-foreground">{footer}</div>}
                </div>
            </main>
        </div>
    );
}
