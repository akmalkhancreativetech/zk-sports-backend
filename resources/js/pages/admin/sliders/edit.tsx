import { router } from '@inertiajs/react';
import { ArrowLeftIcon, EyeIcon, PlusIcon } from 'lucide-react';
import { useState } from 'react';

import { SlideDialog } from '@/components/admin/slide-dialog';
import { SliderForm } from '@/components/admin/slider-form';
import { SortableSlides } from '@/components/admin/sortable-slides';
import { LinkButton } from '@/components/link-button';
import AdminLayout from '@/layouts/admin-layout';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { routes } from '@/lib/routes';
import type { EnumOption, Slide, Slider } from '@/types/models';

interface Props {
    slider: Slider;
    slides: Slide[];
    transitions: EnumOption[];
    textPositions: EnumOption[];
}

export default function EditSlider({ slider, slides, transitions, textPositions }: Props) {
    const [editing, setEditing] = useState<Slide | 'new' | null>(null);
    const [pendingDelete, setPendingDelete] = useState<Slide | null>(null);

    return (
        <AdminLayout
            title={slider.name}
            description={`Slider key: ${slider.key}`}
            actions={
                <div className="flex items-center gap-2">
                    <LinkButton href={routes.sliders.preview(slider.id)} variant="outline">
                        <EyeIcon className="size-4" />
                        Preview
                    </LinkButton>
                    <LinkButton href={routes.sliders.index} variant="outline">
                        <ArrowLeftIcon className="size-4" />
                        Back to sliders
                    </LinkButton>
                </div>
            }
        >
            <Card>
                <CardHeader>
                    <CardTitle>Settings</CardTitle>
                    <CardDescription>How this slider behaves on the public site.</CardDescription>
                </CardHeader>
                <CardContent>
                    <SliderForm
                        slider={slider}
                        transitions={transitions}
                        action={routes.sliders.update(slider.id)}
                    />
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Slides</CardTitle>
                    <CardDescription>
                        Drag to reorder — the whole order saves in one request. Keyboard users can
                        focus a handle and use the arrow keys.
                    </CardDescription>
                    <div className="pt-2">
                        <Button size="sm" onClick={() => setEditing('new')}>
                            <PlusIcon className="size-4" />
                            Add slide
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <SortableSlides
                        sliderId={slider.id}
                        slides={slides}
                        onEdit={(slide) => setEditing(slide)}
                        onDelete={(slide) => setPendingDelete(slide)}
                    />
                </CardContent>
            </Card>

            <SlideDialog
                sliderId={slider.id}
                editing={editing}
                onClose={() => setEditing(null)}
                textPositions={textPositions}
            />

            <AlertDialog
                open={pendingDelete !== null}
                onOpenChange={(open) => !open && setPendingDelete(null)}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete this slide?</AlertDialogTitle>
                        <AlertDialogDescription>
                            “{pendingDelete?.title ?? 'Untitled slide'}” and its uploaded images
                            will be removed. This cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => {
                                if (pendingDelete) {
                                    router.delete(
                                        routes.sliders.slides.destroy(slider.id, pendingDelete.id),
                                        { preserveScroll: true },
                                    );
                                }
                                setPendingDelete(null);
                            }}
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </AdminLayout>
    );
}
