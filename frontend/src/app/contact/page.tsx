import type { Metadata } from "next";
import Link from "next/link";

import { JsonLd } from "@/components/site/json-ld";
import { SectionHeading } from "@/components/site/section-heading";
import { SITE, SITE_URL, WHATSAPP_MESSAGE } from "@/lib/site";

/**
 * How to reach the company.
 *
 * There is deliberately no message form here. The site has one intake — the
 * quote enquiry — and a second form posting somewhere else would mean a second
 * inbox to watch and a second place an enquiry can be missed. Anyone with a
 * question is routed to the same funnel, or to email and WhatsApp, which land
 * where someone is already looking.
 */

export const metadata: Metadata = {
  title: "Contact",
  description: `Talk to ${SITE.name} about custom teamwear — email, phone or WhatsApp, or send a requirement for a costed quote.`,
  alternates: { canonical: "/contact" },
};

const CHANNELS = [
  {
    label: "Email",
    value: SITE.email,
    href: `mailto:${SITE.email}`,
    note: "Best for artwork and specifications.",
    paths: ["M3 6h18v12H3z", "M3 7l9 6 9-6"],
  },
  {
    label: "Phone",
    value: SITE.phone,
    href: `tel:${SITE.phone.replace(/\s/g, "")}`,
    note: "Sunday to Friday, 9am–6pm PKT.",
    paths: [
      "M7 3h3l1.5 5-2 1.5a12 12 0 005 5l1.5-2 5 1.5v3a2 2 0 01-2.2 2A17 17 0 015 5.2 2 2 0 017 3z",
    ],
  },
  {
    label: "WhatsApp",
    value: "Message us",
    href: `https://wa.me/${SITE.whatsapp}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`,
    note: "Quickest for a short question.",
    paths: [
      "M12 21a9 9 0 10-7.8-4.5L3 21l4.6-1.2A9 9 0 0012 21z",
      "M9 9.5c0 3 2.5 5.5 5.5 5.5",
    ],
  },
] as const;

/*
 * The keyless embed endpoint, not the Maps Embed API: `output=embed` renders a
 * map from a plain query with no API key, no billing account and nothing to
 * leak in the client bundle. The trade-off is no control over markers or zoom —
 * worth swapping for the keyed API if the pin needs to be exact.
 */
const mapQuery = encodeURIComponent(SITE.address);
const mapEmbedUrl = `https://www.google.com/maps?q=${mapQuery}&output=embed`;
const directionsUrl = `https://www.google.com/maps/search/?api=1&query=${mapQuery}`;

export default function ContactPage() {
  /*
   * A LocalBusiness, not another Organization: the home page already claims the
   * organisation, and this page is about the place and how to reach it. Hours
   * and address are what a search result for "contact" should surface.
   */
  const businessLd = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: SITE.name,
    url: `${SITE_URL}/contact`,
    email: SITE.email,
    telephone: SITE.phone,
    address: {
      "@type": "PostalAddress",
      addressLocality: "Sialkot",
      addressRegion: "Punjab",
      addressCountry: "PK",
    },
  };

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
      <JsonLd data={businessLd} />

      <SectionHeading
        id="contact-heading"
        level={1}
        title="Talk to us"
        lead="Send a requirement and we come back with a costed quote. For anything else, email, call or message — whichever suits."
      />

      <div className="mt-12 grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:gap-20">
        <div>
          <ul className="grid gap-px bg-border sm:grid-cols-2 lg:grid-cols-1">
            {CHANNELS.map((channel) => (
              <li key={channel.label} className="bg-background">
                <a
                  href={channel.href}
                  {...(channel.href.startsWith("http")
                    ? { target: "_blank", rel: "noopener noreferrer" }
                    : {})}
                  className="flex h-full gap-4 p-6 hover:bg-surface"
                >
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    className="mt-0.5 size-6 shrink-0 text-accent"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    {channel.paths.map((path) => (
                      <path key={path} d={path} />
                    ))}
                  </svg>

                  <span>
                    <span className="block text-sm text-muted">{channel.label}</span>
                    <span className="mt-0.5 block font-display text-xl font-semibold uppercase tracking-tight">
                      {channel.value}
                    </span>
                    <span className="mt-1 block text-sm text-muted">
                      {channel.note}
                    </span>
                  </span>
                </a>
              </li>
            ))}
          </ul>

          <div className="mt-10 border-t border-border pt-6">
            <h2 className="font-display text-xl font-semibold uppercase tracking-tight">
              Where we are
            </h2>
            <address className="mt-3 text-muted not-italic">{SITE.address}</address>

            <a
              href={directionsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-block text-sm font-semibold text-accent hover:underline"
            >
              Get directions
            </a>
          </div>
        </div>

        {/* The quote funnel, given the weight it deserves: it is the reason
            most people arrive on this page. */}
        <aside className="border-t-2 border-foreground pt-6">
          <h2 className="font-display text-3xl font-bold uppercase leading-none tracking-tight">
            Requesting a quote?
          </h2>

          <p className="mt-4 text-muted text-pretty">
            The quote form asks for the product, quantity and specification up
            front, so the first reply can be a price rather than a list of
            questions.
          </p>

          <Link
            href="/quote"
            className="mt-6 inline-block bg-accent-solid px-7 py-3.5 text-sm font-semibold text-accent-foreground hover:opacity-90"
          >
            Request a quote
          </Link>

          <p className="mt-8 border-t border-border pt-6 text-sm text-muted">
            Not sure what you need yet?{" "}
            <Link href="/products" className="text-accent hover:underline">
              Browse the catalogue
            </Link>{" "}
            or{" "}
            <Link href="/about" className="text-accent hover:underline">
              read how an order runs
            </Link>
            .
          </p>
        </aside>
      </div>

      <section aria-labelledby="map-heading" className="mt-16">
        <h2 id="map-heading" className="sr-only">
          Map
        </h2>

        <div className="aspect-16/9 w-full border border-border sm:aspect-21/9">
          <iframe
            // A title, because an iframe with none is announced as "frame" and
            // nothing else.
            title={`Map showing ${SITE.name} in ${SITE.address}`}
            src={mapEmbedUrl}
            // Below the fold on every viewport, and a third-party frame is the
            // heaviest thing on this page — it should not block the rest.
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            className="size-full border-0"
          />
        </div>
      </section>
    </main>
  );
}
