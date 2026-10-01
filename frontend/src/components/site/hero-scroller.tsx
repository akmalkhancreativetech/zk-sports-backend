"use client";

import {
  Children,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

/**
 * The hero's slide mechanism and its controls.
 *
 * The only client component on the site. It exists because three admin options
 * cannot be honoured without state: `autoplay`, `interval_ms` and `transition`.
 * It also replaced the previous anchor-based dots, which worked without
 * JavaScript but wrote a `#slide-3` fragment into the address bar on click.
 *
 * Slides are passed in as `children` so they stay server-rendered — this
 * wrapper adds behaviour, not markup for the content.
 */
export function HeroScroller({
  children,
  count,
  autoplay,
  intervalMs,
  transition,
}: {
  children: ReactNode;
  count: number;
  autoplay: boolean;
  intervalMs: number;
  transition: "slide" | "fade";
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(autoplay);
  const [hovered, setHovered] = useState(false);

  const isFade = transition === "fade";

  const goTo = useCallback(
    (next: number) => {
      const target = ((next % count) + count) % count;

      setIndex(target);

      if (isFade) {
        return;
      }

      const element = scroller.current;

      if (!element) {
        return;
      }

      /*
       * The global reduced-motion rule in globals.css only governs CSS-driven
       * scrolling; a scripted `behavior: "smooth"` animates regardless, so the
       * preference is checked here too.
       */
      const reduced = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;

      /*
       * Scrolling to an exact multiple of the slide width, rather than by a
       * relative amount, is what stops the jerk: a `scrollBy` that lands a
       * fraction of a pixel off lets scroll-snap yank the container the rest of
       * the way after the smooth animation has already finished.
       */
      element.scrollTo({
        left: target * element.clientWidth,
        behavior: reduced ? "auto" : "smooth",
      });
    },
    [count, isFade],
  );

  /*
   * A timeout keyed on `index` rather than an interval: manually advancing
   * restarts the dwell, so a slide the visitor just chose is not cut short.
   * Autoplay never starts under a reduced-motion preference — unrequested
   * movement is exactly what that setting asks to be spared.
   */
  useEffect(() => {
    if (!playing || hovered || count < 2) {
      return;
    }

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    const timer = setTimeout(() => goTo(index + 1), intervalMs);

    return () => clearTimeout(timer);
  }, [playing, hovered, index, count, intervalMs, goTo]);

  /** Keep the counter honest when the slider is swiped rather than clicked. */
  const handleScroll = () => {
    const element = scroller.current;

    if (element) {
      setIndex(Math.round(element.scrollLeft / element.clientWidth));
    }
  };

  const slides = Children.toArray(children);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocusCapture={() => setHovered(true)}
      onBlurCapture={() => setHovered(false)}
    >
      {isFade ? (
        /*
         * Stacked in a single grid cell rather than absolutely positioned: the
         * container keeps the natural height of the tallest slide, which an
         * `absolute inset-0` stack would collapse to zero.
         */
        <div className="grid">
          {slides.map((slide, position) => (
            <div
              key={position}
              /*
               * `inert` as well as `aria-hidden`: opacity 0 still leaves a
               * slide's CTA in the tab order, so a keyboard user would land on
               * a button they cannot see. `inert` removes it properly.
               */
              inert={position !== index}
              aria-hidden={position !== index}
              className={`[grid-area:1/1] transition-opacity duration-700 ${
                position === index
                  ? "opacity-100"
                  : "pointer-events-none opacity-0"
              }`}
            >
              {slide}
            </div>
          ))}
        </div>
      ) : (
        <div
          ref={scroller}
          onScroll={handleScroll}
          className="hero-scroller flex snap-x snap-mandatory overflow-x-auto"
        >
          {children}
        </div>
      )}

      {count > 1 && (
        /*
         * Right-aligned, but inset past the floating WhatsApp button rather
         * than flush to the edge: that button is fixed at `right-5`/`right-6`
         * and is 56px wide, so anything at `right-6` here lands underneath it
         * whenever the hero's foot reaches the bottom of the screen. The
         * offsets below leave roughly 20px of clearance at each breakpoint.
         */
        <div className="absolute bottom-6 right-24 flex items-center gap-2 sm:bottom-8 sm:right-28">
          <p aria-live="polite" className="mr-2 text-sm tabular-nums text-white/80">
            {index + 1} / {count}
          </p>

          {/*
           * WCAG 2.2.2: content that moves on its own for more than five
           * seconds needs a way to stop it. Rendered only when autoplay is
           * actually on, so a static slider does not offer a dead control.
           */}
          {autoplay && (
            <button
              type="button"
              onClick={() => setPlaying((on) => !on)}
              aria-label={playing ? "Pause slideshow" : "Play slideshow"}
              className="flex size-12 items-center justify-center border border-white/30 bg-black/40 text-white backdrop-blur hover:border-accent-solid hover:bg-accent-solid"
            >
              <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5">
                {playing ? (
                  <path d="M8 5h3v14H8zM13 5h3v14h-3z" fill="currentColor" />
                ) : (
                  <path d="M7 4l13 8-13 8z" fill="currentColor" />
                )}
              </svg>
            </button>
          )}

          <button
            type="button"
            onClick={() => goTo(index - 1)}
            aria-label="Previous slide"
            className="flex size-12 items-center justify-center border border-white/30 bg-black/40 text-white backdrop-blur hover:border-accent-solid hover:bg-accent-solid"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" className="size-6">
              <path
                d="M15 5l-7 7 7 7"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="square"
              />
            </svg>
          </button>

          <button
            type="button"
            onClick={() => goTo(index + 1)}
            aria-label="Next slide"
            className="flex size-12 items-center justify-center border border-white/30 bg-black/40 text-white backdrop-blur hover:border-accent-solid hover:bg-accent-solid"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" className="size-6">
              <path
                d="M9 5l7 7-7 7"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="square"
              />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
