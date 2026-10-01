import { z } from "zod";

/**
 * Mirrors of the API Resources in app/Http/Resources/Api/V1.
 *
 * These are the contract, not documentation: `apiGet` parses every response
 * through one of them, so a field that changes shape server-side fails here
 * with a path and a reason instead of surfacing as `undefined` deep in a
 * component. Types are derived from the schemas — never declared twice.
 *
 * Two conventions worth keeping:
 *
 *  - `.nullable()` means the column is nullable. `.optional()` means the key is
 *    absent unless the endpoint loaded or counted it. Conflating the two is the
 *    usual cause of a false parse failure against an Eloquent payload.
 *  - Money arrives as a **string**. The backend casts decimals with `decimal:2`
 *    precisely so a value never becomes a float; parsing it to a number here
 *    would reintroduce the rounding error that cast exists to prevent.
 */

/* -------------------------------------------------------------------------- */
/* Pagination                                                                 */
/* -------------------------------------------------------------------------- */

const paginationLinkSchema = z.object({
  url: z.string().nullable(),
  label: z.string(),
  active: z.boolean(),
});

/**
 * Laravel's `ResourceCollection` envelope. Wrapped once here so no endpoint
 * repeats it.
 */
export function paginated<T extends z.ZodTypeAny>(item: T) {
  return z.object({
    data: z.array(item),
    links: z.object({
      first: z.string().nullable(),
      last: z.string().nullable(),
      prev: z.string().nullable(),
      next: z.string().nullable(),
    }),
    meta: z.object({
      current_page: z.number(),
      from: z.number().nullable(),
      last_page: z.number(),
      links: z.array(paginationLinkSchema),
      path: z.string(),
      per_page: z.number(),
      to: z.number().nullable(),
      total: z.number(),
    }),
  });
}

/* -------------------------------------------------------------------------- */
/* Sliders                                                                    */
/* -------------------------------------------------------------------------- */

export const slideSchema = z.object({
  id: z.number(),
  title: z.string().nullable(),
  subtitle: z.string().nullable(),
  body: z.string().nullable(),
  image_url: z.string().nullable(),
  mobile_image_url: z.string().nullable(),
  image_alt: z.string().nullable(),
  cta_label: z.string().nullable(),
  cta_url: z.string().nullable(),
  cta_new_tab: z.boolean(),
  text_position: z.enum(["left", "center", "right"]),
  overlay_opacity: z.number(),
});

/**
 * The one endpoint with **no `data` envelope**: it returns
 * `App\Services\PublicSliders::forKey()` verbatim rather than re-wrapping a
 * payload that already had a public shape.
 */
export const sliderSchema = z.object({
  key: z.string(),
  autoplay: z.boolean(),
  interval_ms: z.number(),
  transition: z.enum(["slide", "fade"]),
  slides: z.array(slideSchema),
});

export type Slide = z.infer<typeof slideSchema>;
export type Slider = z.infer<typeof sliderSchema>;

/* -------------------------------------------------------------------------- */
/* Services                                                                   */
/* -------------------------------------------------------------------------- */

export const serviceCategorySchema = z.object({
  id: z.number(),
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  services_count: z.number().optional(),
});

export const serviceImageSchema = z.object({
  id: z.number(),
  url: z.string(),
  alt: z.string().nullable(),
});

export const serviceOptionSchema = z.object({
  id: z.number(),
  name: z.string(),
  type: z.enum(["select", "text"]),
  is_required: z.boolean(),
  values: z
    .array(
      z.object({
        id: z.number(),
        label: z.string(),
        price_delta: z.string().nullable(),
      }),
    )
    .optional(),
});

export const servicePriceTierSchema = z.object({
  id: z.number(),
  min_qty: z.number(),
  max_qty: z.number().nullable(),
  unit_price: z.string(),
  range_label: z.string(),
});

export const serviceSchema = z.object({
  id: z.number(),
  title: z.string(),
  slug: z.string(),
  excerpt: z.string().nullable(),

  // Detail-only: the index route omits the key entirely to keep list payloads
  // small, so this is `.optional()` rather than `.nullable()`.
  description: z.string().nullable().optional(),

  icon: z.string().nullable(),
  featured_image_url: z.string().nullable(),
  price_from: z.string().nullable(),
  price_unit: z.string().nullable(),
  min_order_quantity: z.number().nullable(),
  is_featured: z.boolean(),

  meta_title: z.string().nullable(),
  meta_description: z.string().nullable(),
  og_image_url: z.string().nullable(),

  category: serviceCategorySchema.nullable().optional(),
  images: z.array(serviceImageSchema).optional(),
  options: z.array(serviceOptionSchema).optional(),
  price_tiers: z.array(servicePriceTierSchema).optional(),
});

export type ServiceCategory = z.infer<typeof serviceCategorySchema>;
export type Service = z.infer<typeof serviceSchema>;

/* -------------------------------------------------------------------------- */
/* Blog                                                                       */
/* -------------------------------------------------------------------------- */

export const blogCategorySchema = z.object({
  id: z.number(),
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  posts_count: z.number().optional(),
});

export const blogTagSchema = z.object({
  id: z.number(),
  name: z.string(),
  slug: z.string(),
  posts_count: z.number().optional(),
});

export const blogPostSchema = z.object({
  id: z.number(),
  title: z.string(),
  slug: z.string(),
  excerpt: z.string().nullable(),

  // Detail-only, like a service description.
  body: z.string().nullable().optional(),

  featured_image_url: z.string().nullable(),
  featured_image_alt: z.string().nullable(),
  og_image_url: z.string().nullable(),

  /*
   * Nullable in the database, but never null here: both post endpoints filter
   * through the `live` scope, which requires a `published_at` that has already
   * passed. Declaring it non-null makes a regression in that scope a loud parse
   * failure rather than a page that quietly renders "Invalid Date".
   */
  published_at: z.string(),

  is_featured: z.boolean(),
  meta_title: z.string().nullable(),
  meta_description: z.string().nullable(),

  category: blogCategorySchema.nullable().optional(),
  tags: z.array(blogTagSchema).optional(),
  author: z.object({ name: z.string() }).nullable().optional(),
});

export type BlogCategory = z.infer<typeof blogCategorySchema>;
export type BlogTag = z.infer<typeof blogTagSchema>;
export type BlogPost = z.infer<typeof blogPostSchema>;
