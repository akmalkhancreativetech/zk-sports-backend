import { Link } from '@inertiajs/react';
import type { ComponentProps } from 'react';

import { Button } from '@/components/ui/button';

type LinkButtonProps = Omit<ComponentProps<typeof Button>, 'render' | 'nativeButton'> & {
    href: string;
    prefetch?: boolean;
};

/**
 * A button that navigates.
 *
 * Base UI's Button defaults `nativeButton` to true, so rendering an anchor
 * through `render` warns and drops native button semantics. Inertia's `Link` is
 * an anchor, so every link-styled-as-button needs `nativeButton={false}` —
 * centralised here so it cannot be forgotten.
 *
 * Lives outside `components/ui` because `npx shadcn add` overwrites that folder.
 */
export function LinkButton({ href, prefetch, ...button }: LinkButtonProps) {
    return (
        <Button
            nativeButton={false}
            render={<Link href={href} prefetch={prefetch} />}
            {...button}
        />
    );
}
