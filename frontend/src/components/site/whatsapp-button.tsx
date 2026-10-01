import { SITE, WHATSAPP_MESSAGE } from "@/lib/site";

/**
 * The floating WhatsApp button.
 *
 * A plain anchor, so it stays a server component — `wa.me` decides on its own
 * whether to hand off to the app or to WhatsApp Web, and nothing here needs to
 * know which.
 *
 * Sits bottom-right, which is why the hero's slide controls were moved to the
 * bottom-left: a fixed element and an absolutely positioned one in the same
 * corner overlap whenever the hero's foot reaches the bottom of the viewport.
 *
 * No pulse, no bounce, no auto-opening bubble. It is a persistent control, and
 * a thing that moves on its own in the corner of every page is the fastest way
 * to make a site feel cheap.
 */
export function WhatsAppButton() {
  const href = `https://wa.me/${SITE.whatsapp}?text=${encodeURIComponent(
    WHATSAPP_MESSAGE,
  )}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with us on WhatsApp"
      /*
       * `#25D366` is WhatsApp's own green, deliberately not a brand token: a
       * platform button that is not the platform's colour reads as a
       * third-party imitation. White on it clears AA at this icon size.
       */
      className="fixed bottom-5 right-5 z-40 flex size-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg shadow-black/20 transition-transform hover:scale-105 sm:bottom-6 sm:right-6"
    >
      <svg aria-hidden="true" viewBox="0 0 24 24" className="size-7" fill="currentColor">
        <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.87 9.87 0 004.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0012.04 2zm0 1.67c2.2 0 4.27.86 5.83 2.42a8.19 8.19 0 012.41 5.82c0 4.54-3.7 8.24-8.25 8.24a8.2 8.2 0 01-4.18-1.15l-.3-.18-3.11.82.83-3.04-.2-.31a8.18 8.18 0 01-1.26-4.38c0-4.54 3.7-8.24 8.23-8.24zm-2.5 4.13c-.16 0-.42.06-.64.3-.22.24-.85.83-.85 2.02 0 1.19.87 2.34.99 2.5.12.16 1.7 2.6 4.13 3.64.58.25 1.03.4 1.38.51.58.19 1.11.16 1.53.1.47-.07 1.43-.59 1.63-1.15.2-.56.2-1.04.14-1.14-.06-.1-.22-.16-.46-.28-.24-.12-1.43-.71-1.65-.79-.22-.08-.38-.12-.54.12-.16.24-.62.79-.76.95-.14.16-.28.18-.52.06-.24-.12-1.02-.38-1.94-1.2-.72-.64-1.2-1.43-1.34-1.67-.14-.24-.02-.37.1-.49.11-.11.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.54-1.3-.74-1.78-.19-.47-.39-.4-.54-.41h-.46z" />
      </svg>
    </a>
  );
}
