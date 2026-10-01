import { useForm } from '@inertiajs/react';
import { type ReactNode, useState } from 'react';

import { Combobox, type ComboboxOption } from '@/components/admin/combobox';
import { ImageUploader } from '@/components/admin/image-uploader';
import {
    ServiceIcon,
    serviceIconLabel,
    serviceIconNames,
} from '@/components/admin/service-icons';
import { SerpPreview } from '@/components/admin/serp-preview';
import { SwitchField } from '@/components/admin/switch-field';
import { AuthField } from '@/components/auth/auth-field';
import { LinkButton } from '@/components/link-button';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { formErrorToast } from '@/lib/form-feedback';
import { routes } from '@/lib/routes';
import type { EnumOption, Service } from '@/types/models';

export interface ServiceFormTab {
    value: string;
    label: string;
    /**
     * Rendered inside the service form element, so it must not contain a
     * `<form>` and its buttons must be `type="button"` — these sections save
     * to their own endpoints.
     */
    content: ReactNode;
}

interface Props {
    service?: Service;
    categories: EnumOption[];
    /** Saved-service sections that join the tab strip, e.g. Options. */
    extraTabs?: ServiceFormTab[];
}

const NO_CATEGORY = '__none__';
const NO_ICON = '__no_icon__';

/** A curated, statically imported set — see `service-icons` for why. */
const iconOptions: ComboboxOption[] = [
    {
        value: NO_ICON,
        label: 'No icon',
        // An empty tile keeps this row's label aligned with the icon rows.
        icon: <span className="size-6 shrink-0 rounded-md border border-dashed" />,
    },
    ...serviceIconNames.map((name) => ({
        value: name,
        label: serviceIconLabel(name),
        icon: (
            <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-muted text-foreground">
                <ServiceIcon name={name} className="size-3.5" />
            </span>
        ),
    })),
];

