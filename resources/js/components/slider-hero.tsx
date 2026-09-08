import { useEffect, useState } from 'react';

import type { HeroSlider } from '@/types/models';

/**
 * Renders a slider the way the public site should.
 *
 * Deliberately free of Inertia and app imports so it can be lifted into the
 * Next.js front end unchanged once that exists.
 */
const alignment = {
    left: 'items-start text-left',
    center: 'items-center text-center',
    right: 'items-end text-right',
} as const;

export function SliderHero({ hero, className }: { hero: HeroSlider; className?: string }) {
    const [index, setIndex] = useState(0);
    const count = hero.slides.length;

    useEffect(() => {
        if (!hero.autoplay || count < 2) {
            return;
        }

        const timer = setInterval(
            () => setIndex((current) => (current + 1) % count),
            hero.interval_ms,
        );

        return () => clearInterval(timer);
    }, [hero.autoplay, hero.interval_ms, count]);

    // Guard against an index left past the end after slides are removed.
    useEffect(() => {
        if (index > count - 1) {
            setIndex(0);
        }
    }, [count, index]);

    if (count === 0) {
        return (
            <div
                className={`flex min-h-64 items-center justify-center rounded-lg border border-dashed ${className ?? ''}`}
            >
                <p className="text-sm text-muted-foreground">
                    No live slides. Add one, or check that your slides are active and inside their
                    scheduled window.
                </p>
            </div>
        );
    }

    return (
        <section
            className={`relative aspect-[1920/900] w-full overflow-hidden bg-neutral-900 ${className ?? ''}`}
        >
            {hero.slides.map((slide, position) => (
                <div
                    key={slide.id}
                    className={`absolute inset-0 ${
                        hero.transition === 'fade'
                            ? 'transition-opacity duration-700'
                            : 'transition-transform duration-700'
                    } ${
                        position === index
                            ? 'translate-x-0 opacity-100'
                            : `pointer-events-none opacity-0 ${
                                  hero.transition === 'slide'
                                      ? position < index
                                          ? '-translate-x-full'
                                          : 'translate-x-full'
                                      : ''
                              }`
                    }`}
                    aria-hidden={position !== index}
                >
                    {slide.image_url && (
                        <picture>
                            {slide.mobile_image_url && (
                                <source media="(max-width: 767px)" srcSet={slide.mobile_image_url} />
                            )}
                            <img
                                src={slide.image_url}
                                alt={slide.image_alt ?? ''}
                                className="size-full object-cover"
                                loading={position === 0 ? 'eager' : 'lazy'}
                                fetchPriority={position === 0 ? 'high' : 'auto'}
                            />
                        </picture>
                    )}

                    <div
                        className="absolute inset-0 bg-black"
                        style={{ opacity: slide.overlay_opacity / 100 }}
                    />

                    <div
                        className={`absolute inset-0 mx-auto flex max-w-5xl flex-col justify-center gap-3 px-6 text-white sm:gap-4 sm:px-10 ${
                            alignment[slide.text_position]
                        }`}
                    >
                        {slide.title && (
                            <h2 className="text-2xl font-semibold sm:text-4xl lg:text-5xl">
                                {slide.title}
                            </h2>
                        )}
                        {slide.subtitle && (
                            <p className="max-w-2xl text-white/90 sm:text-lg">{slide.subtitle}</p>
                        )}
                        {slide.body && (
                            <p className="max-w-2xl text-sm text-white/80">{slide.body}</p>
                        )}
                        {slide.cta_label && slide.cta_url && (
                            <a
                                href={slide.cta_url}
                                target={slide.cta_new_tab ? '_blank' : undefined}
                                rel={slide.cta_new_tab ? 'noreferrer' : undefined}
                                className="mt-1 inline-flex w-fit items-center rounded-lg bg-white px-5 py-2.5 font-medium text-neutral-900 transition-colors hover:bg-white/90"
                            >
                                {slide.cta_label}
                            </a>
                        )}
                    </div>
                </div>
            ))}

            {count > 1 && (
                <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2 sm:bottom-6">
                    {hero.slides.map((slide, position) => (
                        <button
                            key={slide.id}
                            type="button"
                            onClick={() => setIndex(position)}
                            aria-label={`Go to slide ${position + 1}`}
                            aria-current={position === index}
                            className={`h-2 rounded-full transition-all ${
                                position === index ? 'w-6 bg-white' : 'w-2 bg-white/50'
                            }`}
                        />
                    ))}
                </div>
            )}
        </section>
    );
}
