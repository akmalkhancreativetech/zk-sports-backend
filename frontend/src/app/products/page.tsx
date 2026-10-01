import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  CatalogueForm,
  CatalogueLink,
  CatalogueNavigationProvider,
  CatalogueProgress,
  CataloguePending,
} from "@/components/site/catalogue-navigation";
import { CatalogueToolbar } from "@/components/site/catalogue-toolbar";
import { SectionHeading } from "@/components/site/section-heading";
import { ServiceCard } from "@/components/site/service-card";
import { apiGet } from "@/lib/api";
import { catalogueHref, type CatalogueSearch } from "@/lib/catalogue";
import { serviceCategories } from "@/lib/content";
import { paginated, serviceSchema, type ServiceCategory } from "@/lib/schemas";
import { sectionBackground } from "@/lib/section-background";
import { SITE } from "@/lib/site";

/**
 * The product catalogue.
 *
 * Reads `/api/v1/services`, which the public site calls products — see the note
 * in lib/site.ts. Filtering, sorting and paging happen through the URL (see
 * lib/catalogue.ts), so the page stays a server component and every view is a
 * real, linkable address. Only the toolbar and the price form hydrate.
 */

async function resolveSearch(
  searchParams: Promise<Record<string, string | string[] | undefined>>,
): Promise<CatalogueSearch> {
  const raw = await searchParams;

  // A repeated param arrives as an array; the API takes one value, so the
  // first wins rather than the request failing.
  const one = (value: string | string[] | undefined) =>
    (Array.isArray(value) ? value[0] : value)?.trim() || undefined;

  // The API ignores a non-numeric bound; dropping it here too keeps it out of
  // the chips and the canonical.
  const price = (value: string | string[] | undefined) => {
    const bound = one(value);

    return bound && Number.isFinite(Number(bound)) ? bound : undefined;
  };

  return {
    category: one(raw.category),
    search: one(raw.search),
    sort: one(raw.sort),
    min_price: price(raw.min_price),
    max_price: price(raw.max_price),
    page: one(raw.page),
  };
}

/** The chip label for an active price range. */
function priceLabel({ min_price, max_price }: CatalogueSearch): string | null {
  if (min_price && max_price) {
    return `${min_price} – ${max_price}`;
  }

  if (min_price) {
    return `From ${min_price}`;
  }

  return max_price ? `Up to ${max_price}` : null;
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
     * Self-referencing and parameter-aware: a category or page is a distinct
     * listing. Sort is dropped — a reordered list is the same content — and
     * search and price results are kept out of the index entirely, since every
     * typed term or bound would otherwise mint a thin page.
     */
    alternates: { canonical: catalogueHref({ ...search, sort: undefined }) },
    ...(search.search || priceLabel(search)
      ? { robots: { index: false, follow: true } }
      : {}),
  };
}

function Breadcrumb({ category }: { category?: ServiceCategory }) {
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-white/70">
        <li>
          <Link href="/" className="hover:text-white">
            Home
          </Link>
        </li>

        <li className="flex items-center gap-2">
          <span aria-hidden="true">/</span>
          {category ? (
            <Link href="/products" className="hover:text-white">
              Products
            </Link>
          ) : (
            <span aria-current="page" className="text-white">
              Products
            </span>
          )}
        </li>

        {category && (
          <li className="flex items-center gap-2">
            <span aria-hidden="true">/</span>
            <span aria-current="page" className="text-white">
              {category.name}
            </span>
          </li>
        )}
      </ol>
    </nav>
  );
}

/**
 * The category list, rendered in the desktop sidebar and inside the mobile
 * disclosure. Switching category keeps the search term and sort, as a shop's
 * refinements do, and returns to page one.
 */
