import { Head, Link, usePage } from '@inertiajs/react';
import { Fragment, type PropsWithChildren, type ReactNode, useEffect } from 'react';
import { toast } from 'sonner';

import { AppSidebar } from '@/components/admin/app-sidebar';
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Separator } from '@/components/ui/separator';
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { breadcrumbsFor } from '@/lib/nav';
import { routes } from '@/lib/routes';
import type { SharedProps } from '@/types/inertia';

interface AdminLayoutProps {
    /** Page title — used for the document title and the H1 in the page header. */
    title: string;
    description?: string;
    /** Right-aligned header content: primary actions for the page. */
    actions?: ReactNode;
}

function FlashToasts() {
    const { flash } = usePage<SharedProps>().props;

    useEffect(() => {
        if (flash?.success) {
            toast.success(flash.success);
        }

        if (flash?.error) {
            toast.error(flash.error);
        }
    }, [flash]);

    return null;
}

function Crumbs({ title }: { title: string }) {
    const { url } = usePage();
    const trail = breadcrumbsFor(url);
    const isDashboard = url === routes.dashboard;

    return (
        <Breadcrumb>
            <BreadcrumbList>
                <BreadcrumbItem>
                    {isDashboard ? (
                        <BreadcrumbPage>Dashboard</BreadcrumbPage>
                    ) : (
                        <BreadcrumbLink render={<Link href={routes.dashboard} />}>
                            Dashboard
                        </BreadcrumbLink>
                    )}
                </BreadcrumbItem>

                {/* Separators are siblings of items, never children: both render
                    an <li>, and nesting them is invalid HTML that breaks
                    hydration. */}
                {!isDashboard &&
                    trail.map((crumb, index) => {
                        const isLast = index === trail.length - 1;

                        return (
                            <Fragment key={crumb.href}>
                                <BreadcrumbSeparator />
                                <BreadcrumbItem>
                                    {isLast ? (
                                        <BreadcrumbPage>{crumb.title}</BreadcrumbPage>
                                    ) : (
                                        <BreadcrumbLink render={<Link href={crumb.href} />}>
                                            {crumb.title}
                                        </BreadcrumbLink>
                                    )}
                                </BreadcrumbItem>
                            </Fragment>
                        );
                    })}

                {!isDashboard && trail.length === 0 && (
                    <>
                        <BreadcrumbSeparator />
                        <BreadcrumbItem>
                            <BreadcrumbPage>{title}</BreadcrumbPage>
                        </BreadcrumbItem>
                    </>
                )}
            </BreadcrumbList>
        </Breadcrumb>
    );
}

export default function AdminLayout({
    title,
    description,
    actions,
    children,
}: PropsWithChildren<AdminLayoutProps>) {
    const { sidebarOpen } = usePage<SharedProps>().props;

    return (
        <>
            <Head title={title} />
            <FlashToasts />

            <SidebarProvider defaultOpen={sidebarOpen ?? true}>
                <AppSidebar />

                <SidebarInset className="min-w-0">
                    <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center gap-2 border-b bg-background/80 backdrop-blur-sm transition-[width,height] ease-linear">
                        <div className="flex w-full items-center gap-2 px-4">
                            <SidebarTrigger className="-ml-1" />
                            <Separator orientation="vertical" className="mr-2 !h-4" />
                            <Crumbs title={title} />
                        </div>
                    </header>

                    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-0">
                                <h1 className="truncate text-2xl font-semibold tracking-tight">
                                    {title}
                                </h1>
                                {description && (
                                    <p className="mt-1 text-sm text-muted-foreground">
                                        {description}
                                    </p>
                                )}
                            </div>
                            {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
                        </div>

                        {children}
                    </div>
                </SidebarInset>
            </SidebarProvider>
        </>
    );
}
