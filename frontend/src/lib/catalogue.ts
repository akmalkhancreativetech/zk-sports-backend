/**
 * URL state for the product catalogue, shared by the server page and the
 * client toolbar so both build identical addresses.
 *
 * Every filtered, sorted and paged view is a plain querystring: linkable,
 * crawlable, and back-button friendly without any client state.
 */

export type CatalogueSearch = {
  category?: string;
  search?: string;
  sort?: string;
  min_price?: string;
  max_price?: string;
  page?: string;
};

/** The API's `sort` values. An empty value is the admin's manual order. */
export const SORTS = [
  { value: "", label: "Recommended" },
  { value: "newest", label: "Newest" },
  { value: "price_asc", label: "Price: low to high" },
  { value: "price_desc", label: "Price: high to low" },
  { value: "name", label: "Name: A to Z" },
] as const;

/** Rebuild the querystring with some values changed, dropping empties. */
export function catalogueHref(
  current: CatalogueSearch,
  changes: CatalogueSearch = {},
): string {
  const params = new URLSearchParams();
  const merged = { ...current, ...changes };

  for (const key of ["category", "search", "min_price", "max_price", "sort", "page"] as const) {
    const value = merged[key]?.trim();

    // `page=1` is the default view; leaving it off keeps the canonical clean.
    if (value && !(key === "page" && value === "1")) {
      params.set(key, value);
    }
  }

  const query = params.toString();

  return query ? `/products?${query}` : "/products";
}
