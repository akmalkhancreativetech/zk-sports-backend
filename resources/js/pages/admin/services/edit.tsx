import { ArrowLeftIcon } from 'lucide-react';
import type { PropsWithChildren } from 'react';

import { GalleryManager } from '@/components/admin/gallery-manager';
import { PriceTiersEditor } from '@/components/admin/price-tiers-editor';
import { ServiceForm } from '@/components/admin/service-form';
import { ServiceOptionsEditor } from '@/components/admin/service-options-editor';
import { LinkButton } from '@/components/link-button';
import AdminLayout from '@/layouts/admin-layout';
import { routes } from '@/lib/routes';
import type {
    EnumOption,
    Service,
    ServiceImage,
    ServiceOptionInput,
    ServicePriceTierInput,
} from '@/types/models';

interface Props {
    service: Service;
    images: ServiceImage[];
    options: ServiceOptionInput[];
    priceTiers: ServicePriceTierInput[];
    optionTypes: EnumOption[];
    categories: EnumOption[];
}

/**
 * A titled block inside a tab panel. Not a Card: the panel already sits in one
 * and nested cards are out. Each editor explains itself, so `description` is
 * only for what the editor does not already say.
 */
function Section({
    title,
    description,
    children,
}: PropsWithChildren<{ title: string; description?: string }>) {
    return (
        <section className="flex flex-col gap-4 border-t pt-6 first:border-t-0 first:pt-0">
            <div className="flex flex-col gap-1">
                <h2 className="font-medium">{title}</h2>
                {description && <p className="text-sm text-muted-foreground">{description}</p>}
            </div>
            {children}
        </section>
    );
}

export default function EditService({
    service,
    images,
    options,
    priceTiers,
    optionTypes,
    categories,
}: Props) {
    return (
        <AdminLayout
            title={service.title}
            description={`Slug: ${service.slug}`}
            actions={
                <LinkButton href={routes.services.index} variant="outline">
                    <ArrowLeftIcon className="size-4" />
                    Back to services
                </LinkButton>
            }
        >
            <ServiceForm
                service={service}
                categories={categories}
                extraTabs={[
                    {
                        value: 'options',
                        label: 'Options',
                        content: (
                            <div className="flex flex-col gap-6">
                                <Section title="Options">
                                    <ServiceOptionsEditor
                                        serviceId={service.id}
                                        options={options}
                                        optionTypes={optionTypes}
                                    />
                                </Section>

                                <Section title="Price tiers">
                                    <PriceTiersEditor
                                        serviceId={service.id}
                                        tiers={priceTiers}
                                        priceFrom={service.price_from}
                                        priceUnit={service.price_unit}
                                    />
                                </Section>

                                <Section
                                    title="Gallery"
                                    description="Shown on the service detail page. Alt text saves when you leave the field."
                                >
                                    <GalleryManager serviceId={service.id} images={images} />
                                </Section>
                            </div>
                        ),
                    },
                ]}
            />
        </AdminLayout>
    );
}
