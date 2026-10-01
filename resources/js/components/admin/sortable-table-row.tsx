import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVerticalIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import { TableCell, TableRow } from '@/components/ui/table';

/** A table row that can be dragged; the grip is its own first cell. */
export function SortableTableRow({
    id,
    label,
    children,
}: {
    id: number;
    label: string;
    children: ReactNode;
}) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id,
    });

    return (
        <TableRow
            ref={setNodeRef}
            style={{ transform: CSS.Transform.toString(transform), transition }}
            className={isDragging ? 'relative z-10 bg-card shadow-lg' : undefined}
        >
            <TableCell className="w-10">
                <button
                    type="button"
                    className="cursor-grab touch-none rounded p-1 text-muted-foreground hover:bg-muted active:cursor-grabbing"
                    aria-label={`Reorder ${label}`}
                    {...attributes}
                    {...listeners}
                >
                    <GripVerticalIcon className="size-4" />
                </button>
            </TableCell>
            {children}
        </TableRow>
    );
}
