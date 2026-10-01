import Image from "next/image";
import Link from "next/link";

import type { ServiceCategory } from "@/lib/schemas";
import { LOGO, SITE } from "@/lib/site";

/**
 * Categories are passed in rather than fetched: the home page already has them
 * for its category grid, and a second identical request per page render would
 * buy nothing.
 *
 * No top margin here: pages end on a full-bleed band (the home page's quote
 * CTA), and a gap between that and the footer reads as a rendering fault
 * rather than breathing room. Sections own their own spacing.
 */

const COMPANY_LINKS = [
  { label: "About us", href: "/about" },
  { label: "Blog", href: "/blog" },
  { label: "Contact", href: "/contact" },
] as const;

const LEGAL_LINKS = [
  { label: "Privacy policy", href: "/privacy" },
  { label: "Terms of service", href: "/terms" },
] as const;

function FooterHeading({ children }: { children: string }) {
  return (
    <h2 className="font-display text-lg font-semibold uppercase tracking-tight">
      {children}
    </h2>
  );
}

export function SiteFooter({ categories }: { categories: readonly ServiceCategory[] }) {
  return (
    <footer className="border-t border-border bg-surface">
      <div className="mx-auto grid w-full max-w-6xl gap-12 px-4 py-16 sm:px-6 lg:grid-cols-12">
        <div className="lg:col-span-4">
          {/*
           * The full lockup rather than the header's badge: it is solid red on
           * transparency, so it holds up on the light and dark footer alike.
           */}
          <Image
            src={LOGO.lockup.src}
            alt={SITE.name}
            width={LOGO.lockup.width}
            height={LOGO.lockup.height}
            className="h-14 w-auto"
          />

          <p className="mt-5 max-w-sm text-sm leading-relaxed text-muted">
            {SITE.description}
          </p>

          <address className="mt-6 space-y-2 text-sm not-italic text-muted">
            <p>{SITE.address}</p>
            <p>
              <a href={`mailto:${SITE.email}`} className="hover:text-foreground">
                {SITE.email}
              </a>
            </p>
            <p>
              <a
                href={`tel:${SITE.phone.replace(/\s/g, "")}`}
                className="hover:text-foreground"
              >
                {SITE.phone}
              </a>
            </p>
          </address>
        </div>

        {categories.length > 0 && (
          <div className="lg:col-span-3">
            <FooterHeading>Products</FooterHeading>

            <ul className="mt-4 space-y-2.5">
              {categories.map((category) => (
                <li key={category.id}>
                  <Link
                    href={`/products?category=${category.slug}`}
                    className="text-sm text-muted hover:text-foreground"
                  >
                    {category.name}
                  </Link>
                </li>
              ))}

              <li>
                <Link
                  href="/products"
                  className="text-sm font-semibold text-accent hover:underline"
                >
                  All products
                </Link>
              </li>
            </ul>
          </div>
        )}

        <div className="lg:col-span-2">
          <FooterHeading>Company</FooterHeading>

          <ul className="mt-4 space-y-2.5">
            {COMPANY_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="text-sm text-muted hover:text-foreground"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/*
         * A quote panel rather than a fourth list of links: requesting a quote
         * is the action the whole site funnels to, and it would be buried among
         * navigation.
         */}
        <div className="lg:col-span-3">
          <FooterHeading>Start an order</FooterHeading>

          <p className="mt-4 text-sm leading-relaxed text-muted">
            Send your requirement, quantities and artwork. We reply with a
            costed quote.
          </p>

          <Link
            href="/quote"
            className="mt-5 inline-block bg-accent-solid px-6 py-3 text-sm font-semibold text-accent-foreground hover:opacity-90"
          >
            Request a quote
          </Link>
        </div>
      </div>

      <div className="border-t border-border">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-6 sm:px-6">
          <p className="text-xs text-muted">
            © {new Date().getFullYear()} {SITE.name}. All rights reserved.
          </p>

          <ul className="flex flex-wrap gap-x-6 gap-y-2">
            {LEGAL_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="text-xs text-muted hover:text-foreground"
                >
                  {link.label}
                </Link>
              </li>
            ))}

            <li>
              {/*
               * A plain anchor, not `next/link`: /sitemap.xml is a route
               * handler that returns XML, not a page, so a client-side
               * navigation to it has nothing to render.
               */}
              <a
                href="/sitemap.xml"
                className="text-xs text-muted hover:text-foreground"
              >
                Sitemap
              </a>
            </li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
