import { ArrowLeftIcon } from 'lucide-react';

import { SliderForm } from '@/components/admin/slider-form';
import { LinkButton } from '@/components/link-button';
import AdminLayout from '@/layouts/admin-layout';
import { Card, CardContent } from '@/components/ui/card';
import { routes } from '@/lib/routes';
import type { EnumOption } from '@/types/models';

export default function CreateSlider({ transitions }: { transitions: EnumOption[] }) {
    return (
        <AdminLayout
            title="New slider"
            description="Create the slider first, then add its slides."
            actions={
                <LinkButton href={routes.sliders.index} variant="outline">
                    <ArrowLeftIcon className="size-4" />
                    Back to sliders
                </LinkButton>
            }
        >
            <Card>
                <CardContent>
                    <SliderForm transitions={transitions} action={routes.sliders.store} />
                </CardContent>
            </Card>
        </AdminLayout>
    );
}
