import { ImageIcon, UploadIcon, XIcon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

interface Props {
    id: string;
    label: string;
    /** Aspect guidance shown to the user, e.g. "1920×900". */
    hint?: string;
    /** Existing stored image, if the slide already has one. */
    currentUrl?: string | null;
    file: File | null;
    onChange: (file: File | null) => void;
    error?: string;
}

export function ImageUploader({
    id,
    label,
    hint,
    currentUrl,
    file,
    onChange,
    error,
}: Props) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [dragging, setDragging] = useState(false);

    // Object URLs must be revoked or the tab leaks memory per selection.
    useEffect(() => {
        if (!file) {
            setPreview(null);
            return;
        }

        const url = URL.createObjectURL(file);
        setPreview(url);

        return () => URL.revokeObjectURL(url);
    }, [file]);

    const shown = preview ?? currentUrl ?? null;

    const accept = (list: FileList | null) => {
        const next = list?.[0];

        if (next?.type.startsWith('image/')) {
            onChange(next);
        }
    };

    return (
        <div className="flex flex-col gap-2">
            <Label htmlFor={id}>{label}</Label>

            <div
                onDragOver={(event) => {
                    event.preventDefault();
                    setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(event) => {
                    event.preventDefault();
                    setDragging(false);
                    accept(event.dataTransfer.files);
                }}
                className={`relative flex min-h-36 items-center justify-center rounded-lg border border-dashed p-3 transition-colors ${
                    dragging ? 'border-primary bg-primary/5' : 'border-input'
                }`}
            >
                {shown ? (
                    <>
                        <img
                            src={shown}
                            alt=""
                            className="max-h-40 w-full rounded object-contain"
                        />
                        {file && (
                            <Button
                                type="button"
                                variant="secondary"
                                size="icon-sm"
                                className="absolute top-2 right-2"
                                onClick={() => {
                                    onChange(null);
                                    if (inputRef.current) {
                                        inputRef.current.value = '';
                                    }
                                }}
                            >
                                <XIcon className="size-3.5" />
                                <span className="sr-only">Remove selected image</span>
                            </Button>
                        )}
                    </>
                ) : (
                    <div className="flex flex-col items-center gap-2 text-center">
                        <ImageIcon className="size-6 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">
                            Drag an image here, or
                        </p>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => inputRef.current?.click()}
                        >
                            <UploadIcon className="size-4" />
                            Choose file
                        </Button>
                    </div>
                )}
            </div>

            <input
                ref={inputRef}
                id={id}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/avif"
                className="sr-only"
                onChange={(event) => accept(event.target.files)}
            />

            <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs text-muted-foreground">
                    {hint ? `${hint} · ` : ''}Converted to WebP, capped at 2560px.
                </p>
                {shown && (
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => inputRef.current?.click()}
                    >
                        Replace
                    </Button>
                )}
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
    );
}
