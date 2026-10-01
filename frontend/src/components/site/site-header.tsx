import Image from "next/image";
import Link from "next/link";

import { ThemeToggle } from "@/components/site/theme-toggle";
import type { ServiceCategory } from "@/lib/schemas";
import { LOGO, NAV_LINKS, SITE } from "@/lib/site";

/**
 * The site header.
 *
 * Deliberately a server component: the categories menu and the mobile drawer
 * are `<details>` elements, which open and close without JavaScript. That keeps
 * the whole header out of the client bundle. An animated drawer or a
 * scroll-aware sticky bar would need `"use client"` — worth it later, not now.
 */
export function SiteHeader({ categories }: { categories: readonly ServiceCategory[] }) {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-6 px-4 sm:px-6">
        <Link href="/" className="flex shrink-0 items-center gap-2.5">
          {/*
           * The badge carries the company name around its rim, but at 36px that
           * ring is unreadable — the typeset name beside it is what a visitor
           * actually reads, so the mark is decorative and the alt text empty.
           */}
          <Image
            src={LOGO.badge.src}
            alt=""
            width={LOGO.badge.width}
            height={LOGO.badge.height}
            priority
            className="size-9 w-auto"
          />
          <span className="font-display text-xl font-bold uppercase leading-none tracking-tight">
            {SITE.name}
          </span>
        </Link>

        <nav aria-label="Main" className="ml-auto hidden items-center gap-1 md:flex">
          {categories.length > 0 && (
            <details className="group relative [&_summary::-webkit-details-marker]:hidden">
              <summary className="flex cursor-pointer list-none items-center gap-1 rounded-md px-3 py-2 text-sm font-medium hover:bg-surface">
                Categories
                <svg
                  aria-hidden="true"
                  viewBox="0 0 12 12"
                  className="size-3 transition-transform group-open:rotate-180"
                >
                  <path d="M2 4l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.5" />
                </svg>
              </summary>

              <ul className="absolute left-0 top-full mt-1 min-w-56 rounded-lg border border-border bg-background p-1 shadow-lg">
                {categories.map((category) => (
                  <li key={category.id}>
                    <Link
                      href={`/products?category=${category.slug}`}
                      className="block rounded-md px-3 py-2 text-sm hover:bg-surface"
                    >
                      {category.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </details>
          )}

          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-md px-3 py-2 text-sm font-medium hover:bg-surface"
            >
              {link.label}
            </Link>
          ))}

          <ThemeToggle />

          <Link
            href="/quote"
            className="ml-1 bg-accent-solid px-4 py-2 text-sm font-semibold text-accent-foreground hover:opacity-90"
          >
            Request a quote
          </Link>
        </nav>

        {/* On mobile the toggle sits beside the menu button rather than inside
            the drawer, so it does not need two taps. */}
        <div className="ml-auto flex items-center gap-1 md:hidden">
          <ThemeToggle />

          <details className="group [&_summary::-webkit-details-marker]:hidden">
            <summary
              aria-label="Menu"
              className="flex cursor-pointer list-none items-center rounded-md p-2 hover:bg-surface"
            >
              <svg aria-hidden="true" viewBox="0 0 20 20" className="size-5">
                <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="1.5" />
              </svg>
            </summary>

            <div className="absolute inset-x-0 top-16 border-b border-border bg-background p-4 shadow-lg">
              <nav aria-label="Mobile" className="flex flex-col gap-1">
                {NAV_LINKS.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="rounded-md px-3 py-2 text-sm font-medium hover:bg-surface"
                  >
                    {link.label}
                  </Link>
                ))}

                {categories.length > 0 && (
                  <>
                    <p className="px-3 pb-1 pt-3 text-xs font-semibold uppercase tracking-wide text-muted">
                      {SITE.tagline}
                    </p>
                    {categories.map((category) => (
                      <Link
                        key={category.id}
                        href={`/products?category=${category.slug}`}
                        className="rounded-md px-3 py-2 text-sm text-muted hover:bg-surface"
                      >
                        {category.name}
                      </Link>
                    ))}
                  </>
                )}

                <Link
                  href="/quote"
                  className="mt-2 bg-accent-solid px-4 py-2 text-center text-sm font-semibold text-accent-foreground"
                >
                  Request a quote
                </Link>
              </nav>
            </div>
          </details>
        </div>
      </div>
    </header>
  );
}
