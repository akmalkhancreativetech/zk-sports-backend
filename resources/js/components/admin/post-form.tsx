import { useForm } from '@inertiajs/react';
import { useState } from 'react';

import { Combobox, type ComboboxOption } from '@/components/admin/combobox';
import { DateTimePicker } from '@/components/admin/date-time-picker';
import { ImageUploader } from '@/components/admin/image-uploader';
import { MultiCombobox } from '@/components/admin/multi-combobox';
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
import type { BlogPost, EnumOption, PostStatus } from '@/types/models';

interface Props {
    post?: BlogPost;
    categories: EnumOption[];
    tags: EnumOption[];
}

const NO_CATEGORY = '__none__';

const statusOptions: ComboboxOption[] = [
    { value: 'draft', label: 'Draft' },
    { value: 'published', label: 'Published' },
];

export function PostForm({ post, categories, tags }: Props) {
    const form = useForm<{
        category_id: string | null;
        title: string;
        slug: string;
        excerpt: string;
        body: string;
        featured_image: File | null;
        featured_image_alt: string;
        og_image: File | null;
        status: PostStatus;
        published_at: string;
        tags: string[];
        is_featured: boolean;
        meta_title: string;
        meta_description: string;
    }>({
        category_id: post?.category_id ?? null,
        title: post?.title ?? '',
        slug: post?.slug ?? '',
        excerpt: post?.excerpt ?? '',
        body: post?.body ?? '',
        featured_image: null,
        featured_image_alt: post?.featured_image_alt ?? '',
        og_image: null,
        status: post?.status ?? 'draft',
        published_at: post?.published_at ?? '',
        tags: post?.tags ?? [],
        is_featured: post?.is_featured ?? false,
        meta_title: post?.meta_title ?? '',
        meta_description: post?.meta_description ?? '',
    });

    const { data, setData, processing, errors, isDirty } = form;

    const categoryOptions: ComboboxOption[] = [
        { value: NO_CATEGORY, label: 'Uncategorised' },
        ...categories,
    ];

    // The slug auto-derives from the title until edited by hand.
    const [slugLocked, setSlugLocked] = useState(Boolean(post));

    const scheduled =
        data.status === 'published' &&
        data.published_at !== '' &&
        new Date(data.published_at) > new Date();

    const submit = (event: React.FormEvent) => {
        event.preventDefault();

        const options = {
            preserveScroll: true,
            forceFormData: true,
            ...formErrorToast(),
        };

        if (post) {
            // Multipart cannot carry PUT, so method spoofing applies.
            form.transform((payload) => ({ ...payload, _method: 'put' }));
            form.post(routes.blog.posts.update(post.id), options);
        } else {
            form.transform((payload) => payload);
            form.post(routes.blog.posts.store, options);
        }
    };

    const tabHasError = (fields: string[]) =>
        fields.some((field) => Boolean(errors[field as keyof typeof errors]));

    return (
        <form onSubmit={submit}>
            {/* The sticky bars sit outside Card deliberately: Card is
                `overflow-hidden`, which makes it a scroll container and kills
                `position: sticky` for anything nested inside it. */}
            <Tabs defaultValue="content" className="gap-0">
                <div className="sticky top-16 z-20 -mx-4 border-b bg-background/95 px-4 backdrop-blur-sm md:-mx-6 md:px-6">
                    <TabsList variant="line" className="h-11 gap-6">
                        <TabsTrigger value="content">
                            Content
                            {tabHasError(['title', 'slug', 'excerpt', 'body']) && (
                                <span className="text-destructive" aria-label="has errors">
                                    *
                                </span>
                            )}
                        </TabsTrigger>
                        <TabsTrigger value="publishing">
                            Publishing
                            {tabHasError(['status', 'published_at', 'category_id', 'tags']) && (
                                <span className="text-destructive" aria-label="has errors">
                                    *
                                </span>
                            )}
                        </TabsTrigger>
                        <TabsTrigger value="media">
                            Media
                            {tabHasError(['featured_image', 'featured_image_alt']) && (
                                <span className="text-destructive" aria-label="has errors">
                                    *
                                </span>
                            )}
                        </TabsTrigger>
                        <TabsTrigger value="seo">
                            SEO
                            {tabHasError(['meta_title', 'meta_description', 'og_image']) && (
                                <span className="text-destructive" aria-label="has errors">
                                    *
                                </span>
                            )}
                        </TabsTrigger>
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
                                <Label htmlFor="body">Body</Label>
                                <Textarea
                                    id="body"
                                    rows={18}
                                    className="font-mono text-sm"
                                    value={data.body}
                                    onChange={(event) => setData('body', event.target.value)}
                                />
                                <p className="text-xs text-muted-foreground">
                                    Markdown. The public site renders it.
                                </p>
                                {errors.body && (
                                    <p className="text-sm text-destructive">{errors.body}</p>
                                )}
                            </div>
                        </TabsContent>

                        <TabsContent value="publishing" className="flex flex-col gap-5">
                            <div className="grid gap-5 sm:grid-cols-2">
                                <div className="flex flex-col gap-2">
                                    <Label htmlFor="status">Status</Label>
                                    <Combobox
                                        id="status"
                                        value={data.status}
                                        options={statusOptions}
                                        onChange={(value) =>
                                            setData('status', value as PostStatus)
                                        }
                                        searchPlaceholder="Search statuses…"
                                        invalid={Boolean(errors.status)}
                                    />
                                    {errors.status && (
                                        <p className="text-sm text-destructive">{errors.status}</p>
                                    )}
                                </div>

                                <div className="flex flex-col gap-2">
                                    <Label htmlFor="published_at">Publish date</Label>
                                    <DateTimePicker
                                        id="published_at"
                                        value={data.published_at}
                                        onChange={(value) => setData('published_at', value)}
                                        placeholder="Stamp now on publish"
                                        invalid={Boolean(errors.published_at)}
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        {scheduled
                                            ? 'In the future — the post stays hidden until then.'
                                            : 'Leave blank to stamp now on publish.'}
                                    </p>
                                    {errors.published_at && (
                                        <p className="text-sm text-destructive">
                                            {errors.published_at}
                                        </p>
                                    )}
                                </div>
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
                                    <Label htmlFor="tags">Tags</Label>
                                    <MultiCombobox
                                        id="tags"
                                        value={data.tags}
                                        options={tags}
                                        onChange={(value) => setData('tags', value)}
                                        placeholder="No tags"
                                        searchPlaceholder="Search tags…"
                                        emptyMessage="No tag matches."
                                        invalid={Boolean(errors.tags)}
                                    />
                                    {errors.tags && (
                                        <p className="text-sm text-destructive">{errors.tags}</p>
                                    )}
                                </div>
                            </div>

                            <SwitchField
                                id="is_featured"
                                label="Featured"
                                description="Highlighted on the blog index."
                                checked={data.is_featured}
                                onCheckedChange={(checked) => setData('is_featured', checked)}
                                tone="info"
                            />

                            {post?.author && (
                                <p className="text-sm text-muted-foreground">
                                    Written by {post.author}.
                                </p>
                            )}
                        </TabsContent>

                        <TabsContent value="media" className="flex flex-col gap-5">
                            <ImageUploader
                                id="featured_image"
                                label="Featured image"
                                hint="1200×800"
                                currentUrl={post?.featured_image_url}
                                file={data.featured_image}
                                onChange={(file) => setData('featured_image', file)}
                                error={errors.featured_image}
                            />

                            <AuthField
                                id="featured_image_alt"
                                label="Alt text"
                                value={data.featured_image_alt}
                                error={errors.featured_image_alt}
                                hint="Required once an image is set. Describe it for screen readers."
                                onChange={(event) =>
                                    setData('featured_image_alt', event.target.value)
                                }
                            />
                        </TabsContent>

                        <TabsContent value="seo" className="flex flex-col gap-5">
                            <AuthField
                                id="meta_title"
                                label="Meta title"
                                value={data.meta_title}
                                error={errors.meta_title}
                                hint="Falls back to the post title."
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
                                currentUrl={post?.og_image_url}
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
                    </CardContent>
                </Card>
            </Tabs>

            <div className="sticky bottom-0 z-20 -mx-4 mt-6 flex items-center justify-between gap-3 border-t bg-background/95 px-4 py-3 backdrop-blur-sm md:-mx-6 md:px-6">
                <p className="min-w-0 truncate text-sm text-muted-foreground" aria-live="polite">
                    {processing
                        ? 'Saving…'
                        : isDirty
                          ? 'Unsaved changes'
                          : post
                            ? 'All changes saved'
                            : ''}
                </p>
                <div className="flex shrink-0 items-center gap-2">
                    <LinkButton href={routes.blog.posts.index} variant="outline">
                        Cancel
                    </LinkButton>
                    <Button type="submit" disabled={processing}>
                        {processing ? 'Saving…' : post ? 'Save changes' : 'Create post'}
                    </Button>
                </div>
            </div>
        </form>
    );
}
