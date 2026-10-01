import type { NextConfig } from "next";

/*
 * The deployed API host, read at build time. Lets a server whose API lives on
 * a host not listed below — e.g. a Tailscale `*.ts.net` name — serve images
 * without editing this file. See deployment.md.
 */
const apiUrl = process.env.NEXT_PUBLIC_API_URL
  ? new URL(process.env.NEXT_PUBLIC_API_URL)
  : null;

const nextConfig: NextConfig = {
  images: {
    /*
     * Next 16 refuses to optimize an image whose host resolves to a private
     * IP, which in development is every image: the Laravel API is on
     * localhost. Enabled in development only, so the SSRF guard stays fully
     * armed in production, where images come from the public API host.
     *
     * `IMAGES_ALLOW_LOCAL_IP=true` is the explicit opt-in for a production
     * host that resolves privately — a Tailscale name resolves to 100.x on
     * the server itself.
     */
    dangerouslyAllowLocalIP:
      process.env.NODE_ENV === "development" ||
      process.env.IMAGES_ALLOW_LOCAL_IP === "true",

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
      ...(apiUrl
        ? [
            {
              protocol: apiUrl.protocol.replace(":", "") as "http" | "https",
              hostname: apiUrl.hostname,
              port: apiUrl.port,
              pathname: "/storage/**",
            },
          ]
        : []),
    ],
  },
};

export default nextConfig;
