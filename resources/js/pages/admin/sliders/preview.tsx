import { ArrowLeftIcon, MonitorIcon, SmartphoneIcon } from 'lucide-react';
import { useState } from 'react';

import AdminLayout from '@/layouts/admin-layout';
import { ActiveBadge } from '@/components/admin/status-badge';
import { LinkButton } from '@/components/link-button';
import { SliderHero } from '@/components/slider-hero';
import { Button } from '@/components/ui/button';
import { routes } from '@/lib/routes';
import type { HeroSlider } from '@/types/models';

interface Props {
    slider: { id: number; name: string; key: string; is_active: boolean };
    hero: HeroSlider;
}

/** Widths that match the viewport breakpoint the mobile image swaps at. */
const widths = {
    desktop: 'w-full',
    mobile: 'w-[390px]',
} as const;

export default function SliderPreview({ slider, hero }: Props) {
    const [viewport, setViewport] = useState<keyof typeof widths>('desktop');

    return (
        <AdminLayout
            title={`Preview: ${slider.name}`}
            description="How this slider will render on the public site."
            actions={
                <div className="flex items-center gap-2">
                    <Button
                        variant={viewport === 'desktop' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setViewport('desktop')}
                    >
                        <MonitorIcon className="size-4" />
                        Desktop
                    </Button>
                    <Button
                        variant={viewport === 'mobile' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setViewport('mobile')}
                    >
                        <SmartphoneIcon className="size-4" />
                        Mobile
                    </Button>
                    <LinkButton
                        href={routes.sliders.edit(slider.id)}
                        variant="outline"
                        size="sm"
                    >
                        <ArrowLeftIcon className="size-4" />
                        Back to editor
                    </LinkButton>
                </div>
            }
        >
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <ActiveBadge active={slider.is_active} />
                {!slider.is_active && (
                    <span>
                        This slider is inactive, so the public site will not render it. The preview
                        shows it anyway.
                    </span>
                )}
                <span>
                    Showing live slides only — hidden and out-of-window slides are excluded, exactly
                    as the public read path does.
                </span>
            </div>

            <div className="flex justify-center overflow-x-auto rounded-lg border bg-muted/30 p-4">
                <div className={`${widths[viewport]} max-w-full transition-all`}>
                    <SliderHero hero={hero} className="rounded-lg" />
                </div>
            </div>
        </AdminLayout>
    );
}
