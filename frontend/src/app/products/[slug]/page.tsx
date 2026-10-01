import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { z } from "zod";

import { JsonLd } from "@/components/site/json-ld";
import { ProductEnquiryForm } from "@/components/site/product-enquiry-form";
import { ProductGallery, type GalleryImage } from "@/components/site/product-gallery";
import { ProductIcon } from "@/components/site/product-icon";
import { ApiError, apiGet } from "@/lib/api";
import { serviceSchema, type Service } from "@/lib/schemas";
import { SITE, SITE_URL } from "@/lib/site";

/**
 * A single product.
 *
 * Reads `/api/v1/services/{slug}`, which the public site calls a product — see
 * the note in lib/site.ts.
 */

const productSchema = z.object({ data: serviceSchema });

/**
 * `cache` so `generateMetadata` and the page body share one request. Without it
 * every render fetches the same product twice, once for the head and once for
 * the body.
 */
const getProduct = cache(async (slug: string): Promise<Service | null> => {
  try {
    const { data } = await apiGet(`services/${slug}`, productSchema);

    return data;
  } catch (error) {
    // An inactive or missing product is a 404, which the caller turns into the
    // not-found page. Anything else is a real fault and should surface.
    if (error instanceof ApiError && error.isNotFound) {
      return null;
    }

    throw error;
  }
});

export async function generateMetadata({
  params,
}: PageProps<"/products/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProduct(slug);

  if (!product) {
    return { title: "Product not found" };
  }

  // The admin's SEO fields win where they are filled in; the editorial title
  // and excerpt are the fallback rather than a duplicate of them.
  const title = product.meta_title ?? product.title;
  const description = product.meta_description ?? product.excerpt ?? SITE.description;
  const image = product.og_image_url ?? product.featured_image_url;

  return {
    title,
    description,
    alternates: { canonical: `/products/${product.slug}` },
    openGraph: {
      type: "website",
      title,
      description,
      url: `/products/${product.slug}`,
      ...(image ? { images: [{ url: image }] } : {}),
    },
  };
}

function Breadcrumb({ product }: { product: Service }) {
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted">
        <li>
          <Link href="/products" className="hover:text-foreground">
            Products
          </Link>
        </li>

        {product.category && (
          <li className="flex items-center gap-2">
            <span aria-hidden="true">/</span>
            <Link
              href={`/products?category=${product.category.slug}`}
              className="hover:text-foreground"
            >
              {product.category.name}
            </Link>
          </li>
        )}

        <li className="flex items-center gap-2">
          <span aria-hidden="true">/</span>
          <span aria-current="page" className="text-foreground">
            {product.title}
          </span>
        </li>
      </ol>
    </nav>
  );
}

