"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  createContext,
  useContext,
  useTransition,
  type ComponentProps,
  type FormEvent,
  type ReactNode,
} from "react";

import { catalogueHref, type CatalogueSearch } from "@/lib/catalogue";

/**
 * One pending state for every way the catalogue changes: category links,
 * chips, pagination, the price form, search and sort.
 *
 * Each trigger navigates inside the same transition, so `isPending` stays true
 * from the click until the new results have rendered, and the results area can
 * show a single loader for all of them. Every trigger is still a real link or
 * GET form underneath, so the page works the same without JavaScript.
 */

type Navigate = (href: string, options?: { scroll?: boolean }) => void;

const CatalogueNavigationContext = createContext<{
  navigate: Navigate;
  isPending: boolean;
} | null>(null);

export function CatalogueNavigationProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const navigate: Navigate = (href, { scroll = false } = {}) => {
    // One change at a time: a second click before the first has rendered is
    // dropped rather than racing it.
    if (isPending) {
      return;
    }

    startTransition(() => {
      router.push(href, { scroll });
    });
  };

  return (
    <CatalogueNavigationContext value={{ navigate, isPending }}>
      {children}
    </CatalogueNavigationContext>
  );
}

export function useCatalogueNavigation() {
  const context = useContext(CatalogueNavigationContext);

  if (!context) {
    throw new Error("useCatalogueNavigation must be used inside CatalogueNavigationProvider");
  }

  return context;
}

/**
 * A `Link` that navigates through the shared transition. Modified clicks
 * (new tab, new window) are left to the browser.
 */
export function CatalogueLink({
  href,
  scroll = false,
  ...props
}: Omit<ComponentProps<typeof Link>, "href"> & { href: string }) {
  const { navigate } = useCatalogueNavigation();

  return (
    <Link
      {...props}
      href={href}
      scroll={scroll}
      onClick={(event) => {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) {
          return;
        }

        event.preventDefault();
        navigate(href, { scroll });
      }}
    />
  );
}

/**
 * A GET form to /products that navigates through the shared transition, with
 * empty fields dropped from the URL. Submitting returns to page one.
 */
export function CatalogueForm({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const { navigate } = useCatalogueNavigation();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const fields = Object.fromEntries(
      [...new FormData(event.currentTarget)].map(([key, value]) => [key, String(value)]),
    ) as CatalogueSearch;

    navigate(catalogueHref(fields, { page: undefined }));
  }

  return (
    <form action="/products" onSubmit={submit} className={className}>
      {children}
    </form>
  );
}

export function Spinner({ className = "size-4" }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className={`animate-spin ${className}`}>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

/**
 * The loading line. Sits on the bottom rule of a `relative` parent, so the
 * rule itself appears to load rather than a box floating over the results.
 */
export function CatalogueProgress() {
  const { isPending } = useCatalogueNavigation();

  return (
    <>
      <span role="status" className="sr-only">
        {isPending ? "Updating results" : ""}
      </span>

      {isPending && (
        <span aria-hidden="true" className="absolute inset-x-0 -bottom-px h-0.5 overflow-hidden">
          <span className="block h-full w-1/4 animate-progress bg-accent-bright" />
        </span>
      )}
    </>
  );
}

/**
 * Locks whatever it wraps while a change loads — results, filters, chips.
 * `inert` blocks pointer, touch and keyboard alike, so nothing inside can be
 * clicked or tabbed to until the new results have rendered.
 */
export function CataloguePending({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const { isPending } = useCatalogueNavigation();

  return (
    <div
      aria-busy={isPending}
      inert={isPending}
      className={`transition-opacity ${isPending ? "opacity-40" : ""} ${className}`}
    >
      {children}
    </div>
  );
}
