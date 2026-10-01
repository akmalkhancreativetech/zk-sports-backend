"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";

export type GalleryImage = {
  id: number;
  url: string;
  alt: string;
};

/**
 * The product gallery and its lightbox.
 *
 * Built on the native `<dialog>` element rather than a lightbox package: it
 * brings Escape-to-close, focus containment and the top layer with it, so the
 * whole thing is a few lines of state instead of a dependency.
 *
 * Client-side because it holds a selection and opens a modal. It is the second
 * client component on the site, after the hero scroller.
 */
export function ProductGallery({ images }: { images: readonly GalleryImage[] }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [active, setActive] = useState(0);

  const open = (index: number) => {
    setActive(index);
    dialog.current?.showModal();
  };

  const step = useCallback(
    (delta: number) =>
      setActive((current) => (current + delta + images.length) % images.length),
    [images.length],
  );

  /*
   * `<dialog>` handles Escape itself but not arrow keys, and a gallery a
   * visitor cannot page through from the keyboard is a gallery half the
   * audience cannot use. Bound to the document only while the modal is open.
   */
  useEffect(() => {
    const element = dialog.current;

    if (!element) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (!element.open) {
        return;
      }

      if (event.key === "ArrowRight") {
        step(1);
      }

      if (event.key === "ArrowLeft") {
        step(-1);
      }
    };

    document.addEventListener("keydown", onKeyDown);

    return () => document.removeEventListener("keydown", onKeyDown);
  }, [step]);

  if (images.length === 0) {
    return (
      <div className="flex aspect-4/5 w-full items-center justify-center bg-surface text-muted">
        No photography yet
      </div>
    );
  }

  const current = images[active];

  return (
    <div>
      <button
        type="button"
        onClick={() => open(active)}
        aria-label={`Enlarge image: ${current.alt}`}
        className="relative block aspect-4/5 w-full cursor-zoom-in bg-photo-backdrop"
      >
        <Image
          src={current.url}
          alt={current.alt}
          fill
          priority
          className="object-contain"
          sizes="(max-width: 1024px) 100vw, 50vw"
        />
      </button>

      {images.length > 1 && (
        <ul className="mt-3 grid grid-cols-4 gap-3">
          {images.map((image, index) => (
            <li key={image.id}>
              <button
                type="button"
                onClick={() => setActive(index)}
                onDoubleClick={() => open(index)}
                aria-label={`Show image ${index + 1} of ${images.length}`}
                aria-current={index === active ? "true" : undefined}
                className={`relative block aspect-square w-full bg-photo-backdrop ring-inset ${
                  index === active ? "ring-2 ring-accent" : "ring-1 ring-border"
                }`}
              >
                <Image
                  src={image.url}
                  alt=""
                  fill
                  className="object-contain"
                  sizes="25vw"
                />
              </button>
            </li>
          ))}
        </ul>
      )}

      <dialog
        ref={dialog}
        aria-label="Product images"
        /*
         * `m-auto` and the size caps: a dialog defaults to shrink-wrapping its
         * content in the top layer, which leaves a fixed-size image overflowing
         * a small viewport.
         */
        className="m-auto max-h-[90vh] w-[min(92vw,64rem)] bg-transparent p-0 backdrop:bg-black/80"
        onClick={(event) => {
          // Clicking the backdrop closes: the dialog element itself is the
          // backdrop, so a click that did not land on a child is outside.
          if (event.target === dialog.current) {
            dialog.current?.close();
          }
        }}
      >
        <div className="relative bg-photo-backdrop">
          <div className="relative aspect-4/5 max-h-[80vh] w-full">
            <Image
              src={current.url}
              alt={current.alt}
              fill
              className="object-contain"
              sizes="92vw"
            />
          </div>

          <button
            type="button"
            onClick={() => dialog.current?.close()}
            aria-label="Close"
            className="absolute right-3 top-3 flex size-10 items-center justify-center bg-black/60 text-white hover:bg-accent-solid"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5">
              <path
                d="M6 6l12 12M18 6L6 18"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              />
            </svg>
          </button>

          {images.length > 1 && (
            <>
              <button
                type="button"
                onClick={() => step(-1)}
                aria-label="Previous image"
                className="absolute left-3 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center bg-black/60 text-white hover:bg-accent-solid"
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
                onClick={() => step(1)}
                aria-label="Next image"
                className="absolute right-3 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center bg-black/60 text-white hover:bg-accent-solid"
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

              <p
                aria-live="polite"
                className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/60 px-3 py-1 text-sm tabular-nums text-white"
              >
                {active + 1} / {images.length}
              </p>
            </>
          )}
        </div>
      </dialog>
    </div>
  );
}
