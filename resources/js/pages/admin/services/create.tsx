import { ArrowLeftIcon } from 'lucide-react';

import { ServiceForm } from '@/components/admin/service-form';
import { LinkButton } from '@/components/link-button';
import AdminLayout from '@/layouts/admin-layout';
import { routes } from '@/lib/routes';
import type { EnumOption } from '@/types/models';

export default function CreateService({ categories }: { categories: EnumOption[] }) {
    return (
        <AdminLayout
            title="New service"
            description="Save the service first, then add its gallery."
            actions={
                <LinkButton href={routes.services.index} variant="outline">
                    <ArrowLeftIcon className="size-4" />
                    Back to services
                </LinkButton>
            }
        >
            <ServiceForm categories={categories} />
        </AdminLayout>
    );
}
