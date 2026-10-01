import Image from "next/image";
import Link from "next/link";

import { HeroScroller } from "@/components/site/hero-scroller";
import type { Slide, Slider } from "@/lib/schemas";

/**
 * The home hero, driven entirely by the slider the admin panel owns.
 *
 * **Layout** is chosen per slide from the content it actually has, because
 * every field in the admin is optional and a fixed composition breaks on the
 * empty ones:
 *
 *  - Copy present — two equal halves at a fixed height: the image fills one,
 *    the copy the other. `text_position` decides which side the copy takes,
 *    and `center` keeps the split while centring the copy in its half.
 *  - **No title and no subtitle** — the image alone across the full width. A
 *    split layout here is half a screen of empty charcoal.
 *
 * Photographs are never cropped: each is contained within its panel, which is
 * painted the same near-white as the uploads' own edges so the surround is
 * invisible.
 *
 * The slides themselves stay server-rendered; `HeroScroller` wraps them to add
 * the controls and to apply the slider-level options — `autoplay`,
 * `interval_ms` and `transition`.
 *
 * Every field the admin exposes is honoured: title, subtitle, body, the desktop
 * and mobile images, alt text, the CTA trio, `text_position` and
 * `overlay_opacity`. Ordering, activation and scheduling are applied server
 * side by the `live` scope before the slide ever reaches this component.
 */

/**
 * A slide's artwork, filling whatever frame the layout gives it.
 *
 * `fill` is what `next/image` recommends for a remote image of unknown
 * proportions, and the frame — not the file — decides the height.
 *
 * `object-contain`, so the whole photograph is visible whatever shape the frame
 * is. The frame carries `bg-photo-backdrop`, sampled from the uploads' own
 * near-white edges, so the space around a portrait image in a wide frame reads
 * as the studio sweep continuing rather than as a letterbox.
 *
 * `next/image` has no art-direction prop, so where the admin supplied a
 * separate mobile image the two render as a breakpoint-swapped pair. Only one
 * displays, and the hidden one is not fetched: the browser skips an image whose
 * container is `display: none` at that breakpoint.
 */
function SlideImage({
  slide,
  priority,
  sizes,
}: {
  slide: Slide;
  priority: boolean;
  sizes: string;
}) {
  if (!slide.image_url) {
    return null;
  }

  const shared = "object-contain";

  if (!slide.mobile_image_url) {
    return (
      <Image
        src={slide.image_url}
        alt={slide.image_alt ?? ""}
        fill
        priority={priority}
        className={shared}
        sizes={sizes}
      />
    );
  }

  return (
    <>
      <Image
        src={slide.mobile_image_url}
        alt={slide.image_alt ?? ""}
        fill
        priority={priority}
        className={`${shared} sm:hidden`}
        sizes="100vw"
      />
      <Image
        src={slide.image_url}
        alt={slide.image_alt ?? ""}
        fill
        priority={priority}
        className={`hidden ${shared} sm:block`}
        sizes={sizes}
      />
    </>
  );
}

function SlideCopy({
  slide,
  index,
  tone,
}: {
  slide: Slide;
  index: number;
  tone: "onImage" | "onPanel";
}) {
  /*
   * Only the first slide is the page's `h1`; the rest are `h2`. Every slide
   * styled as one would ship several per document, which is a heading outline
   * no crawler can read as a hierarchy.
   */
  const Heading = index === 0 ? "h1" : "h2";
  const hasOwnCta = Boolean(slide.cta_label && slide.cta_url);

  return (
    <>
      {slide.title && (
        <Heading className="max-w-2xl font-display text-5xl font-bold uppercase leading-[0.9] tracking-tight text-balance sm:text-6xl lg:text-7xl">
          {slide.title}
        </Heading>
      )}

      {slide.subtitle && (
        <p
          className={`mt-5 max-w-xl text-base text-pretty sm:text-lg ${
            tone === "onImage" ? "text-white/85" : "text-white/75"
          }`}
        >
          {slide.subtitle}
        </p>
      )}

      {/*
       * `body` is a longer free-text field in the admin. Line breaks the editor
       * typed are preserved — it is a plain text column, so newlines are the
       * only structure it can carry.
       */}
      {slide.body && (
        <p className="mt-4 max-w-xl whitespace-pre-line text-sm leading-relaxed text-white/70">
          {slide.body}
        </p>
      )}

      {/*
       * One button, not two. The slide's own CTA wins when the admin set one;
       * otherwise the quote link stands in as the primary action. Rendering
       * both meant a slide with a "Request a quote" CTA showed that button
       * twice, side by side.
       */}
      <div className="mt-8">
        {hasOwnCta ? (
          <Link
            href={slide.cta_url!}
            target={slide.cta_new_tab ? "_blank" : undefined}
            rel={slide.cta_new_tab ? "noopener noreferrer" : undefined}
            className="inline-block bg-accent-solid px-7 py-3.5 text-sm font-semibold text-accent-foreground transition-opacity hover:opacity-90"
          >
            {slide.cta_label}
          </Link>
        ) : (
          <Link
            href="/quote"
            className="inline-block bg-accent-solid px-7 py-3.5 text-sm font-semibold text-accent-foreground transition-opacity hover:opacity-90"
          >
            Request a quote
          </Link>
        )}
      </div>
    </>
  );
}

