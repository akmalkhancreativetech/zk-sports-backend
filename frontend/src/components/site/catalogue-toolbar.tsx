"use client";

import { useState } from "react";

import { Spinner, useCatalogueNavigation } from "@/components/site/catalogue-navigation";
import { catalogueHref, SORTS, type CatalogueSearch } from "@/lib/catalogue";

/**
 * Search box and sort control for the catalogue.
 *
 * Underneath it is a plain GET form, so it works before hydration and without
 * JavaScript. Once hydrated it navigates client-side and keeps the URL clean:
 * empty fields are dropped rather than sent as `?search=&sort=`, the sort
 * applies the moment it changes, and emptying the box restores the full list
 * instead of leaving stale results under a blank field.
 *
 * Any change returns to page one; page 4 of a narrower result is usually an
 * empty screen. The parent keys this component on the active term so the box
 * resets when the term is removed elsewhere, e.g. from a filter chip.
 */
export function CatalogueToolbar({ current }: { current: CatalogueSearch }) {
  const { navigate, isPending } = useCatalogueNavigation();
  const [term, setTerm] = useState(current.search ?? "");

  function go(changes: CatalogueSearch) {
    navigate(catalogueHref(current, { ...changes, page: undefined }));
  }

  return (
    <form
      action="/products"
      role="search"
      aria-busy={isPending}
      onSubmit={(event) => {
        event.preventDefault();
        go({ search: term });
      }}
      className="flex flex-col gap-3 sm:flex-row sm:items-center"
    >
      {current.category && (
        <input type="hidden" name="category" value={current.category} />
      )}
      {current.min_price && (
        <input type="hidden" name="min_price" value={current.min_price} />
      )}
      {current.max_price && (
        <input type="hidden" name="max_price" value={current.max_price} />
      )}

      <div className="flex min-w-0 flex-1 border border-border focus-within:border-foreground">
        <label htmlFor="product-search" className="sr-only">
          Search products
        </label>

        <input
          id="product-search"
          type="search"
          name="search"
          value={term}
          onChange={(event) => {
            setTerm(event.target.value);

            if (event.target.value === "" && current.search) {
              go({ search: undefined });
            }
          }}
          placeholder="Search by product name"
          autoComplete="off"
          readOnly={isPending}
          enterKeyHint="search"
          className="min-w-0 flex-1 bg-background px-4 py-3 text-sm outline-none placeholder:text-muted read-only:text-muted [&::-webkit-search-cancel-button]:appearance-none"
        />

        {term && (
          <button
            type="button"
            disabled={isPending}
            onClick={() => {
              setTerm("");

              if (current.search) {
                go({ search: undefined });
              }
            }}
            className="px-3 text-muted hover:text-foreground disabled:opacity-50"
          >
            <span className="sr-only">Clear search</span>
            <svg aria-hidden="true" viewBox="0 0 16 16" className="size-4" fill="none">
              <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </button>
        )}

        <button
          type="submit"
          disabled={isPending}
          className="flex items-center gap-2 bg-accent-solid px-5 text-sm font-semibold text-accent-foreground hover:opacity-90 disabled:cursor-wait"
        >
          {isPending && <Spinner />}
          Search
        </button>
      </div>

      <div className="flex items-center gap-3">
        <label htmlFor="product-sort" className="shrink-0 text-sm text-muted">
          Sort by
        </label>

        <select
          id="product-sort"
          name="sort"
          defaultValue={current.sort ?? ""}
          disabled={isPending}
          onChange={(event) => go({ sort: event.target.value, search: term })}
          className="min-w-0 flex-1 border border-border bg-background px-3 py-3 text-sm font-medium focus:border-foreground sm:flex-none disabled:opacity-50"
        >
          {SORTS.map((sort) => (
            <option key={sort.value} value={sort.value}>
              {sort.label}
            </option>
          ))}
        </select>
      </div>
    </form>
  );
}
