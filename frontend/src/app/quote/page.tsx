import type { Metadata } from "next";

import { QuoteForm } from "@/components/site/quote-form";
import { SectionHeading } from "@/components/site/section-heading";
import { allServices } from "@/lib/content";
import { SITE } from "@/lib/site";

/**
 * The quote enquiry page — the action the whole site funnels to.
 *
 * `?product=<slug>` preselects a product, which is how the CTA on a product
 * page arrives here.
 */

export const metadata: Metadata = {
  title: "Request a quote",
  description: `Send your requirement and quantities to ${SITE.name} and we reply with a costed quote.`,
  alternates: { canonical: "/quote" },
};

const STEPS = [
  "Tell us the product, quantity and any detail you already have.",
  "We come back with a costed quote, usually within one working day.",
  "Approve it and we draft the pattern and produce a mockup before cutting.",
] as const;

export default async function QuotePage({ searchParams }: PageProps<"/quote">) {
  const raw = await searchParams;
  const slug = Array.isArray(raw.product) ? raw.product[0] : raw.product;

  /*
   * The full catalogue rather than a page of it: this is a select, and a
   * product missing from the list is a product nobody can enquire about.
   */
  const products = await allServices();
  const preselected = products.find((product) => product.slug === slug);

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
      <SectionHeading
        id="quote-heading"
        level={1}
        title="Request a quote"
        lead="Every order is made to specification, so pricing depends on the garment, the quantity and the finishing. Tell us what you need and we will cost it."
      />

      <div className="mt-12 grid gap-12 lg:grid-cols-[1.4fr_1fr] lg:gap-20">
        <QuoteForm products={products} defaultProductId={preselected?.id} />

        <aside className="lg:pt-2">
          <h2 className="font-display text-xl font-semibold uppercase tracking-tight">
            What happens next
          </h2>

          <ol className="mt-4 space-y-4">
            {STEPS.map((step, index) => (
              <li key={step} className="flex gap-4">
                <span
                  aria-hidden="true"
                  className="font-display text-2xl font-bold leading-none text-accent tabular-nums"
                >
                  {index + 1}
                </span>
                <span className="text-sm leading-relaxed text-muted">{step}</span>
              </li>
            ))}
          </ol>

          <div className="mt-8 border-t border-border pt-6 text-sm text-muted">
            <p>Prefer to talk?</p>
            <p className="mt-2">
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
          </div>
        </aside>
      </div>
    </main>
  );
}
