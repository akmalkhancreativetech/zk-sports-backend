import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { HeroCarousel } from "@/components/site/hero-carousel";
import { JsonLd } from "@/components/site/json-ld";
import { SectionHeading } from "@/components/site/section-heading";
import { ServiceCard } from "@/components/site/service-card";
import { apiGet, apiGetOrNull } from "@/lib/api";
import { PROCESS, STATS, STRENGTHS } from "@/lib/company";
import { serviceCategories } from "@/lib/content";
import { sectionBackground } from "@/lib/section-background";
import { LOGO, SITE, SITE_URL } from "@/lib/site";
import {
  blogPostSchema,
  paginated,
  serviceSchema,
  sliderSchema,
  type BlogPost,
  type Service,
  type Slider,
} from "@/lib/schemas";

/**
 * The public home page.
 *
 * Every section below is backed by a real endpoint except the stats band, the
 * process steps and "Why work with us", which have no model behind them yet and
 * are static copy by decision, not oversight.
 */

/**
 * The root layout already supplies title, description and the OG defaults; this
 * only adds the canonical. Self-referencing canonicals matter here because the
 * capabilities links carry `?category=` query strings, and without one a
 * crawler can treat those as duplicate home pages.
 */
export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

async function heroSlider(): Promise<Slider | null> {
  // A missing `home_hero` is a legitimate state on a fresh database, so a 404
  // here means "no hero yet", not a broken page.
  return apiGetOrNull("sliders/home_hero", sliderSchema);
}

async function featuredServices(): Promise<Service[]> {
  const { data } = await apiGet("services", paginated(serviceSchema), {
    searchParams: { featured: 1 },
  });

  return data;
}

async function latestPosts(): Promise<BlogPost[]> {
  // The posts index has no per-page parameter, so the teaser count is applied
  // here rather than pretending the API supports one.
  const { data } = await apiGet("posts", paginated(blogPostSchema));

  return data.slice(0, 3);
}

