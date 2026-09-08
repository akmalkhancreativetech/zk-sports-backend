import {
    DndContext,
    type DragEndEvent,
    KeyboardSensor,
    PointerSensor,
    closestCenter,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import {
    SortableContext,
    arrayMove,
    sortableKeyboardCoordinates,
    useSortable,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { router } from '@inertiajs/react';
import { CalendarClockIcon, GripVerticalIcon, PencilIcon, TrashIcon } from 'lucide-react';
import { useEffect, useState } from 'react';

import { StatusBadge } from '@/components/admin/status-badge';
import { Button } from '@/components/ui/button';
import { routes } from '@/lib/routes';
import type { Slide } from '@/types/models';

interface Props {
    sliderId: number;
    slides: Slide[];
    onEdit: (slide: Slide) => void;
    onDelete: (slide: Slide) => void;
}

function SlideRow({
    slide,
    onEdit,
    onDelete,
}: {
    slide: Slide;
    onEdit: (slide: Slide) => void;
    onDelete: (slide: Slide) => void;
}) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: slide.id,
    });

    const scheduled = slide.starts_at || slide.ends_at;

    return (
        <li
            ref={setNodeRef}
            style={{ transform: CSS.Transform.toString(transform), transition }}
            className={`flex items-center gap-3 rounded-lg border bg-card p-3 ${
                isDragging ? 'z-10 shadow-lg' : ''
            }`}
        >
            <button
                type="button"
                className="cursor-grab touch-none rounded p-1 text-muted-foreground hover:bg-muted active:cursor-grabbing"
                aria-label={`Reorder ${slide.title ?? 'slide'}`}
                {...attributes}
                {...listeners}
            >
                <GripVerticalIcon className="size-4" />
            </button>

            {slide.image_url ? (
                <img
                    src={slide.image_url}
                    alt={slide.image_alt ?? ''}
                    className="h-12 w-20 shrink-0 rounded object-cover"
                    loading="lazy"
                />
            ) : (
                <div className="h-12 w-20 shrink-0 rounded bg-muted" />
            )}

            <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{slide.title ?? 'Untitled slide'}</p>
                <p className="truncate text-sm text-muted-foreground">
                    {slide.subtitle ?? slide.image_alt ?? '—'}
                </p>
            </div>

            <div className="flex shrink-0 items-center gap-2">
                {scheduled && (
                    <StatusBadge tone="info" showDot={false}>
                        <CalendarClockIcon />
                        Scheduled
                    </StatusBadge>
                )}
                <StatusBadge tone={slide.is_active ? 'success' : 'neutral'}>
                    {slide.is_active ? 'Active' : 'Hidden'}
                </StatusBadge>
                <Button variant="ghost" size="icon" onClick={() => onEdit(slide)}>
                    <PencilIcon className="size-4" />
                    <span className="sr-only">Edit slide</span>
                </Button>
                <Button variant="ghost" size="icon" onClick={() => onDelete(slide)}>
                    <TrashIcon className="size-4 text-destructive" />
                    <span className="sr-only">Delete slide</span>
                </Button>
            </div>
        </li>
    );
}

export function SortableSlides({ sliderId, slides, onEdit, onDelete }: Props) {
    const [items, setItems] = useState(slides);

    // Re-sync when the server sends a new ordering (add, delete, reorder).
    useEffect(() => setItems(slides), [slides]);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (!over || active.id === over.id) {
            return;
        }

        const from = items.findIndex((slide) => slide.id === active.id);
        const to = items.findIndex((slide) => slide.id === over.id);
        const reordered = arrayMove(items, from, to);

        // Optimistic: reflect the drop immediately, then persist the whole set
        // in one request rather than one per drag (plan.md §4.3).
        setItems(reordered);

        router.post(
            routes.sliders.slides.reorder(sliderId),
            {
                slides: reordered.map((slide, index) => ({ id: slide.id, sort_order: index })),
            },
            {
                preserveScroll: true,
                preserveState: true,
                // Roll back to the server's truth if the write failed.
                onError: () => setItems(slides),
            },
        );
    };

    if (items.length === 0) {
        return (
            <div className="rounded-lg border border-dashed p-8 text-center">
                <p className="text-sm text-muted-foreground">
                    No slides yet. Add one to build the slider.
                </p>
            </div>
        );
    }

    return (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext
                items={items.map((slide) => slide.id)}
                strategy={verticalListSortingStrategy}
            >
                <ul className="flex flex-col gap-2">
                    {items.map((slide) => (
                        <SlideRow
                            key={slide.id}
                            slide={slide}
                            onEdit={onEdit}
                            onDelete={onDelete}
                        />
                    ))}
                </ul>
            </SortableContext>
        </DndContext>
    );
}
