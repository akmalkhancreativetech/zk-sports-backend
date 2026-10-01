import {
    FileTextIcon,
    FolderTreeIcon,
    GalleryHorizontalIcon,
    LayoutDashboardIcon,
    type LucideIcon,
    PackageIcon,
    SettingsIcon,
    TagIcon,
    WrenchIcon,
} from 'lucide-react';

import { routes } from '@/lib/routes';

export interface NavItem {
    title: string;
    href: string;
    icon: LucideIcon;
    /** Modules not built yet render disabled rather than as dead links. */
    ready?: boolean;
    /** Key of a shared Inertia prop rendered as a count badge. */
    badge?: 'newOrdersCount';
    children?: NavItem[];
}

export interface NavGroup {
    label: string;
    items: NavItem[];
}

export const navigation: NavGroup[] = [
    {
        label: 'Overview',
        items: [
            {
                title: 'Dashboard',
                href: routes.dashboard,
                icon: LayoutDashboardIcon,
                ready: true,
            },
        ],
    },
    {
        label: 'Content',
        items: [
            {
                title: 'Sliders',
                href: routes.sliders.index,
                icon: GalleryHorizontalIcon,
                ready: true,
            },
            {
                title: 'Services',
                href: routes.services.index,
                icon: WrenchIcon,
                ready: true,
            },
            {
                title: 'Blog',
                href: routes.blog.posts.index,
                icon: FileTextIcon,
                children: [
                    {
                        title: 'Posts',
                        href: routes.blog.posts.index,
                        icon: FileTextIcon,
                        ready: true,
                    },
                    {
                        title: 'Categories',
                        href: routes.blog.categories.index,
                        icon: FolderTreeIcon,
                        ready: true,
                    },
                    { title: 'Tags', href: routes.blog.tags.index, icon: TagIcon, ready: true },
                ],
            },
        ],
    },
    {
        label: 'Operations',
        items: [
            {
                title: 'Orders',
                href: routes.orders.index,
                icon: PackageIcon,
                badge: 'newOrdersCount',
                ready: true,
            },
            {
                title: 'Settings',
                href: routes.settings.index,
                icon: SettingsIcon,
                ready: true,
            },
        ],
    },
];

/**
 * Longest-prefix match, so `/admin/sliders/3/edit` still highlights Sliders
 * while `/admin` matches only itself.
 */
export function isActive(href: string, currentUrl: string): boolean {
    if (href === routes.dashboard) {
        return currentUrl === href;
    }

    return currentUrl === href || currentUrl.startsWith(`${href}/`);
}

export function breadcrumbsFor(currentUrl: string): NavItem[] {
    for (const group of navigation) {
        for (const item of group.items) {
            const child = item.children?.find((c) => isActive(c.href, currentUrl));

            if (child) {
                // A group whose own href is one of its children (Blog → Posts)
                // would otherwise crumb as "Blog › Posts" pointing at the same
                // URL twice — same link, and a duplicate React key.
                return item.href === child.href ? [child] : [item, child];
            }

            if (isActive(item.href, currentUrl)) {
                return [item];
            }
        }
    }

    return [];
}