export default async function Home() {
  const [slider, services, categories, posts] = await Promise.all([
    heroSlider(),
    featuredServices(),
    serviceCategories(),
    latestPosts(),
  ]);

  const capabilitiesBackground = sectionBackground("capabilities");

  /*
   * Organization identifies the business itself; WebSite is what lets Google
   * attribute the two together. Both belong on the home page only — repeating
   * them per route dilutes rather than reinforces.
   */
  const organizationLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE.name,
    url: SITE_URL,
    // Google uses this for the knowledge-panel mark, so it points at the badge
    // rather than the OG card.
    logo: `${SITE_URL}${LOGO.badge.src}`,
    description: SITE.description,
    email: SITE.email,
    telephone: SITE.phone,
    address: {
      "@type": "PostalAddress",
      addressLocality: "Sialkot",
      addressRegion: "Punjab",
      addressCountry: "PK",
    },
    makesOffer: categories.map((category) => ({
      "@type": "Offer",
      itemOffered: { "@type": "Service", name: category.name },
    })),
  };

  const webSiteLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE.name,
    url: SITE_URL,
  };


  return (
    <main>
      <JsonLd data={organizationLd} />
      <JsonLd data={webSiteLd} />

      {slider ? (
        <HeroCarousel
          slider={slider}
          fallbackHeading={`${SITE.name} — ${SITE.tagline}`}
        />
      ) : (
        <section className="bg-brand px-4 py-28 text-brand-foreground sm:px-6">
          <div className="mx-auto w-full max-w-6xl">
            <h1 className="max-w-4xl font-display text-5xl font-bold uppercase leading-[0.9] tracking-tight text-balance sm:text-7xl">
              Custom sportswear, manufactured to your specification
            </h1>
            <p className="mt-6 max-w-xl text-white/70">
              No active <code>home_hero</code> slides yet — add one in the admin
              panel and this section fills in.
            </p>
            <Link
              href="/quote"
              className="mt-8 inline-block bg-accent-solid px-7 py-3.5 text-sm font-semibold text-accent-foreground hover:opacity-90"
            >
              Request a quote
            </Link>
          </div>
        </section>
      )}

      {/*
       * The spec strip. Read as a row from a datasheet rather than four
       * marketing tiles: hairline-separated columns, values in the display face
       * with tabular figures so the digits align.
       */}
      <section aria-label="At a glance" className="border-b border-border bg-surface">
        <dl className="mx-auto grid w-full max-w-6xl grid-cols-2 px-4 sm:px-6 lg:grid-cols-4">
          {STATS.map((stat, index) => (
            <div
              key={stat.label}
              className={`py-8 lg:py-10 ${
                index > 0 ? "sm:border-l sm:border-border sm:pl-8" : ""
              } ${index === 2 ? "lg:border-l" : ""}`}
            >
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
              <dd className="mt-1 font-display text-4xl font-bold tabular-nums leading-none sm:text-5xl">
                {stat.value}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      {categories.length > 0 && (
        /*
         * Backed by `public/images/capabilities.{webp,jpg,png}` when that file
         * exists — a factory-floor shot behind the whole section. Without it
         * the section keeps its plain treatment, so the page never depends on
         * artwork that has not been supplied.
         */
        <section
          aria-labelledby="capabilities-heading"
          className={`relative ${capabilitiesBackground ? "text-white" : ""}`}
        >
          {capabilitiesBackground && (
            <>
              <Image
                src={capabilitiesBackground}
                alt=""
                fill
                className="object-cover"
                sizes="100vw"
              />

              {/*
               * The brand charcoal at 88%, not plain black: it ties the band to
               * the hero and CTA panels, and it is opaque enough that the copy
               * clears AA over any part of the photograph beneath.
               */}
              <span aria-hidden="true" className="absolute inset-0 bg-brand/[0.88]" />
            </>
          )}

          <div className="relative mx-auto w-full max-w-6xl px-4 py-24 sm:px-6">
            <SectionHeading
              id="capabilities-heading"
              title="What we make"
              lead="Every garment drafted, cut, printed and stitched to your specification — nothing leaves the factory half-made."
              meta={`${categories.length} ${categories.length === 1 ? "category" : "categories"}`}
              link={{ href: "/products", label: "All products" }}
              tone={capabilitiesBackground ? "onDark" : "default"}
            />

            {/*
             * A plain list, not a numbered one. These are a taxonomy the admin
             * sorts by hand, not a sequence — numbering them would assert an
             * order the content does not have. The rules alone carry the
             * structure.
             */}
            <ul
              className={`mt-12 grid border-t sm:grid-cols-2 lg:grid-cols-3 ${
                capabilitiesBackground ? "border-white/25" : "border-border"
              }`}
            >
              {categories.map((category) => (
                <li
                  key={category.id}
                  className={`border-b sm:odd:border-r lg:odd:border-r-0 lg:[&:not(:nth-child(3n))]:border-r ${
                    capabilitiesBackground ? "border-white/25" : "border-border"
                  }`}
                >
                  <Link
                    href={`/products?category=${category.slug}`}
                    className={`flex h-full flex-col p-7 ${
                      capabilitiesBackground ? "hover:bg-white/10" : "hover:bg-surface"
                    }`}
                  >
                    <span className="font-display text-2xl font-semibold uppercase leading-none tracking-tight">
                      {category.name}
                    </span>

                    {category.description && (
                      <span
                        className={`mt-2.5 line-clamp-3 text-sm leading-relaxed ${
                          capabilitiesBackground ? "text-white/75" : "text-muted"
                        }`}
                      >
                        {category.description}
                      </span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {services.length > 0 && (
        <section
          aria-labelledby="services-heading"
          className="border-y border-border bg-surface"
        >
          <div className="mx-auto w-full max-w-6xl px-4 py-24 sm:px-6">
            <SectionHeading
              id="services-heading"
              title="Most requested products"
              link={{ href: "/products", label: "View all products" }}
            />

            <ul className="mt-12 grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
              {services.map((service) => (
                <li key={service.id}>
                  <ServiceCard service={service} />
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/*
       * The one place boldness is spent: the four steps as squad numbers, the
       * numerals you would print on the back of a shirt. Nothing else on the
       * page competes with it.
       */}
      <section
        aria-labelledby="process-heading"
        className="mx-auto w-full max-w-6xl px-4 py-24 sm:px-6"
      >
        <SectionHeading
          id="process-heading"
          title="Brief to delivery in four steps"
        />

        <ol className="mt-12 grid gap-x-10 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
          {PROCESS.map((step, index) => (
            <li key={step.title} className="border-t border-border pt-6">
              <span
                aria-hidden="true"
                className="block font-display text-7xl font-bold leading-[0.8] tracking-tighter text-transparent sm:text-8xl"
                style={{ WebkitTextStroke: "2px var(--accent-bright)" }}
              >
                {String(index + 1).padStart(2, "0")}
              </span>

              <h3 className="mt-6 font-display text-2xl font-semibold uppercase leading-none tracking-tight">
                {step.title}
              </h3>
              <p className="mt-2.5 text-sm leading-relaxed text-muted text-pretty">
                {step.body}
              </p>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="strengths-heading" className="border-t border-border bg-surface">
        <div className="mx-auto grid w-full max-w-6xl gap-x-16 gap-y-12 px-4 py-24 sm:px-6 lg:grid-cols-[0.9fr_1.1fr]">
          <SectionHeading
            id="strengths-heading"
            title="A factory, not a reseller"
          />

          {/* A definition list, because that is what this is: term and detail. */}
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

      {posts.length > 0 && (
        <section aria-labelledby="blog-heading" className="border-t border-border">
          <div className="mx-auto w-full max-w-6xl px-4 py-24 sm:px-6">
            <SectionHeading
              id="blog-heading"
              title="Guides and news"
              link={{ href: "/blog", label: "All posts" }}
            />

            <ul className="mt-12 grid gap-10 sm:grid-cols-3">
              {posts.map((post) => (
                <li key={post.id} className="border-t-2 border-foreground">
                  <Link href={`/blog/${post.slug}`} className="group flex h-full flex-col">
                    <div className="relative aspect-16/10 w-full overflow-hidden bg-surface">
                      {post.featured_image_url && (
                        <Image
                          src={post.featured_image_url}
                          alt={post.featured_image_alt ?? ""}
                          fill
                          className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
                          sizes="(max-width: 640px) 100vw, 33vw"
                        />
                      )}
                    </div>

                    <time
                      dateTime={post.published_at}
                      className="mt-4 text-sm tabular-nums text-muted"
                    >
                      {/*
                       * `en-GB` with an explicit UTC zone, not the runtime
                       * default: the server and the visitor's browser are in
                       * different locales and zones, and letting either decide
                       * produces a hydration mismatch.
                       */}
                      {new Date(post.published_at).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        timeZone: "UTC",
                      })}
                    </time>

                    <h3 className="mt-1.5 font-display text-2xl font-semibold uppercase leading-none tracking-tight">
                      {post.title}
                    </h3>

                    {post.excerpt && (
                      <p className="mt-2.5 line-clamp-3 text-sm leading-relaxed text-muted">
                        {post.excerpt}
                      </p>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      <section className="bg-brand text-brand-foreground">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-end justify-between gap-8 px-4 py-20 sm:px-6">
          <div>
            <h2 className="max-w-2xl font-display text-4xl font-bold uppercase leading-[0.95] tracking-tight text-balance sm:text-5xl">
              Ready to kit out your team?
            </h2>
            <p className="mt-4 max-w-lg text-white/70 text-pretty">
              Send your requirement and quantities. We reply with a costed quote.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/quote"
              className="bg-accent-solid px-7 py-3.5 text-sm font-semibold text-accent-foreground hover:opacity-90"
            >
              Request a quote
            </Link>

            <a
              href={`mailto:${SITE.email}`}
              className="border border-white/25 px-7 py-3.5 text-sm font-semibold hover:bg-white/10"
            >
              Email us
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
