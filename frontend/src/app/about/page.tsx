import type { Metadata } from "next";
import Link from "next/link";

import { SectionHeading } from "@/components/site/section-heading";
import { PROCESS, STATS, STRENGTHS } from "@/lib/company";
import { serviceCategories } from "@/lib/content";
import { SITE } from "@/lib/site";

/**
 * Who the company is and how it works.
 *
 * The only data here is the category list; everything else is company fact,
 * which lives in lib/company.ts so this page and the home page cannot disagree.
 * No Organization JSON-LD — that belongs on the home page alone, and repeating
 * it dilutes rather than reinforces.
 */

export const metadata: Metadata = {
  title: "About us",
  description: `${SITE.name} is a cut-and-sew sportswear manufacturer in ${SITE.address}, making custom teamwear to order for clubs, schools and distributors.`,
  alternates: { canonical: "/about" },
};

/** Placeholder copy — see the note in lib/company.ts. */
const STORY = [
  `${SITE.name} is a cut-and-sew manufacturer in Sialkot, making custom sportswear to order. We are not a print shop working from blanks: patterns are drafted per order, fabric is cut in house, and the garment is built to the specification a club actually asked for.`,
  "That matters most on the details a catalogue cannot cover — a colourway that has to match a badge, a sponsor panel that has to sit in a particular place, a size run that includes both a junior keeper and a senior prop.",
  "Work runs through one building, so a question about a seam or a print does not have to travel through three subcontractors before it reaches someone who can answer it.",
];

export default async function AboutPage() {
  const categories = await serviceCategories();

  return (
    <main>
      <section className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
        <SectionHeading
          id="about-heading"
          level={1}
          title="A factory, not a reseller"
          lead={`${SITE.name} manufactures custom teamwear to order — drafted, cut, printed and stitched under one roof in ${SITE.address}.`}
        />

        <div className="mt-12 grid gap-10 lg:grid-cols-2 lg:gap-16">
          <div className="space-y-5">
            {STORY.map((paragraph) => (
              <p key={paragraph} className="leading-relaxed text-muted text-pretty">
                {paragraph}
              </p>
            ))}
          </div>

          <dl className="grid grid-cols-2 gap-px self-start bg-border">
            {STATS.map((stat) => (
              <div key={stat.label} className="bg-background p-6">
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className="size-6 text-accent"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  {stat.paths.map((path) => (
                    <path key={path} d={path} />
                  ))}
                </svg>

                <dt className="mt-3 text-sm text-muted">{stat.label}</dt>
                <dd className="mt-1 font-display text-4xl font-bold tabular-nums leading-none">
                  {stat.value}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {categories.length > 0 && (
        <section
          aria-labelledby="what-we-make-heading"
          className="border-y border-border bg-surface"
        >
          <div className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6">
            <SectionHeading
              id="what-we-make-heading"
              title="What we make"
              meta={`${categories.length} ${categories.length === 1 ? "category" : "categories"}`}
              link={{ href: "/products", label: "All products" }}
            />

            <ul className="mt-10 flex flex-wrap gap-2">
              {categories.map((category) => (
                <li key={category.id}>
                  <Link
                    href={`/products?category=${category.slug}`}
                    className="block border border-border bg-background px-5 py-3 font-display text-lg font-semibold uppercase tracking-tight hover:border-foreground"
                  >
                    {category.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      <section
        aria-labelledby="how-we-work-heading"
        className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6"
      >
        <SectionHeading id="how-we-work-heading" title="How an order runs" />

        {/* A real sequence, so it is numbered and ordered. */}
        <ol className="mt-10 grid gap-x-10 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
          {PROCESS.map((step, index) => (
            <li key={step.title} className="border-t border-border pt-5">
              <span
                aria-hidden="true"
                className="block font-display text-5xl font-bold leading-[0.8] tracking-tighter text-transparent"
                style={{ WebkitTextStroke: "2px var(--accent-bright)" }}
              >
                {String(index + 1).padStart(2, "0")}
              </span>

              <h3 className="mt-4 font-display text-xl font-semibold uppercase leading-none tracking-tight">
                {step.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted text-pretty">
                {step.body}
              </p>
            </li>
          ))}
        </ol>
      </section>

      <section
        aria-labelledby="strengths-heading"
        className="border-t border-border bg-surface"
      >
        <div className="mx-auto grid w-full max-w-6xl gap-x-16 gap-y-10 px-4 py-20 sm:px-6 lg:grid-cols-[0.9fr_1.1fr]">
          <SectionHeading id="strengths-heading" title="Why clubs come back" />

          <dl className="grid gap-x-10 sm:grid-cols-2">
            {STRENGTHS.map((strength) => (
              <div key={strength.title} className="border-t border-border py-5">
                <dt className="font-display text-xl font-semibold uppercase leading-none tracking-tight">
                  {strength.title}
                </dt>
                <dd className="mt-2 text-sm leading-relaxed text-muted text-pretty">
                  {strength.body}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="bg-brand text-brand-foreground">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-end justify-between gap-8 px-4 py-16 sm:px-6">
          <div>
            <h2 className="max-w-2xl font-display text-3xl font-bold uppercase leading-[0.95] tracking-tight text-balance sm:text-4xl">
              Tell us what your team needs
            </h2>

            <address className="mt-4 space-y-1 text-sm not-italic text-white/70">
              <p>{SITE.address}</p>
              <p>
                <a href={`mailto:${SITE.email}`} className="hover:text-white">
                  {SITE.email}
                </a>
              </p>
              <p>
                <a
                  href={`tel:${SITE.phone.replace(/\s/g, "")}`}
                  className="hover:text-white"
                >
                  {SITE.phone}
                </a>
              </p>
            </address>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/quote"
              className="bg-accent-solid px-7 py-3.5 text-sm font-semibold text-accent-foreground hover:opacity-90"
            >
              Request a quote
            </Link>

            <Link
              href="/products"
              className="border border-white/25 px-7 py-3.5 text-sm font-semibold hover:bg-white/10"
            >
              Browse products
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
