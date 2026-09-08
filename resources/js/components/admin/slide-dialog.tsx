import { useForm } from '@inertiajs/react';
import { ChevronDownIcon, Settings2Icon } from 'lucide-react';
import { useEffect } from 'react';

import { ImageUploader } from '@/components/admin/image-uploader';
import { SwitchField } from '@/components/admin/switch-field';
import { Button } from '@/components/ui/button';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { routes } from '@/lib/routes';
import type { EnumOption, Slide, SlideTextPosition } from '@/types/models';

interface Props {
    sliderId: number;
    /** null = closed; a Slide = edit; 'new' = create. */
    editing: Slide | 'new' | null;
    onClose: () => void;
    textPositions: EnumOption[];
}

/** Trim an ISO string down to what datetime-local accepts. */
function toLocalInput(iso: string | null): string {
    return iso ? iso.slice(0, 16) : '';
}

/** Defaults for the folded-away fields, so a new slide never needs them. */
const DEFAULTS = {
    text_position: 'left' as SlideTextPosition,
    overlay_opacity: 40,
    cta_new_tab: false,
    body: '',
    starts_at: '',
    ends_at: '',
};

export function SlideDialog({ sliderId, editing, onClose, textPositions }: Props) {
    const slide = editing === 'new' || editing === null ? null : editing;

    // Open the advanced section when this slide already departs from the
    // defaults, so nothing is hidden from the person editing it.
    const hasAdvanced = Boolean(
        slide &&
            (slide.body ||
                slide.starts_at ||
                slide.ends_at ||
                slide.cta_new_tab ||
                slide.text_position !== DEFAULTS.text_position ||
                slide.overlay_opacity !== DEFAULTS.overlay_opacity),
    );

    const form = useForm<{
        title: string;
        subtitle: string;
        body: string;
        image: File | null;
        mobile_image: File | null;
        image_alt: string;
        cta_label: string;
        cta_url: string;
        cta_new_tab: boolean;
        text_position: SlideTextPosition;
        overlay_opacity: number;
        is_active: boolean;
        starts_at: string;
        ends_at: string;
    }>({
        title: '',
        subtitle: '',
        image: null,
        mobile_image: null,
        image_alt: '',
        cta_label: '',
        cta_url: '',
        is_active: true,
        ...DEFAULTS,
    });

    const { data, setData, errors, processing, reset, clearErrors } = form;

    // Reload the form whenever a different slide is opened.
    useEffect(() => {
        if (editing === null) {
            return;
        }

        clearErrors();

        setData({
            title: slide?.title ?? '',
            subtitle: slide?.subtitle ?? '',
            body: slide?.body ?? DEFAULTS.body,
            image: null,
            mobile_image: null,
            image_alt: slide?.image_alt ?? '',
            cta_label: slide?.cta_label ?? '',
            cta_url: slide?.cta_url ?? '',
            cta_new_tab: slide?.cta_new_tab ?? DEFAULTS.cta_new_tab,
            text_position: slide?.text_position ?? DEFAULTS.text_position,
            overlay_opacity: slide?.overlay_opacity ?? DEFAULTS.overlay_opacity,
            is_active: slide?.is_active ?? true,
            starts_at: toLocalInput(slide?.starts_at ?? null),
            ends_at: toLocalInput(slide?.ends_at ?? null),
        });
    }, [editing]);

    const submit = (event: React.FormEvent) => {
        event.preventDefault();

        const options = {
            preserveScroll: true,
            forceFormData: true,
            onSuccess: () => {
                reset();
                onClose();
            },
        } as const;

        if (slide) {
            // Multipart cannot carry PUT, so Laravel's method spoofing applies.
            // transform() returns void and persists, so set it on every submit.
            form.transform((payload) => ({ ...payload, _method: 'put' }));
            form.post(routes.sliders.slides.update(sliderId, slide.id), options);
        } else {
            form.transform((payload) => payload);
            form.post(routes.sliders.slides.store(sliderId), options);
        }
    };

    return (
        <Dialog open={editing !== null} onOpenChange={(open) => !open && onClose()}>
            {/* `flex` overrides DialogContent's default grid so the form can own
                the scroll; capped at 90dvh so the header and footer stay put. */}
            <DialogContent className="flex max-h-[90dvh] flex-col gap-0 p-0 sm:max-w-4xl">
                <DialogHeader className="border-b p-4 pr-12">
                    <DialogTitle>{slide ? 'Edit slide' : 'Add slide'}</DialogTitle>
                    <DialogDescription>
                        Images are converted to WebP on upload. Alt text is required.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
                    {/* Only the fields scroll; header and footer stay in place. */}
                    <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto p-4">
                        <ImageUploader
                            id="image"
                            label="Desktop image"
                            hint="1920×900"
                            currentUrl={slide?.image_url}
                            file={data.image}
                            onChange={(file) => setData('image', file)}
                            error={errors.image}
                        />

                        <ImageUploader
                            id="mobile_image"
                            label="Mobile image (optional)"
                            hint="768×1000"
                            currentUrl={slide?.mobile_image_url}
                            file={data.mobile_image}
                            onChange={(file) => setData('mobile_image', file)}
                            error={errors.mobile_image}
                        />

                        <div className="flex flex-col gap-2">
                            <Label htmlFor="image_alt">Alt text</Label>
                            <Input
                                id="image_alt"
                                value={data.image_alt}
                                onChange={(event) => setData('image_alt', event.target.value)}
                                required
                            />
                            {errors.image_alt && (
                                <p className="text-sm text-destructive">{errors.image_alt}</p>
                            )}
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="flex flex-col gap-2">
                                <Label htmlFor="title">Title</Label>
                                <Input
                                    id="title"
                                    value={data.title}
                                    onChange={(event) => setData('title', event.target.value)}
                                />
                                {errors.title && (
                                    <p className="text-sm text-destructive">{errors.title}</p>
                                )}
                            </div>

                            <div className="flex flex-col gap-2">
                                <Label htmlFor="subtitle">Subtitle</Label>
                                <Input
                                    id="subtitle"
                                    value={data.subtitle}
                                    onChange={(event) => setData('subtitle', event.target.value)}
                                />
                            </div>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="flex flex-col gap-2">
                                <Label htmlFor="cta_label">CTA label</Label>
                                <Input
                                    id="cta_label"
                                    value={data.cta_label}
                                    onChange={(event) => setData('cta_label', event.target.value)}
                                />
                                {errors.cta_label && (
                                    <p className="text-sm text-destructive">{errors.cta_label}</p>
                                )}
                            </div>

                            <div className="flex flex-col gap-2">
                                <Label htmlFor="cta_url">CTA URL</Label>
                                <Input
                                    id="cta_url"
                                    value={data.cta_url}
                                    onChange={(event) => setData('cta_url', event.target.value)}
                                    placeholder="/services"
                                />
                                {errors.cta_url && (
                                    <p className="text-sm text-destructive">{errors.cta_url}</p>
                                )}
                            </div>
                        </div>

                        <SwitchField
                            id="slide_active"
                            label="Active"
                            description="Hidden slides stay in the list but never render."
                            checked={data.is_active}
                            onCheckedChange={(checked) => setData('is_active', checked)}
                            tone="success"
                        />

                        {/* Everything below has a sensible default, so it stays
                            folded away unless this slide already overrides it. */}
                        <Collapsible defaultOpen={hasAdvanced} className="group/advanced">
                            <CollapsibleTrigger
                                render={
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        className="w-full justify-between px-3"
                                    >
                                        <span className="flex items-center gap-2">
                                            <Settings2Icon className="size-4" />
                                            Layout, scheduling and link behaviour
                                        </span>
                                        <ChevronDownIcon className="size-4 transition-transform group-data-open/advanced:rotate-180" />
                                    </Button>
                                }
                            />

                            <CollapsibleContent className="flex flex-col gap-5 pt-5">
                                <div className="flex flex-col gap-2">
                                    <Label htmlFor="body">Body</Label>
                                    <Textarea
                                        id="body"
                                        rows={3}
                                        value={data.body}
                                        onChange={(event) => setData('body', event.target.value)}
                                    />
                                </div>

                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="flex flex-col gap-2">
                                        <Label htmlFor="text_position">Text position</Label>
                                        <Select
                                            value={data.text_position}
                                            onValueChange={(value) =>
                                                setData('text_position', value as SlideTextPosition)
                                            }
                                        >
                                            <SelectTrigger id="text_position">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {textPositions.map((option) => (
                                                    <SelectItem key={option.value} value={option.value}>
                                                        {option.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="flex flex-col gap-2">
                                        <Label htmlFor="overlay_opacity">
                                            Overlay opacity ({data.overlay_opacity}%)
                                        </Label>
                                        <Input
                                            id="overlay_opacity"
                                            type="range"
                                            min={0}
                                            max={100}
                                            value={data.overlay_opacity}
                                            onChange={(event) =>
                                                setData('overlay_opacity', Number(event.target.value))
                                            }
                                        />
                                    </div>
                                </div>

                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="flex flex-col gap-2">
                                        <Label htmlFor="starts_at">Starts at</Label>
                                        <Input
                                            id="starts_at"
                                            type="datetime-local"
                                            value={data.starts_at}
                                            onChange={(event) => setData('starts_at', event.target.value)}
                                        />
                                    </div>

                                    <div className="flex flex-col gap-2">
                                        <Label htmlFor="ends_at">Ends at</Label>
                                        <Input
                                            id="ends_at"
                                            type="datetime-local"
                                            value={data.ends_at}
                                            onChange={(event) => setData('ends_at', event.target.value)}
                                        />
                                        {errors.ends_at && (
                                            <p className="text-sm text-destructive">{errors.ends_at}</p>
                                        )}
                                    </div>
                                </div>

                                <SwitchField
                                    id="cta_new_tab"
                                    label="Open CTA in a new tab"
                                    description="Use for links that leave the site."
                                    checked={data.cta_new_tab}
                                    onCheckedChange={(checked) => setData('cta_new_tab', checked)}
                                    tone="info"
                                />
                            </CollapsibleContent>
                        </Collapsible>
                    </div>

                    {/* mx-0 mb-0 cancels DialogFooter's built-in -mx-4 -mb-4,
                        which assumes DialogContent still has its default p-4.
                        Ours is p-0, so those negatives push it outside the box. */}
                    <DialogFooter className="mx-0 mb-0">
                        <Button type="button" variant="outline" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={processing}>
                            {processing ? 'Saving…' : slide ? 'Save slide' : 'Add slide'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
