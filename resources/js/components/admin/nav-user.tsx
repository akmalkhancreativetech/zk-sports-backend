import { router, usePage } from '@inertiajs/react';
import { useTheme } from 'next-themes';
import {
    ChevronsUpDownIcon,
    LogOutIcon,
    MonitorIcon,
    MoonIcon,
    SunIcon,
    UserIcon,
} from 'lucide-react';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from '@/components/ui/sidebar';
import { routes } from '@/lib/routes';
import type { SharedProps } from '@/types/inertia';

function initials(name: string): string {
    return name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join('');
}

export function NavUser() {
    const { auth } = usePage<SharedProps>().props;
    const { isMobile } = useSidebar();
    const { theme, setTheme } = useTheme();

    if (!auth.user) {
        return null;
    }

    const { user } = auth;

    return (
        <SidebarMenu>
            <SidebarMenuItem>
                <DropdownMenu>
                    <DropdownMenuTrigger
                        render={
                            <SidebarMenuButton
                                size="lg"
                                className="data-[popup-open]:bg-sidebar-accent data-[popup-open]:text-sidebar-accent-foreground"
                            >
                                <Avatar className="size-8 rounded-lg">
                                    <AvatarFallback className="rounded-lg">
                                        {initials(user.name)}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="grid flex-1 text-left leading-tight">
                                    <span className="truncate font-medium">{user.name}</span>
                                    <span className="truncate text-xs text-muted-foreground">
                                        {user.email}
                                    </span>
                                </div>
                                <ChevronsUpDownIcon className="ml-auto size-4" />
                            </SidebarMenuButton>
                        }
                    />
                    <DropdownMenuContent
                        className="w-(--anchor-width) min-w-56"
                        side={isMobile ? 'bottom' : 'right'}
                        align="end"
                        sideOffset={4}
                    >
                        {/* Base UI requires GroupLabel to sit inside a Group or RadioGroup. */}
                        <DropdownMenuGroup>
                            <DropdownMenuLabel>
                                <div className="grid leading-tight">
                                    <span className="truncate font-medium text-foreground">
                                        {user.name}
                                    </span>
                                    <span className="truncate text-xs font-normal capitalize">
                                        {user.role}
                                    </span>
                                </div>
                            </DropdownMenuLabel>
                        </DropdownMenuGroup>

                        <DropdownMenuSeparator />

                        <DropdownMenuGroup>
                            <DropdownMenuItem disabled>
                                <UserIcon />
                                Profile settings
                            </DropdownMenuItem>
                        </DropdownMenuGroup>

                        <DropdownMenuSeparator />

                        <DropdownMenuRadioGroup
                            value={theme ?? 'system'}
                            onValueChange={(value) => setTheme(String(value))}
                        >
                            <DropdownMenuLabel>Appearance</DropdownMenuLabel>
                            <DropdownMenuRadioItem value="light">
                                <SunIcon />
                                Light
                            </DropdownMenuRadioItem>
                            <DropdownMenuRadioItem value="dark">
                                <MoonIcon />
                                Dark
                            </DropdownMenuRadioItem>
                            <DropdownMenuRadioItem value="system">
                                <MonitorIcon />
                                System
                            </DropdownMenuRadioItem>
                        </DropdownMenuRadioGroup>

                        <DropdownMenuSeparator />

                        <DropdownMenuItem
                            variant="destructive"
                            onClick={() => router.post(routes.auth.logout)}
                        >
                            <LogOutIcon />
                            Sign out
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </SidebarMenuItem>
        </SidebarMenu>
    );
}