export default async function ProductPage({ params }: PageProps<"/products/[slug]">) {
  const { slug } = await params;
  const product = await getProduct(slug);

  if (!product) {
    notFound();
  }

  // The featured image leads, then the gallery. `id: 0` is safe as a key: the
  // gallery rows are real records and their ids start at 1.
  const gallery: GalleryImage[] = [
    ...(product.featured_image_url
      ? [{ id: 0, url: product.featured_image_url, alt: product.title }]
      : []),
    ...(product.images ?? []).map((image) => ({
      id: image.id,
      url: image.url,
      alt: image.alt ?? product.title,
    })),
  ];

  /*
   * `Product`, not `Service`: these are physical garments, and Product is the
   * type Google renders rich results for.
   *
   * `offers` is deliberately absent. An offer requires `priceCurrency`, and
   * `services` has no currency column — publishing a price without one is
   * invalid markup, and guessing the currency would be worse than omitting it.
   * Add the field and an AggregateOffer with `lowPrice` belongs here.
   */
  const productLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    description: product.meta_description ?? product.excerpt ?? undefined,
    sku: product.slug,
    brand: { "@type": "Brand", name: SITE.name },
    ...(product.category ? { category: product.category.name } : {}),
    ...(gallery.length > 0 ? { image: gallery.map((image) => image.url) } : {}),
  };

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Products", item: `${SITE_URL}/products` },
      ...(product.category
        ? [
            {
              "@type": "ListItem",
              position: 2,
              name: product.category.name,
              item: `${SITE_URL}/products?category=${product.category.slug}`,
            },
          ]
        : []),
      {
        "@type": "ListItem",
        position: product.category ? 3 : 2,
        name: product.title,
        item: `${SITE_URL}/products/${product.slug}`,
      },
    ],
  };

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
      <JsonLd data={productLd} />
      <JsonLd data={breadcrumbLd} />

      <Breadcrumb product={product} />

      <div className="mt-8 grid gap-12 lg:grid-cols-2 lg:gap-16">
        {/* Gallery. Contained on the sampled near-white backdrop, the same
            treatment as the hero, so a whole garment is always visible. */}
        <ProductGallery images={gallery} />

        {/* Details. */}
        <div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <ProductIcon name={product.icon} />

            {product.category && (
              <p className="text-sm text-muted">{product.category.name}</p>
            )}

            {product.is_featured && (
              <p className="border border-accent px-2 py-0.5 text-xs font-semibold text-accent">
                Featured
              </p>
            )}
          </div>

          <h1 className="mt-2 font-display text-4xl font-bold uppercase leading-[0.95] tracking-tight text-balance sm:text-5xl">
            {product.title}
          </h1>

          {product.excerpt && (
            <p className="mt-4 text-lg text-muted text-pretty">{product.excerpt}</p>
          )}

          {/* The spec rail: the facts a buyer needs before enquiring. */}
          <dl className="mt-8 flex flex-wrap gap-x-12 gap-y-6 border-y border-border py-6">
            <div>
              <dt className="text-xs text-muted">from</dt>
              <dd className="mt-1 font-display text-3xl font-bold tabular-nums leading-none">
                {product.price_from ?? "Price on enquiry"}
                {product.price_from && product.price_unit && (
                  <span className="ml-1.5 font-sans text-sm font-medium text-muted">
                    {product.price_unit}
                  </span>
                )}
              </dd>
            </div>

            {product.min_order_quantity && (
              <div>
                <dt className="text-xs text-muted">min qty</dt>
                <dd className="mt-1 font-display text-3xl font-bold tabular-nums leading-none">
                  {product.min_order_quantity}
                </dd>
              </div>
            )}
          </dl>

          {product.price_tiers && product.price_tiers.length > 0 && (
            <div className="mt-8">
              <h2 className="font-display text-xl font-semibold uppercase tracking-tight">
                Quantity pricing
              </h2>

              <table className="mt-3 w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted">
                    <th scope="col" className="py-2 font-medium">
                      Quantity
                    </th>
                    <th scope="col" className="py-2 text-right font-medium">
                      Unit price
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {product.price_tiers.map((tier) => (
                    <tr key={tier.id} className="border-b border-border">
                      <td className="py-2.5">{tier.range_label}</td>
                      <td className="py-2.5 text-right font-semibold tabular-nums">
                        {tier.unit_price}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {product.options && product.options.length > 0 && (
            <div className="mt-8">
              <h2 className="font-display text-xl font-semibold uppercase tracking-tight">
                Options
              </h2>

              <dl className="mt-3 space-y-3">
                {product.options.map((option) => (
                  <div key={option.id} className="border-b border-border pb-3">
                    <dt className="text-sm font-semibold">
                      {option.name}
                      {option.is_required && (
                        <span className="ml-2 text-xs font-normal text-muted">
                          required
                        </span>
                      )}
                    </dt>

                    <dd className="mt-1.5 text-sm text-muted">
                      {/*
                       * A `text` option has no values to list — it is free
                       * input the buyer fills in, so listing nothing and saying
                       * so is the honest rendering.
                       */}
                      {option.type === "text" || !option.values?.length ? (
                        "Specify when you enquire"
                      ) : (
                        <ul className="flex flex-wrap gap-x-4 gap-y-1">
                          {option.values.map((value) => (
                            <li key={value.id}>
                              {value.label}
                              {/*
                               * The surcharge is the whole point of the field;
                               * a zero delta is noise, so only a real one is
                               * shown. A string on the wire, and it stays one —
                               * see the money note in schemas.ts.
                               */}
                              {value.price_delta &&
                                Number(value.price_delta) !== 0 && (
                                  <span className="ml-1 font-medium text-foreground tabular-nums">
                                    {Number(value.price_delta) > 0 ? "+" : ""}
                                    {value.price_delta}
                                  </span>
                                )}
                            </li>
                          ))}
                        </ul>
                      )}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          )}

          <div className="mt-10 flex flex-wrap gap-3">
            {/* An anchor to the form further down this page, not a trip to
                /quote: the enquiry form here already knows the product and its
                options, which the generic one cannot. */}
            <a
              href="#enquire"
              className="bg-accent-solid px-7 py-3.5 text-sm font-semibold text-accent-foreground hover:opacity-90"
            >
              Request a quote
            </a>

            <a
              href={`mailto:${SITE.email}?subject=${encodeURIComponent(
                `Enquiry: ${product.title}`,
              )}`}
              className="border border-border px-7 py-3.5 text-sm font-semibold hover:border-foreground"
            >
              Email us
            </a>
          </div>
        </div>
      </div>

      {product.description && (
        <section aria-labelledby="description-heading" className="mt-16 max-w-3xl">
          <h2
            id="description-heading"
            className="font-display text-2xl font-semibold uppercase tracking-tight"
          >
            Details
          </h2>

          {/*
           * Plain text, not HTML: the admin edits this in a textarea, so the
           * only structure it carries is the line breaks the editor typed.
           */}
          <p className="mt-4 whitespace-pre-line leading-relaxed text-muted">
            {product.description}
          </p>
        </section>
      )}

      <section
        id="enquire"
        aria-labelledby="enquire-heading"
        className="mt-16 border-t-2 border-foreground pt-8 sm:mt-24"
      >
        <h2
          id="enquire-heading"
          className="font-display text-3xl font-bold uppercase tracking-tight sm:text-4xl"
        >
          Enquire about {product.title}
        </h2>

        <p className="mt-3 max-w-2xl text-muted text-pretty">
          Tell us the quantity and specification. We reply with a costed quote,
          usually within one working day.
        </p>

        <div className="mt-8">
          <ProductEnquiryForm product={product} />
        </div>
      </section>
    </main>
  );
}
