import { toast } from 'sonner';

function errorToast(errors: Record<string, string>) {
    const fields = Object.keys(errors).length;

    toast.error(
        fields > 0
            ? 'Could not save. Check the highlighted fields.'
            : 'Could not save. Please try again.',
    );
}

/**
 * For endpoints that do **not** flash a message — Fortify's, which flash a
 * machine key (`profile-information-updated`) rather than text. The client
 * supplies the wording.
 *
 * Do not use this on our own controllers: they flash `success`, AdminLayout
 * already turns that into a toast, and adding this one double-toasts.
 */
export function formToasts(success: string, onDone?: () => void) {
    return {
        onSuccess: () => {
            onDone?.();
            toast.success(success);
        },
        onError: errorToast,
    };
}

/**
 * For our own controllers, which flash `success` themselves. Only the failure
 * case needs a toast here; success arrives through the flash bridge.
 */
export function formErrorToast(onDone?: () => void) {
    return {
        onSuccess: () => onDone?.(),
        onError: errorToast,
    };
}