export function HeroCarousel({
  slider,
  fallbackHeading,
}: {
  slider: Slider;
  /** Used as a visually hidden `h1` when the first slide carries no title. */
  fallbackHeading: string;
}) {
  const { slides } = slider;

  if (slides.length === 0) {
    return null;
  }

  return (
    <section aria-label="Highlights" className="relative bg-brand">
      {/*
       * Slide titles are optional in the admin, so the hero cannot be relied on
       * to produce the document's `h1`. A page with none is a heading outline
       * with no root — this guarantees exactly one either way.
       */}
      {!slides[0].title && <h1 className="sr-only">{fallbackHeading}</h1>}

      <HeroScroller
        count={slides.length}
        autoplay={slider.autoplay}
        intervalMs={slider.interval_ms}
        transition={slider.transition}
      >
        {slides.map((slide, index) => {
          const hasCopy = Boolean(slide.title || slide.subtitle);

          return (
            <article key={slide.id} className="relative w-full shrink-0 snap-start">
              {hasCopy ? (
                /*
                 * Two equal halves at a fixed height: the image fills its half
                 * edge to edge and the copy fills the other. `text_position`
                 * only decides which side the copy takes — `center` keeps the
                 * same split and centres the copy within its half.
                 */
                <div
                  className={`grid w-full lg:h-[42rem] lg:grid-cols-2 ${
                    slide.text_position === "right"
                      ? "lg:[&>*:first-child]:order-2"
                      : ""
                  }`}
                >
                  <div
                    className={`flex flex-col justify-center px-6 py-16 text-white sm:px-10 lg:px-16 xl:px-24 ${
                      slide.text_position === "center" ? "items-center text-center" : ""
                    }`}
                  >
                    <SlideCopy slide={slide} index={index} tone="onPanel" />
                  </div>

                  {slide.image_url && (
                    /*
                     * 4:5 on mobile, where the copy stacks beneath it; from
                     * `lg` the panel fills its half of the fixed-height row.
                     * The photograph is contained within it, never cropped.
                     */
                    <div className="relative aspect-4/5 w-full bg-photo-backdrop lg:aspect-auto lg:h-full">
                      <SlideImage
                        slide={slide}
                        priority={index === 0}
                        sizes="(max-width: 1024px) 100vw, 50vw"
                      />

                      {/*
                       * The overlay applies here too, not just to the
                       * full-bleed treatment: an editor who dims a slide
                       * expects that to hold whichever layout it lands in.
                       */}
                      <div
                        aria-hidden="true"
                        className="absolute inset-0 bg-black"
                        style={{ opacity: slide.overlay_opacity / 100 }}
                      />
                    </div>
                  )}
                </div>
              ) : (
                /* No copy at all: the artwork alone, in a bounded band that
                   matches the height of the split slides beside it. */
                <div className="relative h-[30rem] w-full bg-photo-backdrop lg:h-[42rem]">
                  <SlideImage slide={slide} priority={index === 0} sizes="100vw" />

                  <div
                    aria-hidden="true"
                    className="absolute inset-0 bg-black"
                    style={{ opacity: slide.overlay_opacity / 100 }}
                  />

                  {/* A slide with no copy still gets its CTA, but nothing is
                      rendered over the artwork when there is none to show. */}
                  {(hasCopy || (slide.cta_label && slide.cta_url)) && (
                    <div className="absolute inset-0 mx-auto flex w-full max-w-6xl flex-col items-center justify-center px-6 py-10 text-center text-white sm:px-10">
                      <SlideCopy slide={slide} index={index} tone="onImage" />
                    </div>
                  )}
                </div>
              )}
            </article>
          );
        })}
      </HeroScroller>
    </section>
  );
}
