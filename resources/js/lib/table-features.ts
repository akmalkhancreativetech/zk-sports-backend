import { tableFeatures } from '@tanstack/react-table';

/**
 * Shared TanStack Table v9 feature set for admin tables.
 *
 * Deliberately core-only: sorting, filtering and pagination all happen in the
 * database and arrive as a Laravel paginator, so pulling in the client-side
 * row models would duplicate that work and fight the server's ordering.
 *
 * `columnMeta` is a type-only slot — v9's replacement for globally augmenting
 * the ColumnMeta interface.
 */
export const tableConfig = tableFeatures({
    columnMeta: {} as {
        /**
         * Server-side sort column. Present means the header is clickable, and
         * the value must appear in the controller's SORTABLE whitelist.
         */
        sortKey?: string;
        /** Right-align the cell, for numeric and action columns. */
        align?: 'left' | 'right';
    },
});

export type TableConfig = typeof tableConfig;
