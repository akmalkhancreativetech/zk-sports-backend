import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    /*
     * Next 16 refuses to optimize an image whose host resolves to a private
     * IP, which in development is every image: the Laravel API is on
     * localhost. Enabled in development only, so the SSRF guard stays fully
     * armed in production, where images come from the public API host.
     */
    dangerouslyAllowLocalIP: process.env.NODE_ENV === "development",

    /*
     * Service and slide images are served by Laravel's `public` disk, so their
     * URLs point at the API host and `next/image` blocks any host that is not
     * listed here.
     *
     * `pathname` is scoped to `/storage/**` — the symlinked public disk — so an
     * open redirect or a user-supplied URL elsewhere on the API host cannot be
     * proxied through the image optimizer.
     */
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
        port: "8000",
        pathname: "/storage/**",
      },
      {
        protocol: "https",
        hostname: "api.zk-sports.com",
        pathname: "/storage/**",
      },
    ],
  },
};

export default nextConfig;
