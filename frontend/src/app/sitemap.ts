import type { MetadataRoute } from "next";

import { allPosts, allServices } from "@/lib/content";
import { SITE_URL } from "@/lib/site";

/**
 * Served at /sitemap.xml, generated from the API rather than hand-maintained,
 * so a service published in the admin panel is discoverable without a deploy.
 *
 * This is a cached Route Handler; `revalidate` below decides how stale it may
 * get. Should the catalogue ever outgrow 50,000 URLs, this needs splitting with
 * `generateSitemaps`.
 */
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [services, posts] = await Promise.all([allServices(), allPosts()]);

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: SITE_URL, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/products`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${SITE_URL}/quote`, changeFrequency: "yearly", priority: 0.8 },
    { url: `${SITE_URL}/blog`, changeFrequency: "weekly", priority: 0.6 },
    { url: `${SITE_URL}/about`, changeFrequency: "yearly", priority: 0.5 },
    { url: `${SITE_URL}/contact`, changeFrequency: "yearly", priority: 0.5 },
  ];

  return [
    ...staticRoutes,

    // `allServices` reads /api/v1/services; the public URL is /products.
    ...services.map((service) => ({
      url: `${SITE_URL}/products/${service.slug}`,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),

    ...posts.map((post) => ({
      url: `${SITE_URL}/blog/${post.slug}`,
      lastModified: new Date(post.published_at),
      changeFrequency: "yearly" as const,
      priority: 0.4,
    })),
  ];
}
