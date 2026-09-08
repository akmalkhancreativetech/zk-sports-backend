import { usePage } from '@inertiajs/react';
import { CheckIcon, CircleDashedIcon } from 'lucide-react';

import AdminLayout from '@/layouts/admin-layout';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import type { SharedProps } from '@/types/inertia';

/** Counts arrive with each module; Phase 5 owns the real widgets (plan.md §9). */
const modules = [
    { label: 'Sliders', phase: 'Phase 1' },
    { label: 'Services', phase: 'Phase 2' },
    { label: 'Blog posts', phase: 'Phase 3' },
    { label: 'Orders', phase: 'Phase 4' },
];

const phases = [
    { name: 'Auth, roles, admin shell', done: true },
    { name: 'Sliders and slides', done: false },
    { name: 'Service categories and services', done: false },
    { name: 'Blog with SEO panel', done: false },
    { name: 'Orders and status workflow', done: false },
];

export default function Dashboard() {
    const { auth } = usePage<SharedProps>().props;

    return (
        <AdminLayout
            title="Dashboard"
            description={`Signed in as ${auth.user?.name}.`}
            actions={
                <Badge variant="outline" className="capitalize">
                    {auth.user?.role}
                </Badge>
            }
        >
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {modules.map((module) => (
                    <Card key={module.label}>
                        <CardHeader>
                            <CardDescription>{module.label}</CardDescription>
                            <CardTitle className="text-3xl font-semibold text-muted-foreground tabular-nums">
                                &mdash;
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-xs text-muted-foreground">
                                Not built yet &middot; {module.phase}
                            </p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle>Build progress</CardTitle>
                        <CardDescription>Phases from plan.md §9.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {phases.map((phase, index) => (
                            <div key={phase.name}>
                                {index > 0 && <Separator />}
                                <div className="flex items-center gap-3 py-3">
                                    {phase.done ? (
                                        <CheckIcon className="size-4 shrink-0 text-emerald-600 dark:text-emerald-500" />
                                    ) : (
                                        <CircleDashedIcon className="size-4 shrink-0 text-muted-foreground" />
                                    )}
                                    <span
                                        className={
                                            phase.done ? 'text-sm' : 'text-sm text-muted-foreground'
                                        }
                                    >
                                        {phase.name}
                                    </span>
                                    {phase.done && (
                                        <Badge variant="secondary" className="ml-auto">
                                            Done
                                        </Badge>
                                    )}
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Your access</CardTitle>
                        <CardDescription>Resolved from the role gates.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-3 text-sm">
                        <div className="flex items-center justify-between gap-2">
                            <span className="text-muted-foreground">Role</span>
                            <Badge variant="secondary" className="capitalize">
                                {auth.user?.role}
                            </Badge>
                        </div>
                        <Separator />
                        <div className="flex items-center justify-between gap-2">
                            <span className="text-muted-foreground">Admin panel</span>
                            <span>Full access</span>
                        </div>
                        <Separator />
                        <div className="flex items-center justify-between gap-2">
                            <span className="text-muted-foreground">Manage users</span>
                            <span>{auth.user?.role === 'admin' ? 'Yes' : 'No'}</span>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </AdminLayout>
    );
}
