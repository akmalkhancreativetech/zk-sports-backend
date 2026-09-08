import { router, useForm } from '@inertiajs/react';
import { ImagePlusIcon, TrashIcon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formErrorToast } from '@/lib/form-feedback';
import { routes } from '@/lib/routes';
import type { ServiceImage } from '@/types/models';

interface Props {
    serviceId: number;
    images: ServiceImage[];
}

/**
 * One gallery tile.
 *
 * The alt field is controlled with local state rather than `defaultValue`:
 * saving reloads the page props, which changes `image.alt`, and Base UI warns
 * when an uncontrolled field's default changes after mount.
 */
function GalleryTile({ serviceId, image }: { serviceId: number; image: ServiceImage }) {
    const [alt, setAlt] = useState(image.alt ?? '');

    // Re-sync if the server sends a different value (another tab, a reload).
    useEffect(() => setAlt(image.alt ?? ''), [image.alt]);

    const save = () => {
        if (alt === (image.alt ?? '')) {
            return;
        }

        router.put(
            routes.services.images.update(serviceId, image.id),
            { alt },
            { preserveScroll: true },
        );
    };

    return (
        <li className="flex flex-col gap-2 rounded-lg border p-2">
            <img
                src={image.url}
                alt={alt}
                className="aspect-video w-full rounded object-cover"
                loading="lazy"
            />
            <div className="flex items-center gap-2">
                <Input
                    value={alt}
                    onChange={(event) => setAlt(event.target.value)}
                    onBlur={save}
                    placeholder="Alt text"
                    aria-label="Alt text"
                />
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Remove image"
                    onClick={() =>
                        router.delete(routes.services.images.destroy(serviceId, image.id), {
                            preserveScroll: true,
                        })
                    }
                >
                    <TrashIcon className="size-4 text-destructive" />
                </Button>
            </div>
        </li>
    );
}

export function GalleryManager({ serviceId, images }: Props) {
    const inputRef = useRef<HTMLInputElement>(null);
    const upload = useForm<{ images: File[] }>({ images: [] });

    const send = (files: FileList | null) => {
        if (!files || files.length === 0) {
            return;
        }

        upload.setData('images', Array.from(files));
        upload.post(routes.services.images.store(serviceId), {
            preserveScroll: true,
            forceFormData: true,
            ...formErrorToast(() => {
                upload.reset();
                if (inputRef.current) {
                    inputRef.current.value = '';
                }
            }),
        });
    };

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
                <Button
                    type="button"
                    variant="outline"
                    disabled={upload.processing}
                    onClick={() => inputRef.current?.click()}
                >
                    <ImagePlusIcon className="size-4" />
                    {upload.processing ? 'Uploading…' : 'Add images'}
                </Button>
                <p className="text-xs text-muted-foreground">
                    Up to 12 at a time. Converted to WebP, capped at 2560px.
                </p>
            </div>

            <input
                ref={inputRef}
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp,image/avif"
                className="sr-only"
                onChange={(event) => send(event.target.files)}
            />

            {upload.errors.images && (
                <p className="text-sm text-destructive">{upload.errors.images}</p>
            )}

            {images.length === 0 ? (
                <div className="rounded-lg border border-dashed p-8 text-center">
                    <p className="text-sm text-muted-foreground">
                        No gallery images yet. Add a few to show this service off.
                    </p>
                </div>
            ) : (
                <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {images.map((image) => (
                        <GalleryTile key={image.id} serviceId={serviceId} image={image} />
                    ))}
                </ul>
            )}
        </div>
    );
}