export function ServiceForm({ service, categories, extraTabs = [] }: Props) {
    const form = useForm<{
        category_id: string | null;
        title: string;
        slug: string;
        excerpt: string;
        description: string;
        icon: string;
        featured_image: File | null;
        og_image: File | null;
        price_from: string;
        price_unit: string;
        min_order_quantity: string;
        is_featured: boolean;
        is_active: boolean;
        meta_title: string;
        meta_description: string;
    }>({
        category_id: service?.category_id ?? null,
        title: service?.title ?? '',
        slug: service?.slug ?? '',
        excerpt: service?.excerpt ?? '',
        description: service?.description ?? '',
        icon: service?.icon ?? '',
        featured_image: null,
        og_image: null,
        price_from: service?.price_from ?? '',
        price_unit: service?.price_unit ?? '',
        min_order_quantity: service?.min_order_quantity?.toString() ?? '',
        is_featured: service?.is_featured ?? false,
        is_active: service?.is_active ?? true,
        meta_title: service?.meta_title ?? '',
        meta_description: service?.meta_description ?? '',
    });

    const { data, setData, processing, errors, isDirty } = form;

    const categoryOptions: ComboboxOption[] = [
        { value: NO_CATEGORY, label: 'Uncategorised' },
        ...categories,
    ];

    // A service saved before this list was curated may hold a name that is no
    // longer offered. Keep it selectable so editing the service does not
    // quietly drop its icon.
    const currentIconMissing =
        Boolean(data.icon) && !serviceIconNames.includes(data.icon);

    const iconChoices = currentIconMissing
        ? [...iconOptions, { value: data.icon, label: `${data.icon} (current)` }]
        : iconOptions;

    // The slug auto-derives from the title until edited by hand.
    const [slugLocked, setSlugLocked] = useState(Boolean(service));

    // Tracked so the footer can step aside on tabs that save themselves.
    const [tab, setTab] = useState('content');
    const onExtraTab = extraTabs.some((extra) => extra.value === tab);

    const submit = (event: React.FormEvent) => {
        event.preventDefault();

        const options = {
            preserveScroll: true,
            forceFormData: true,
            ...formErrorToast(),
        };

        if (service) {
            // Multipart cannot carry PUT, so method spoofing applies.
            form.transform((payload) => ({ ...payload, _method: 'put' }));
            form.post(routes.services.update(service.id), options);
        } else {
            form.transform((payload) => payload);
            form.post(routes.services.store, options);
        }
    };

    // Any tab can hold an invalid field, so mark which ones do.
    const tabHasError = (fields: string[]) =>
        fields.some((field) => Boolean(errors[field as keyof typeof errors]));

    return (
        <form onSubmit={submit}>
            {/* The sticky bars sit outside Card deliberately: Card is
                `overflow-hidden`, which makes it a scroll container and kills
                `position: sticky` for anything nested inside it. */}
            <Tabs
                value={tab}
                onValueChange={(value) => setTab(String(value))}
                className="gap-0"
            >
                <div className="sticky top-16 z-20 -mx-4 border-b bg-background/95 px-4 backdrop-blur-sm md:-mx-6 md:px-6">
                    <TabsList variant="line" className="h-11 gap-6">
                        <TabsTrigger value="content">
                            Content
                            {tabHasError(['title', 'slug', 'excerpt', 'description', 'icon']) && (
                                <span className="text-destructive" aria-label="has errors">
                                    *
                                </span>
                            )}
                        </TabsTrigger>
                        <TabsTrigger value="media">Media</TabsTrigger>
                        <TabsTrigger value="pricing">
                            Pricing
                            {tabHasError(['price_from', 'price_unit']) && (
                                <span className="text-destructive" aria-label="has errors">
                                    *
                                </span>
                            )}
                        </TabsTrigger>
                        <TabsTrigger value="seo">
                            SEO
                            {tabHasError(['meta_title', 'meta_description']) && (
                                <span className="text-destructive" aria-label="has errors">
                                    *
                                </span>
                            )}
                        </TabsTrigger>

                        {extraTabs.map((extra) => (
                            <TabsTrigger key={extra.value} value={extra.value}>
                                {extra.label}
                            </TabsTrigger>
                        ))}
                    </TabsList>
                </div>

                <Card className="mt-6">
                    <CardContent className="py-2">
                        <TabsContent value="content" className="flex flex-col gap-5">
                            <div className="grid gap-5 sm:grid-cols-2">
                                <AuthField
                                    id="title"
                                    label="Title"
                                    value={data.title}
                                    error={errors.title}
                                    required
                                    onChange={(event) => {
                                        const title = event.target.value;
                                        setData((current) => ({
                                            ...current,
                                            title,
                                            slug: slugLocked
                                                ? current.slug
                                                : title
                                                      .toLowerCase()
                                                      .replace(/[^a-z0-9]+/g, '-')
                                                      .replace(/^-+|-+$/g, ''),
                                        }));
                                    }}
                                />

                                <AuthField
                                    id="slug"
                                    label="Slug"
                                    value={data.slug}
                                    error={errors.slug}
                                    hint="Used in the public URL. Lowercased on save."
                                    onChange={(event) => {
                                        setSlugLocked(true);
                                        setData('slug', event.target.value);
                                    }}
                                />
                            </div>

                            <div className="grid gap-5 sm:grid-cols-2">
                                <div className="flex flex-col gap-2">
                                    <Label htmlFor="category_id">Category</Label>
                                    <Combobox
                                        id="category_id"
                                        value={data.category_id ?? NO_CATEGORY}
                                        options={categoryOptions}
                                        onChange={(value) =>
                                            setData(
                                                'category_id',
                                                value === NO_CATEGORY ? null : value,
                                            )
                                        }
                                        searchPlaceholder="Search categories…"
                                        emptyMessage="No category matches."
                                        invalid={Boolean(errors.category_id)}
                                    />
                                    {errors.category_id && (
                                        <p className="text-sm text-destructive">
                                            {errors.category_id}
                                        </p>
                                    )}
                                </div>

                                <div className="flex flex-col gap-2">
                                    <Label htmlFor="icon">Icon</Label>
                                    <Combobox
                                        id="icon"
                                        value={data.icon}
                                        options={iconChoices}
                                        onChange={(value) =>
                                            setData('icon', value === NO_ICON ? '' : value)
                                        }
                                        placeholder="No icon"
                                        searchPlaceholder="Search icons…"
                                        emptyMessage="No icon matches."
                                        invalid={Boolean(errors.icon)}
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Search by what it shows, e.g. delivery.
                                    </p>
                                    {errors.icon && (
                                        <p className="text-sm text-destructive">{errors.icon}</p>
                                    )}
                                </div>
                            </div>

                            <div className="flex flex-col gap-2">
                                <Label htmlFor="excerpt">Excerpt</Label>
                                <Textarea
                                    id="excerpt"
                                    rows={2}
                                    maxLength={300}
                                    value={data.excerpt}
                                    onChange={(event) => setData('excerpt', event.target.value)}
                                />
                                <p className="text-xs text-muted-foreground">
                                    Shown on cards and listings. {data.excerpt.length}/300
                                </p>
                                {errors.excerpt && (
                                    <p className="text-sm text-destructive">{errors.excerpt}</p>
                                )}
                            </div>

                            <div className="flex flex-col gap-2">
                                <Label htmlFor="description">Description</Label>
                                <Textarea
                                    id="description"
                                    rows={8}
                                    value={data.description}
                                    onChange={(event) => setData('description', event.target.value)}
                                />
                                {errors.description && (
                                    <p className="text-sm text-destructive">{errors.description}</p>
                                )}
                            </div>

                            <div className="grid gap-4 sm:grid-cols-2">
                                <SwitchField
                                    id="is_active"
                                    label="Active"
                                    description="Inactive services are hidden from the public site."
                                    checked={data.is_active}
                                    onCheckedChange={(checked) => setData('is_active', checked)}
                                    tone="success"
                                />
                                <SwitchField
                                    id="is_featured"
                                    label="Featured"
                                    description="Highlighted on the home page and listings."
                                    checked={data.is_featured}
                                    onCheckedChange={(checked) => setData('is_featured', checked)}
                                    tone="info"
                                />
                            </div>
                        </TabsContent>

                        <TabsContent value="media" className="flex flex-col gap-5">
                            <ImageUploader
                                id="featured_image"
                                label="Featured image"
                                hint="1200×800"
                                currentUrl={service?.featured_image_url}
                                file={data.featured_image}
                                onChange={(file) => setData('featured_image', file)}
                                error={errors.featured_image}
                            />
                            <p className="text-sm text-muted-foreground">
                                Gallery images are managed below, once the service is saved.
                            </p>
                        </TabsContent>

                        <TabsContent value="pricing" className="flex flex-col gap-5">
                            <div className="grid gap-5 sm:grid-cols-2">
                                <AuthField
                                    id="price_from"
                                    label="Price from"
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={data.price_from}
                                    error={errors.price_from}
                                    hint="Leave blank for “on request”."
                                    onChange={(event) => setData('price_from', event.target.value)}
                                />
                                <AuthField
                                    id="price_unit"
                                    label="Price unit"
                                    value={data.price_unit}
                                    error={errors.price_unit}
                                    hint="e.g. per kit, per 1000"
                                    onChange={(event) => setData('price_unit', event.target.value)}
                                />
                            </div>

                            <AuthField
                                id="min_order_quantity"
                                label="Minimum order quantity"
                                type="number"
                                min="1"
                                className="sm:max-w-48"
                                value={data.min_order_quantity}
                                error={errors.min_order_quantity}
                                hint="Leave blank for no minimum."
                                onChange={(event) =>
                                    setData('min_order_quantity', event.target.value)
                                }
                            />

                            {service && (
                                <p className="text-sm text-muted-foreground">
                                    Quantity break pricing is managed below, under Price tiers.
                                </p>
                            )}
                        </TabsContent>

                        <TabsContent value="seo" className="flex flex-col gap-5">
                            <AuthField
                                id="meta_title"
                                label="Meta title"
                                value={data.meta_title}
                                error={errors.meta_title}
                                hint="Falls back to the service title."
                                onChange={(event) => setData('meta_title', event.target.value)}
                            />

                            <div className="flex flex-col gap-2">
                                <Label htmlFor="meta_description">Meta description</Label>
                                <Textarea
                                    id="meta_description"
                                    rows={3}
                                    maxLength={320}
                                    value={data.meta_description}
                                    onChange={(event) =>
                                        setData('meta_description', event.target.value)
                                    }
                                />
                                {errors.meta_description && (
                                    <p className="text-sm text-destructive">
                                        {errors.meta_description}
                                    </p>
                                )}
                            </div>

                            <ImageUploader
                                id="og_image"
                                label="Social share image"
                                hint="1200×630"
                                currentUrl={service?.og_image_url}
                                file={data.og_image}
                                onChange={(file) => setData('og_image', file)}
                                error={errors.og_image}
                            />

                            <div className="flex flex-col gap-2">
                                <Label>Search result preview</Label>
                                <SerpPreview
                                    metaTitle={data.meta_title}
                                    metaDescription={data.meta_description}
                                    fallbackTitle={data.title}
                                    fallbackDescription={data.excerpt}
                                    slug={data.slug}
                                />
                            </div>
                        </TabsContent>

                        {extraTabs.map((extra) => (
                            <TabsContent key={extra.value} value={extra.value}>
                                {extra.content}
                            </TabsContent>
                        ))}
                    </CardContent>
                </Card>
            </Tabs>

            {/* Hidden on tabs that save to their own endpoint: two save
                buttons meaning different things is worse than none. */}
            {!onExtraTab && (
                <div className="sticky bottom-0 z-20 -mx-4 mt-6 flex items-center justify-between gap-3 border-t bg-background/95 px-4 py-3 backdrop-blur-sm md:-mx-6 md:px-6">
                    <p
                        className="min-w-0 truncate text-sm text-muted-foreground"
                        aria-live="polite"
                    >
                        {processing
                            ? 'Saving…'
                            : isDirty
                              ? 'Unsaved changes'
                              : service
                                ? 'All changes saved'
                                : ''}
                    </p>
                    <div className="flex shrink-0 items-center gap-2">
                        <LinkButton href={routes.services.index} variant="outline">
                            Cancel
                        </LinkButton>
                        <Button type="submit" disabled={processing}>
                            {processing ? 'Saving…' : service ? 'Save changes' : 'Create service'}
                        </Button>
                    </div>
                </div>
            )}
        </form>
    );
}
