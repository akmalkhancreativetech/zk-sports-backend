/**
 * Static site chrome: the things the admin panel does not own yet.
 *
 * There is no settings or navigation model in the backend, so company details
 * and the top-level nav live here rather than being invented as API fields.
 * Service categories are the one part of the menu that *is* data-driven — the
 * header fetches those.
 */

/**
 * The site's own public origin — not the API's.
 *
 * `metadataBase`, the sitemap and every canonical URL resolve against this, so
 * it must be the real production domain once deployed. Set
 * `NEXT_PUBLIC_SITE_URL` in the environment; the localhost fallback only keeps
 * dev working.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
).replace(/\/$/, "");

export const SITE = {
  name: "Revoro Sports",
  tagline: "Custom sportswear manufacturing",
  description:
    "Custom sports uniforms and teamwear manufactured to order — design, production and worldwide delivery.",
  // Placeholders: no real contact details have been supplied yet.
  email: "info@revorosports.com",
  phone: "+92 300 0000000",
  /**
   * Digits only, with the country code and no `+` — that is the format wa.me
   * requires, and a number with spaces or a leading `+` silently fails to open
   * a chat. Kept separate from `phone` because the WhatsApp line is often not
   * the one you publish for calls.
   */
  whatsapp: "923000000000",
  address: "Sialkot, Punjab, Pakistan",
} as const;

/** The prefilled message a visitor sends when they open the chat. */
export const WHATSAPP_MESSAGE =
  "Hi Revoro Sports, I'd like a quote for custom teamwear.";

/**
 * The two supplied brand assets.
 *
 * `badge` is the circular mark — square, so it works as an avatar, a favicon
 * and a small header mark. `lockup` is the runner over the REVORO wordmark;
 * being solid red on transparency, it reads on both light and dark surfaces.
 *
 * **The sizes below are render sizes, not the files' intrinsic dimensions.**
 * `next/image` builds its srcset from `width`/`height`, so passing the source
 * files' real 4296px and 3249px made the browser fetch a 3840px-wide image for
 * a 36px logo — tens of megabytes of decoded bitmap per asset. These are the
 * displayed sizes at 2x; the ratios still match the originals so nothing
 * distorts.
 */
export const LOGO = {
  /** Rendered at 36px in the header. */
  badge: { src: "/images/revoro-logo.png", width: 72, height: 72 },
  /** Rendered at 64px tall in the footer; 3249:2527 is 1.286:1. */
  lockup: { src: "/images/revoro-logo-1.png", width: 165, height: 128 },
} as const;

export type NavLink = {
  label: string;
  href: string;
};

/**
 * The public site says "products" and "categories" where the backend and admin
 * say "services" and "service categories". The API contract is unchanged — this
 * is only what a visitor reads, and what the URLs are.
 */
export const NAV_LINKS: readonly NavLink[] = [
  { label: "Products", href: "/products" },
  { label: "Blog", href: "/blog" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
];
