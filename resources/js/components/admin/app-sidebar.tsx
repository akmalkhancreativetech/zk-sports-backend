import { Link, usePage } from '@inertiajs/react';
import { ChevronRightIcon, ShieldIcon } from 'lucide-react';

import { NavUser } from '@/components/admin/nav-user';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuBadge,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarMenuSub,
    SidebarMenuSubButton,
    SidebarMenuSubItem,
} from '@/components/ui/sidebar';
import { isActive, navigation, type NavItem } from '@/lib/nav';
import type { SharedProps } from '@/types/inertia';

function NavBadge({ item }: { item: NavItem }) {
    const { props } = usePage<SharedProps>();

    if (!item.badge) {
        return null;
    }

    const count = props[item.badge] ?? 0;

    if (count < 1) {
        return null;
    }

    return <SidebarMenuBadge>{count > 99 ? '99+' : count}</SidebarMenuBadge>;
}

/** Not-yet-built modules render inert with a marker instead of a dead link. */
function PendingItem({ item }: { item: NavItem }) {
    return (
        <SidebarMenuItem>
            <SidebarMenuButton
                disabled
                tooltip={`${item.title} — not built yet`}
                className="cursor-not-allowed opacity-50"
            >
                <item.icon />
                <span>{item.title}</span>
            </SidebarMenuButton>
            <SidebarMenuBadge className="text-[10px] tracking-wide uppercase peer-data-[size=default]/menu-button:top-1.5">
                Soon
            </SidebarMenuBadge>
        </SidebarMenuItem>
    );
}

function CollapsibleItem({ item, url }: { item: NavItem; url: string }) {
    const active = isActive(item.href, url);

    return (
        <Collapsible defaultOpen={active} render={<SidebarMenuItem />} className="group/collapsible">
            <CollapsibleTrigger
                render={
                    <SidebarMenuButton tooltip={item.title} isActive={active}>
                        <item.icon />
                        <span>{item.title}</span>
                        <ChevronRightIcon className="ml-auto transition-transform duration-200 group-data-open/collapsible:rotate-90" />
                    </SidebarMenuButton>
                }
            />
            <CollapsibleContent>
                <SidebarMenuSub>
                    {item.children?.map((child) => (
                        <SidebarMenuSubItem key={child.href}>
                            {child.ready ? (
                                <SidebarMenuSubButton
                                    isActive={isActive(child.href, url)}
                                    render={<Link href={child.href} prefetch />}
                                >
                                    <span>{child.title}</span>
                                </SidebarMenuSubButton>
                            ) : (
                                <SidebarMenuSubButton
                                    aria-disabled
                                    className="cursor-not-allowed opacity-50"
                                >
                                    <span>{child.title}</span>
                                </SidebarMenuSubButton>
                            )}
                        </SidebarMenuSubItem>
                    ))}
                </SidebarMenuSub>
            </CollapsibleContent>
        </Collapsible>
    );
}

export function AppSidebar() {
    const { url } = usePage();

    return (
        // Default variant, not `inset`: inset adds margin, rounded corners and a
        // shadow around the content, which stops it sitting flush and full width.
        // The header's SidebarTrigger is the only collapse control — no rail.
        <Sidebar collapsible="icon">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" render={<Link href="/admin" />}>
                            <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                                <ShieldIcon className="size-4" />
                            </div>
                            <div className="grid flex-1 text-left leading-tight">
                                <span className="truncate font-semibold">ZK Sports</span>
                                <span className="truncate text-xs text-muted-foreground">
                                    Admin panel
                                </span>
                            </div>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                {navigation.map((group) => (
                    <SidebarGroup key={group.label}>
                        <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
                        <SidebarMenu>
                            {group.items.map((item) => {
                                if (item.children) {
                                    return <CollapsibleItem key={item.title} item={item} url={url} />;
                                }

                                if (!item.ready) {
                                    return <PendingItem key={item.title} item={item} />;
                                }

                                return (
                                    <SidebarMenuItem key={item.title}>
                                        <SidebarMenuButton
                                            tooltip={item.title}
                                            isActive={isActive(item.href, url)}
                                            render={<Link href={item.href} prefetch />}
                                        >
                                            <item.icon />
                                            <span>{item.title}</span>
                                        </SidebarMenuButton>
                                        <NavBadge item={item} />
                                    </SidebarMenuItem>
                                );
                            })}
                        </SidebarMenu>
                    </SidebarGroup>
                ))}
            </SidebarContent>

            <SidebarFooter>
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
