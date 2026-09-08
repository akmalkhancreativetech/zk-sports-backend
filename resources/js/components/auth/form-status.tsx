import { CircleCheckIcon } from 'lucide-react';

/**
 * Fortify communicates password-reset and verification success only through the
 * `status` session value. Drop it and the user gets no confirmation at all.
 */
export function FormStatus({ status }: { status?: string }) {
    if (!status) {
        return null;
    }

    return (
        <div
            role="status"
            className="mb-6 flex items-start gap-2 rounded-lg border border-emerald-600/20 bg-emerald-600/10 p-3 text-sm text-emerald-700 dark:text-emerald-400"
        >
            <CircleCheckIcon className="mt-0.5 size-4 shrink-0" />
            <span>{status}</span>
        </div>
    );
}
