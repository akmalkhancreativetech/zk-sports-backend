import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { SectionHeading } from "@/components/site/section-heading";
import { ServiceCard } from "@/components/site/service-card";
import { apiGet } from "@/lib/api";
import { serviceCategories } from "@/lib/content";
import { paginated, serviceSchema, type ServiceCategory } from "@/lib/schemas";
import { SITE } from "@/lib/site";

/**
 * The product catalogue.
 *
 * Reads `/api/v1/services`, which the public site calls products — see the note
 * in lib/site.ts. Filtering and paging happen through the URL rather than
 * client state, so the whole page stays a server component and every filtered
 * view is a real, linkable, crawlable address.
 */

type Search = { category?: string; search?: string; page?: string };

/** Rebuild the querystring with one value changed, dropping empties. */
function hrefWith(current: Search, changes: Search): string {
  const params = new URLSearchParams();
  const merged = { ...current, ...changes };

  for (const key of ["category", "search", "page"] as const) {
    const value = merged[key];

    // `page=1` is the default view; leaving it off keeps the canonical clean.
    if (value && !(key === "page" && value === "1")) {
      params.set(key, value);
    }
  }

  const query = params.toString();

  return query ? `/products?${query}` : "/products";
}

async function resolveSearch(
  searchParams: Promise<Record<string, string | string[] | undefined>>,
): Promise<Search> {
  const raw = await searchParams;

  // A repeated param arrives as an array; the API takes one value, so the
  // first wins rather than the request failing.
  const one = (value: string | string[] | undefined) =>
    Array.isArray(value) ? value[0] : value;

  return {
    category: one(raw.category),
    search: one(raw.search),
    page: one(raw.page),
  };
}

export async function generateMetadata({
  searchParams,
}: PageProps<"/products">): Promise<Metadata> {
  const search = await resolveSearch(searchParams);
  const categories = await serviceCategories();
  const active = categories.find((c) => c.slug === search.category);

  const title = active ? `${active.name} products` : "Products";

  return {
    title,
    description: active
      ? `${active.name} manufactured to your specification by ${SITE.name}.`
      : SITE.description,
    /*
     * Self-referencing and parameter-aware: a filtered or paged view is a
     * distinct page, and pointing them all at /products would ask Google to
     * drop every one of them from the index.
     */
    alternates: { canonical: hrefWith(search, {}) },
  };
}

function CategoryFilter({
  categories,
  search,
}: {
  categories: readonly ServiceCategory[];
  search: Search;
}) {
  const filters = [{ name: "All", slug: undefined }, ...categories];

  return (
    <nav aria-label="Filter by category" className="mt-10 flex flex-wrap gap-2">
      {filters.map((filter) => {
        const isActive = (search.category ?? undefined) === filter.slug;

        return (
          <Link
            key={filter.slug ?? "all"}
            // Changing the filter returns to the first page; staying on page 4
            // of a category with two pages is an empty screen.
            href={hrefWith(search, { category: filter.slug, page: undefined })}
            aria-current={isActive ? "page" : undefined}
            className={`border px-4 py-2 text-sm font-medium ${
              isActive
                ? "border-foreground bg-foreground text-background"
                : "border-border text-muted hover:border-foreground hover:text-foreground"
            }`}
          >
            {filter.name}
          </Link>
        );
      })}
    </nav>
  );
}

export default async function ProductsPage({ searchParams }: PageProps<"/products">) {
  const search = await resolveSearch(searchParams);

  const [{ data: products, meta }, categories] = await Promise.all([
    apiGet("services", paginated(serviceSchema), {
      searchParams: {
        category: search.category,
        search: search.search,
        page: search.page,
      },
    }),
    serviceCategories(),
  ]);

  const active = categories.find((c) => c.slug === search.category);

  /*
   * A category that does not exist, or a page past the end, is a 404 rather
   * than an empty 200. Both are reachable by guessing a URL, and both would
   * otherwise be thin pages carrying a self-referencing canonical — an
   * invitation for a crawler to index an infinite supply of blank listings.
   *
   * An empty result from a real search term is different: that is a legitimate
   * answer, and it stays a 200.
   */
  if (search.category && !active) {
    notFound();
  }

  if (meta.current_page > meta.last_page) {
    notFound();
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
      <SectionHeading
        id="products-heading"
        level={1}
        title={active ? active.name : "Everything we make"}
        lead={
          active?.description ??
          "Every garment drafted, cut, printed and stitched to your specification. Prices are indicative — send us your quantities for a costed quote."
        }
        meta={`${meta.total} ${meta.total === 1 ? "product" : "products"}`}
      />

      <CategoryFilter categories={categories} search={search} />

      {/*
       * A GET form, so searching needs no JavaScript and produces a shareable
       * URL. The hidden field keeps the active category when a term is
       * submitted, which a bare form would silently discard.
       */}
      <form action="/products" className="mt-4 flex max-w-md gap-2">
        {search.category && (
          <input type="hidden" name="category" value={search.category} />
        )}

        <label htmlFor="product-search" className="sr-only">
          Search products
        </label>

        <input
          id="product-search"
          type="search"
          name="search"
          defaultValue={search.search ?? ""}
          placeholder="Search products"
          className="min-w-0 flex-1 border border-border bg-background px-4 py-2 text-sm placeholder:text-muted"
        />

        <button
          type="submit"
          className="bg-accent-solid px-5 py-2 text-sm font-semibold text-accent-foreground hover:opacity-90"
        >
          Search
        </button>
      </form>

      {products.length === 0 ? (
        <p className="mt-16 border-t border-border pt-8 text-muted">
          {search.search
            ? `No products match “${search.search}”.`
            : "No products here yet."}{" "}
          <Link href="/products" className="font-semibold text-accent hover:underline">
            Clear filters
          </Link>
        </p>
      ) : (
        <ul className="mt-12 grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <li key={product.id}>
              <ServiceCard service={product} />
            </li>
          ))}
        </ul>
      )}

      {meta.last_page > 1 && (
        <nav
          aria-label="Pagination"
          className="mt-16 flex items-center justify-between border-t border-border pt-6"
        >
          {meta.current_page > 1 ? (
            <Link
              href={hrefWith(search, { page: String(meta.current_page - 1) })}
              rel="prev"
              className="border border-border px-5 py-2.5 text-sm font-semibold hover:border-foreground"
            >
              Previous
            </Link>
          ) : (
            // A span, not a disabled link: there is no previous page to point
            // at, and a dead anchor is a link a crawler will still follow.
            <span className="text-sm text-muted">Previous</span>
          )}

          <p className="text-sm tabular-nums text-muted">
            Page {meta.current_page} of {meta.last_page}
          </p>

          {meta.current_page < meta.last_page ? (
            <Link
              href={hrefWith(search, { page: String(meta.current_page + 1) })}
              rel="next"
              className="border border-border px-5 py-2.5 text-sm font-semibold hover:border-foreground"
            >
              Next
            </Link>
          ) : (
            <span className="text-sm text-muted">Next</span>
          )}
        </nav>
      )}
    </main>
  );
}
