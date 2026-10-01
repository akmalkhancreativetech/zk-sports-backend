/**
 * Facts about the company that no model owns.
 *
 * Shared by the home page and /about so the two cannot drift — the same figures
 * appearing with different values on two pages is worse than either being
 * wrong. Move these to the API the day a settings model exists.
 *
 * **These are placeholders.** Years, countries, lead time and minimum order are
 * invented and read as hard fact to a visitor. Replace them with real numbers
 * before launch, or remove the strip.
 */

/**
 * Icons are stroke paths on a 24 grid rather than a package: four glyphs do not
 * justify a dependency, and drawing them here keeps their weight matched to the
 * type around them. Each one names its stat — a calendar for years, a globe for
 * countries — so it reinforces the label instead of decorating it.
 */
export const STATS = [
  {
    value: "12+",
    label: "Years manufacturing",
    paths: ["M4 7h16v13H4z", "M8 3v4M16 3v4", "M4 11h16"],
  },
  {
    value: "40+",
    label: "Countries shipped to",
    paths: [
      "M12 3a9 9 0 100 18 9 9 0 000-18z",
      "M3.2 9h17.6M3.2 15h17.6",
      "M12 3c2.5 2.4 3.8 5.5 3.8 9s-1.3 6.6-3.8 9c-2.5-2.4-3.8-5.5-3.8-9s1.3-6.6 3.8-9z",
    ],
  },
  {
    value: "10",
    label: "Piece minimum order",
    paths: ["M12 3l9 4.5-9 4.5-9-4.5L12 3z", "M3 12l9 4.5 9-4.5", "M3 16.5L12 21l9-4.5"],
  },
  {
    value: "3–4",
    label: "Week lead time",
    paths: ["M12 21a9 9 0 100-18 9 9 0 000 18z", "M12 7.5V12l3 2"],
  },
] as const;

/** A genuine sequence — the order work moves through the factory. */
export const PROCESS = [
  {
    title: "Share your brief",
    body: "Send artwork, colours and quantities — or a rough sketch. We work from either.",
  },
  {
    title: "Sample and approve",
    body: "We draft the pattern, produce a digital mockup and confirm every detail before cutting.",
  },
  {
    title: "Into production",
    body: "Printing, embroidery and stitching run in house, so quality is checked at each stage.",
  },
  {
    title: "Packed and shipped",
    body: "Individually bagged by name and number where you need it, delivered worldwide.",
  },
] as const;

export const STRENGTHS = [
  {
    title: "Built to your specification",
    body: "Patterns, fabrics, colourways and badging are drafted per order — no catalogue blanks with a logo dropped on top.",
  },
  {
    title: "One factory, whole process",
    body: "Drafting, cutting, printing, embroidery and stitching happen under one roof, so nothing is lost between subcontractors.",
  },
  {
    title: "Team quantities, team pricing",
    body: "Pricing steps down with quantity. Tell us the size breakdown and the quote reflects it.",
  },
  {
    title: "Shipped worldwide",
    body: "Clubs, schools and distributors across Europe, the UK, the USA, Japan and Australia.",
  },
] as const;
