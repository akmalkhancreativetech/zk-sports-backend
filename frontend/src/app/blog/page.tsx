import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PostCard } from "@/components/site/post-card";
import { SectionHeading } from "@/components/site/section-heading";
import { apiGet } from "@/lib/api";
import { blogCategories, blogTags } from "@/lib/content";
import { blogPostSchema, paginated } from "@/lib/schemas";
import { SITE } from "@/lib/site";

/**
 * The blog index.
 *
 * Filtering and paging go through the URL, so the page stays a server component
 * and every filtered view is a real, linkable, crawlable address — the same
 * approach as the product catalogue.
 */

type Search = { category?: string; tag?: string; page?: string };

/** Rebuild the querystring with one value changed, dropping empties. */
function hrefWith(current: Search, changes: Search): string {
  const params = new URLSearchParams();
  const merged = { ...current, ...changes };

  for (const key of ["category", "tag", "page"] as const) {
    const value = merged[key];

    // `page=1` is the default view; leaving it off keeps the canonical clean.
    if (value && !(key === "page" && value === "1")) {
      params.set(key, value);
    }
  }

  const query = params.toString();

  return query ? `/blog?${query}` : "/blog";
}

async function resolveSearch(
  searchParams: Promise<Record<string, string | string[] | undefined>>,
): Promise<Search> {
  const raw = await searchParams;
  const one = (value: string | string[] | undefined) =>
    Array.isArray(value) ? value[0] : value;

  return {
    category: one(raw.category),
    tag: one(raw.tag),
    page: one(raw.page),
  };
}

export async function generateMetadata({
  searchParams,
}: PageProps<"/blog">): Promise<Metadata> {
  const search = await resolveSearch(searchParams);
  const [categories, tags] = await Promise.all([blogCategories(), blogTags()]);

  const category = categories.find((c) => c.slug === search.category);
  const tag = tags.find((t) => t.slug === search.tag);
  const subject = category?.name ?? tag?.name;

  return {
    title: subject ? `${subject} — Blog` : "Blog",
    description: subject
      ? `Guides and news about ${subject} from ${SITE.name}.`
      : `Guides, buying advice and news from ${SITE.name}.`,
    alternates: { canonical: hrefWith(search, {}) },
  };
}

export default async function BlogPage({ searchParams }: PageProps<"/blog">) {
  const search = await resolveSearch(searchParams);

  const [{ data: posts, meta }, categories, tags] = await Promise.all([
    apiGet("posts", paginated(blogPostSchema), {
      searchParams: {
        category: search.category,
        tag: search.tag,
        page: search.page,
      },
    }),
    blogCategories(),
    blogTags(),
  ]);

  const category = categories.find((c) => c.slug === search.category);
  const tag = tags.find((t) => t.slug === search.tag);

  /*
   * A taxonomy term that does not exist, or a page past the end, is a 404
   * rather than an empty 200 — both are reachable by guessing a URL, and both
   * would otherwise be thin pages carrying a self-referencing canonical.
   */
  if ((search.category && !category) || (search.tag && !tag)) {
    notFound();
  }

  if (meta.current_page > meta.last_page) {
    notFound();
  }

  const subject = category?.name ?? tag?.name;

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
      <SectionHeading
        id="blog-heading"
        level={1}
        title={subject ?? "Guides and news"}
        lead={
          category?.description ??
          "Buying advice, fabric guides and what we have been making."
        }
        meta={`${meta.total} ${meta.total === 1 ? "post" : "posts"}`}
      />

      {categories.length > 0 && (
        <nav aria-label="Filter by category" className="mt-10 flex flex-wrap gap-2">
          {[{ name: "All", slug: undefined }, ...categories].map((filter) => {
            const isActive = (search.category ?? undefined) === filter.slug;

            return (
              <Link
                key={filter.slug ?? "all"}
                // Changing the filter drops the tag and returns to page one:
                // the two taxonomies intersect, and a stale pair is usually an
                // empty screen.
                href={hrefWith(
                  {},
                  { category: filter.slug },
                )}
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
      )}

      {tag && (
        <p className="mt-4 text-sm text-muted">
          Tagged <strong className="font-semibold text-foreground">{tag.name}</strong>{" "}
          <Link href="/blog" className="text-accent hover:underline">
            clear
          </Link>
        </p>
      )}

      {posts.length === 0 ? (
        <p className="mt-16 border-t border-border pt-8 text-muted">
          Nothing published here yet.{" "}
          <Link href="/blog" className="font-semibold text-accent hover:underline">
            All posts
          </Link>
        </p>
      ) : (
        <ul className="mt-12 grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <li key={post.id}>
              <PostCard post={post} />
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
