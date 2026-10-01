import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { SITE } from "@/lib/site";

/**
 * The card shown when the site is shared on social or in chat.
 *
 * Composed with `ImageResponse` rather than shipped as a bitmap: the supplied
 * logos are square and portrait, and neither crops into a 1200×630 frame
 * without losing the mark. This places the badge on the brand navy instead.
 */

export const alt = `${SITE.name} — ${SITE.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  // ImageResponse renders outside the browser, so it cannot resolve `/images`
  // by URL — the file is read off disk and inlined as a data URI.
  const badge = await readFile(
    join(process.cwd(), "public/images/revoro-logo.png"),
  );
  const badgeSrc = `data:image/png;base64,${badge.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          gap: 56,
          padding: "0 80px",
          // Literal values: ImageResponse renders outside the document, so the
          // CSS custom properties in globals.css are not available here. These
          // mirror --brand and --accent-bright.
          background: "#282829",
          color: "#ffffff",
          fontFamily: "sans-serif",
        }}
      >
        {/* A bare <img>, not next/image: ImageResponse renders with Satori,
            which understands plain elements only. */}
        <img src={badgeSrc} alt="" width={260} height={260} />

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 68, fontWeight: 700, letterSpacing: -1 }}>
            {SITE.name}
          </div>
          <div style={{ fontSize: 34, color: "#f10b18", marginTop: 8 }}>
            {SITE.tagline}
          </div>
          <div
            style={{
              fontSize: 26,
              color: "rgba(255,255,255,0.72)",
              marginTop: 24,
              maxWidth: 600,
            }}
          >
            Uniforms and teamwear, manufactured to order.
          </div>
        </div>
      </div>
    ),
    size,
  );
}
