import type { MetadataRoute } from "next";

import { SITE_URL } from "@/lib/site";

/**
 * Served at /robots.txt.
 *
 * `/account` and `/quote/thank-you` are disallowed ahead of existing: neither
 * is a landing page, and a thank-you page in the index is a classic source of
 * phantom conversions.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/account/", "/quote/thank-you"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
