import type { Metadata } from "next";
import { Barlow_Condensed, Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { WhatsAppButton } from "@/components/site/whatsapp-button";
import { serviceCategories } from "@/lib/content";
import { SITE, SITE_URL } from "@/lib/site";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

/**
 * The display face. Condensed athletic caps are the lettering on an actual
 * jersey, which is what this company makes — the type does the grounding work
 * rather than a decorative flourish elsewhere.
 */
const barlowCondensed = Barlow_Condensed({
  variable: "--font-barlow-condensed",
  subsets: ["latin"],
  weight: ["600", "700"],
});

export const metadata: Metadata = {
  /*
   * Every relative URL in metadata below — and in each page's `alternates` —
   * resolves against this. Without it Next emits relative og:url values, which
   * crawlers and social scrapers cannot follow.
   */
  metadataBase: new URL(SITE_URL),

  title: {
    default: `${SITE.name} — ${SITE.tagline}`,
    template: `%s — ${SITE.name}`,
  },
  description: SITE.description,

  openGraph: {
    type: "website",
    siteName: SITE.name,
    locale: "en_GB",
    title: `${SITE.name} — ${SITE.tagline}`,
    description: SITE.description,
    url: "/",
  },

  twitter: {
    card: "summary_large_image",
    title: `${SITE.name} — ${SITE.tagline}`,
    description: SITE.description,
  },

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      // Lets Google show full-size image previews and untruncated snippets.
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // Fetched once and handed to both the header menu and the footer column.
  const categories = await serviceCategories();

  return (
    <html
      lang="en"
      /*
       * The theme script below writes `data-theme` onto this element before
       * React hydrates, so the client tree legitimately differs from the server
       * markup here. Suppression is one level deep — children still hydrate and
       * are still compared normally.
       */
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${barlowCondensed.variable} h-full antialiased`}
    >
      {/*
       * Grammarly and similar extensions add attributes to `<body>` before
       * React hydrates, which React reports as a mismatch. The warning is
       * suppressed one level deep only — children still hydrate normally.
       */}
      <body suppressHydrationWarning className="flex min-h-full flex-col">
        {/*
         * Replays the stored theme before the page paints. It has to be a
         * blocking inline script: anything deferred to React would run after
         * first paint, so a visitor who chose dark would see a white flash on
         * every navigation.
         *
         * First child of <body>, not a sibling of it — a `<script>` between
         * <html> and <body> is invalid HTML and React cannot order it.
         */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{var t=localStorage.getItem('theme');if(t)document.documentElement.dataset.theme=t}catch(e){}",
          }}
        />

        <SiteHeader categories={categories} />
        <div className="flex-1">{children}</div>
        <SiteFooter categories={categories} />
        <WhatsAppButton />
      </body>
    </html>
  );
}