function CategoryList({
  categories,
  search,
}: {
  categories: readonly ServiceCategory[];
  search: CatalogueSearch;
}) {
  const filters = [{ name: "All products", slug: undefined, services_count: undefined }, ...categories];

  return (
    <ul className="space-y-px">
      {filters.map((filter) => {
        const isActive = search.category === filter.slug;

        return (
          <li key={filter.slug ?? "all"}>
            <CatalogueLink
              href={catalogueHref(search, { category: filter.slug, page: undefined })}
              aria-current={isActive ? "page" : undefined}
              className={`flex items-baseline justify-between gap-4 border-l-2 py-2 pl-3 text-sm ${
                isActive
                  ? "border-accent-bright font-semibold text-foreground"
                  : "border-transparent text-muted hover:text-foreground"
              }`}
            >
              <span>{filter.name}</span>
              {filter.services_count !== undefined && (
                <span className="text-xs tabular-nums text-muted">
                  {filter.services_count}
                </span>
              )}
            </CatalogueLink>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * Min/max bounds on the "from" price. A GET form, so it works without
 * JavaScript, and navigates through the shared loading state. The other
 * refinements ride along as hidden fields, and the page resets to one.
 */
function PriceFilter({ search, idPrefix }: { search: CatalogueSearch; idPrefix: string }) {
  const field =
    "w-full min-w-0 border border-border bg-background px-3 py-2 text-sm tabular-nums placeholder:text-muted focus:border-foreground";

  return (
    <CatalogueForm>
      {(["category", "search", "sort"] as const).map(
        (key) => search[key] && <input key={key} type="hidden" name={key} value={search[key]} />,
      )}

      <div className="flex items-center gap-2">
        <label htmlFor={`${idPrefix}-min`} className="sr-only">
          Minimum price
        </label>
        <input
          id={`${idPrefix}-min`}
          type="number"
          name="min_price"
          min={0}
          step="any"
          inputMode="decimal"
          placeholder="Min"
          defaultValue={search.min_price}
          className={field}
        />
        <span aria-hidden="true" className="text-muted">
          –
        </span>
        <label htmlFor={`${idPrefix}-max`} className="sr-only">
          Maximum price
        </label>
        <input
          id={`${idPrefix}-max`}
          type="number"
          name="max_price"
          min={0}
          step="any"
          inputMode="decimal"
          placeholder="Max"
          defaultValue={search.max_price}
          className={field}
        />
      </div>

      <button
        type="submit"
        className="mt-3 w-full border border-foreground py-2 text-sm font-semibold hover:opacity-80"
      >
        Apply price
      </button>

      <p className="mt-2 text-xs text-muted">
        Matches the starting price. Products priced on enquiry are hidden while a price is set.
      </p>
    </CatalogueForm>
  );
}

/** Category and price refinements, shared by the sidebar and the mobile panel. */
function Filters({
  categories,
  search,
  idPrefix,
}: {
  categories: readonly ServiceCategory[];
  search: CatalogueSearch;
  idPrefix: string;
}) {
  const heading = "mb-3 font-display text-xl font-semibold uppercase tracking-tight";

  return (
    <div className="space-y-8">
      {categories.length > 0 && (
        <section aria-labelledby={`${idPrefix}-category`}>
          <h2 id={`${idPrefix}-category`} className={heading}>
            Category
          </h2>
          <CategoryList categories={categories} search={search} />
        </section>
      )}

      <section aria-labelledby={`${idPrefix}-price`}>
        <h2 id={`${idPrefix}-price`} className={heading}>
          Price
        </h2>
        {/* Keyed so the boxes reset when the range is cleared from a chip. */}
        <PriceFilter
          key={`${search.min_price ?? ""}|${search.max_price ?? ""}`}
          search={search}
          idPrefix={idPrefix}
        />
      </section>
    </div>
  );
}

/** A removable chip for one active refinement. */
function FilterChip({ label, href }: { label: string; href: string }) {
  return (
    <CatalogueLink
      href={href}
      className="inline-flex items-center gap-2 border border-border px-3 py-1.5 text-sm hover:border-foreground"
    >
      {label}
      <span className="sr-only">(remove)</span>
      <svg aria-hidden="true" viewBox="0 0 16 16" className="size-3 text-muted" fill="none">
        <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    </CatalogueLink>
  );
}

/**
 * Page numbers to show: the first, the last, and a window around the current
 * one, with `null` marking each gap.
 */
function pageWindow(current: number, last: number): (number | null)[] {
  const pages = [...new Set([1, current - 1, current, current + 1, last])]
    .filter((page) => page >= 1 && page <= last)
    .sort((a, b) => a - b);

  return pages.flatMap((page, index) =>
    index > 0 && page - pages[index - 1] > 1 ? [null, page] : [page],
  );
}

function Pagination({
  current,
  last,
  search,
}: {
  current: number;
  last: number;
  search: CatalogueSearch;
}) {
  const step = "flex h-10 min-w-10 items-center justify-center border px-3 text-sm font-semibold";

  return (
    <nav
      aria-label="Pagination"
      className="mt-16 flex flex-wrap items-center justify-center gap-2 border-t border-border pt-8"
    >
      {current > 1 ? (
        <CatalogueLink scroll
          href={catalogueHref(search, { page: String(current - 1) })}
          rel="prev"
          className={`${step} border-border hover:border-foreground`}
        >
          Previous
        </CatalogueLink>
      ) : (
        // A span, not a disabled link: there is no previous page to point
        // at, and a dead anchor is a link a crawler will still follow.
        <span className={`${step} border-border text-muted opacity-50`}>Previous</span>
      )}

      {pageWindow(current, last).map((page, index) =>
        page === null ? (
          <span key={`gap-${index}`} aria-hidden="true" className="px-1 text-muted">
            …
          </span>
        ) : page === current ? (
          <span
            key={page}
            aria-current="page"
            className={`${step} border-foreground bg-foreground tabular-nums text-background`}
          >
            {page}
          </span>
        ) : (
          <CatalogueLink scroll
            key={page}
            href={catalogueHref(search, { page: String(page) })}
            aria-label={`Page ${page}`}
            className={`${step} border-border tabular-nums hover:border-foreground`}
          >
            {page}
          </CatalogueLink>
        ),
      )}

      {current < last ? (
        <CatalogueLink scroll
          href={catalogueHref(search, { page: String(current + 1) })}
          rel="next"
          className={`${step} border-border hover:border-foreground`}
        >
          Next
        </CatalogueLink>
      ) : (
        <span className={`${step} border-border text-muted opacity-50`}>Next</span>
      )}
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
        sort: search.sort,
        min_price: search.min_price,
        max_price: search.max_price,
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

  const heroImage = sectionBackground("products-hero");
  const price = priceLabel(search);
  const isFiltered = Boolean(search.category || search.search || price);
  const filterCount = [active, price].filter(Boolean).length;
  const noun = meta.total === 1 ? "product" : "products";

  return (
    <main>
      {/*
       * The page header. Artwork is `public/images/products-hero.*`, picked up
       * by convention (lib/section-background.ts); without it the band is
       * plain brand charcoal, so the page reads the same before the photo
       * exists.
       */}
      <header className="relative overflow-hidden bg-brand text-white">
        {heroImage && (
          <>
            <Image
              src={heroImage}
              alt=""
              fill
              preload
              className="object-cover"
              sizes="100vw"
            />
            {/* Charcoal at 80%: enough that white copy clears AA over any
                part of the photograph. */}
            <span aria-hidden="true" className="absolute inset-0 bg-brand/80" />
          </>
        )}

        <div className="relative mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 sm:py-20">
          <Breadcrumb category={active} />

          <div className="mt-6">
            <SectionHeading
              id="products-heading"
              level={1}
              tone="onDark"
              title={active ? active.name : "Everything we make"}
              lead={
                active?.description ??
                "Every garment drafted, cut, printed and stitched to your specification. Prices are indicative — send us your quantities for a costed quote."
              }
            />
          </div>
        </div>
      </header>

      <CatalogueNavigationProvider>
      <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-10 sm:px-6 sm:py-14 lg:grid-cols-[13rem_1fr] lg:gap-12">
        <aside aria-label="Filters" className="hidden lg:block">
          <CataloguePending>
            <Filters categories={categories} search={search} idPrefix="sidebar" />
          </CataloguePending>
        </aside>

        <div className="min-w-0">
          {/* Keyed on the active refinements so the panel closes after a choice. */}
          <CataloguePending>
          <details
            key={`${search.category ?? ""}|${search.min_price ?? ""}|${search.max_price ?? ""}`}
            className="group mb-4 border border-border lg:hidden"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-semibold [&::-webkit-details-marker]:hidden">
              <span>
                Filters
                {filterCount > 0 && (
                  <span className="ml-2 font-normal tabular-nums text-muted">
                    {filterCount} active
                  </span>
                )}
              </span>
              <svg
                aria-hidden="true"
                viewBox="0 0 16 16"
                className="size-4 transition-transform group-open:rotate-180"
                fill="none"
              >
                <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" />
              </svg>
            </summary>
            <div className="border-t border-border px-4 py-5">
              <Filters categories={categories} search={search} idPrefix="mobile" />
            </div>
          </details>
          </CataloguePending>

          <CatalogueToolbar
            key={`${search.search ?? ""}|${search.sort ?? ""}`}
            current={search}
          />

          <div className="relative mt-6 flex flex-wrap items-center gap-x-4 gap-y-3 border-b border-border pb-4">
            <p aria-live="polite" className="text-sm tabular-nums text-muted">
              {meta.total === 0
                ? `0 ${noun}`
                : `Showing ${meta.from}–${meta.to} of ${meta.total} ${noun}`}
              {search.search && (
                <>
                  {" "}for <span className="font-semibold text-foreground">“{search.search}”</span>
                </>
              )}
            </p>

            {isFiltered && (
              <CataloguePending className="flex flex-wrap items-center gap-2">
                {active && (
                  <FilterChip
                    label={active.name}
                    href={catalogueHref(search, { category: undefined, page: undefined })}
                  />
                )}
                {search.search && (
                  <FilterChip
                    label={`“${search.search}”`}
                    href={catalogueHref(search, { search: undefined, page: undefined })}
                  />
                )}
                {price && (
                  <FilterChip
                    label={price}
                    href={catalogueHref(search, {
                      min_price: undefined,
                      max_price: undefined,
                      page: undefined,
                    })}
                  />
                )}
                <CatalogueLink
                  href={catalogueHref({ sort: search.sort })}
                  className="px-1 text-sm font-semibold text-accent underline-offset-4 hover:underline"
                >
                  Clear all
                </CatalogueLink>
              </CataloguePending>
            )}

            <CatalogueProgress />
          </div>

          <CataloguePending>
          {products.length === 0 ? (
            <div className="py-16">
              <p className="font-display text-2xl font-semibold uppercase tracking-tight">
                {search.search
                  ? `Nothing matches “${search.search}”`
                  : price
                    ? "Nothing in this price range"
                    : "No products here yet"}
              </p>
              <p className="mt-3 max-w-xl text-muted">
                {search.search
                  ? "Check the spelling, try a broader term such as “jersey” or “tracksuit”, or browse every category. If you cannot find it, we can probably still make it."
                  : price
                    ? "Widen the range, or remove it to include products priced on enquiry. Prices drop with quantity, so ask us for a quote."
                    : "This category is being stocked. Browse the full catalogue, or ask us for a quote on what you need."}
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <CatalogueLink
                  href={catalogueHref({ sort: search.sort })}
                  className="border border-border px-5 py-2.5 text-sm font-semibold hover:border-foreground"
                >
                  View all products
                </CatalogueLink>
                <Link
                  href="/quote"
                  className="bg-accent-solid px-5 py-2.5 text-sm font-semibold text-accent-foreground hover:opacity-90"
                >
                  Request a quote
                </Link>
              </div>
            </div>
          ) : (
            <ul className="mt-8 grid gap-x-6 gap-y-12 sm:grid-cols-2 xl:grid-cols-3">
              {products.map((product) => (
                <li key={product.id}>
                  <ServiceCard service={product} />
                </li>
              ))}
            </ul>
          )}

          {meta.last_page > 1 && (
            <Pagination current={meta.current_page} last={meta.last_page} search={search} />
          )}
          </CataloguePending>
        </div>
      </div>
      </CatalogueNavigationProvider>
    </main>
  );
}
