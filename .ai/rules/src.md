---
paths:
  - 'frontend/src/**'
---

# Src

## Public site SEO: Next 16 metadata conventions
Read node_modules/next/dist/docs/ before writing FE code — this Next (16.3.4) differs from training data. See frontend/AGENTS.md.

SEO is not optional on new public routes:
- `metadataBase` is set once in app/layout.tsx from `SITE_URL` (lib/site.ts, driven by NEXT_PUBLIC_SITE_URL). Without it Next emits relative og:url that crawlers cannot follow.
- Every page exports `metadata` (or `generateMetadata`) with `alternates: { canonical: "/path" }`. Self-referencing canonicals matter because list pages carry `?category=` / `?page=` query strings that otherwise read as duplicates.
- Dynamic routes use `generateMetadata` fed by the API's own `meta_title` / `meta_description` / `og_image_url` fields, which every Resource already emits. Wrap the shared fetch in React `cache()` so metadata and the page body do not fetch twice.
- Exactly one `<h1>` per document. Slide/CMS titles are nullable, so components that might not render one must supply an `sr-only` fallback (see hero-carousel.tsx).
- JSON-LD goes through components/site/json-ld.tsx, which escapes `<` to `<`. Never hand-roll `dangerouslySetInnerHTML` with CMS strings.
- app/sitemap.ts and app/robots.ts are generated from the API, not hand-maintained. Add new public routes to the static list in sitemap.ts.
- Prefer server components. The header/footer/menus use `<details>`, not client JS, so the bundle stays empty.
- Dates rendered in JSX must pass an explicit locale AND `timeZone`; the runtime default differs between server and browser and causes hydration mismatches.

## Public site visual design: use the frontend-design skill
Before designing or reshaping any public-site UI, read `.claude/skills/frontend-design/SKILL.md` (installed in this repo). Work its two-pass process: write a compact plan (4–6 named colours, typeface roles, layout concept, principles), review it against the brief for generic defaults, then build.

Design decisions already settled for this site — do not undo without reason:
- Subject is a cut-and-sew factory. Grounding metaphor is a production spec sheet.
- Palette is sampled from the logo: #f10b18 red on #282829 charcoal. Tokens in globals.css; never hardcode hex in components (the OG image is the one exception — ImageResponse cannot read CSS vars).
- Type: Barlow Condensed (display, jersey lettering) + Geist (body).
- Boldness is spent in ONE place: the outlined squad numerals in the process section. Do not add a second showpiece.
- Motion is ONE moment: slow image scale on card hover. No section entrances, no card lift, no hover colour shifts.

Tells the skill names that we have already been caught by — check for these:
- tracked ALL-CAPS eyebrow labels above headings
- a monospace face for small data labels
- '→' appended to link/button text; meta joined with middle dots
- 01/02/03 numbering on content that is not actually a sequence (categories are a taxonomy; the process steps are a sequence)
- uniform rounded cards with soft shadows (the SaaS-card kit)
