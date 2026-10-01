import { z } from "zod";

import { apiGet } from "./api";
import {
  blogCategorySchema,
  blogPostSchema,
  blogTagSchema,
  paginated,
  serviceCategorySchema,
  serviceSchema,
  type BlogCategory,
  type BlogPost,
  type BlogTag,
  type Service,
  type ServiceCategory,
} from "./schemas";

/**
 * Reads shared by more than one route.
 *
 * `serviceCategories()` backs the header menu, the footer column and the home
 * page grid. It is called from the layout and the page in the same render, and
 * Next dedupes identical `fetch` calls within a render pass, so that is one
 * request rather than three.
 */

const categoryCollectionSchema = z.object({ data: z.array(serviceCategorySchema) });

/**
 * Never throws: the categories menu appears on every page, so a failed request
 * should cost the site its submenu, not its layout.
 */
export async function serviceCategories(): Promise<ServiceCategory[]> {
  return apiGet("service-categories", categoryCollectionSchema, { revalidate: 300 })
    .then((response) => response.data)
    .catch(() => []);
}

/**
 * The blog's taxonomies, for the listing filters.
 *
 * Both swallow failures for the same reason as `serviceCategories`: a filter
 * row that cannot load should cost the page its filters, not its posts.
 */
export async function blogCategories(): Promise<BlogCategory[]> {
  return apiGet(
    "blog-categories",
    z.object({ data: z.array(blogCategorySchema) }),
    { revalidate: 300 },
  )
    .then((response) => response.data)
    .catch(() => []);
}

export async function blogTags(): Promise<BlogTag[]> {
  return apiGet("blog-tags", z.object({ data: z.array(blogTagSchema) }), {
    revalidate: 300,
  })
    .then((response) => response.data)
    .catch(() => []);
}

/**
 * Walk every page of a paginated endpoint.
 *
 * Only the sitemap needs this — a visitor-facing list should paginate rather
 * than pull the whole catalogue. `last_page` bounds the loop, so a malformed
 * envelope cannot spin forever.
 */
async function allPages<T extends z.ZodTypeAny>(
  path: string,
  item: T,
): Promise<z.infer<T>[]> {
  const schema = paginated(item);
  const first = await apiGet(path, schema, { revalidate: 3600 });
  const results: z.infer<T>[] = [...first.data];

  for (let page = 2; page <= first.meta.last_page; page++) {
    const next = await apiGet(path, schema, {
      revalidate: 3600,
      searchParams: { page },
    });

    results.push(...next.data);
  }

  return results;
}

/** Every active service. For the sitemap. */
export async function allServices(): Promise<Service[]> {
  return allPages("services", serviceSchema).catch(() => []);
}

/** Every published post. For the sitemap. */
export async function allPosts(): Promise<BlogPost[]> {
  return allPages("posts", blogPostSchema).catch(() => []);
}
