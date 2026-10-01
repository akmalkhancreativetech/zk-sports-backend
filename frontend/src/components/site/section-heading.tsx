import Link from "next/link";

/**
 * The shared section header.
 *
 * There is deliberately no eyebrow here. A tracked-caps label above every
 * heading is chrome: it repeats what the heading already says and encodes
 * nothing. `meta` exists instead for the cases where a label *is* data — a
 * count, a lead time — and is rendered as a spec value, not a decoration.
 */
export function SectionHeading({
  title,
  lead,
  id,
  meta,
  link,
  tone = "default",
  level = 2,
}: {
  title: string;
  lead?: string;
  id: string;
  /** A real value about the section's content, e.g. "6 categories". */
  meta?: string;
  link?: { href: string; label: string };
  /** `onDark` for a section sitting on photography or the brand charcoal. */
  tone?: "default" | "onDark";
  /**
   * `1` where this heading is the page's subject rather than one section of
   * it — a catalogue or detail page. Exactly one per document.
   */
  level?: 1 | 2;
}) {
  const onDark = tone === "onDark";
  const Heading = level === 1 ? "h1" : "h2";

  return (
    <div className={`border-t-2 pt-5 ${onDark ? "border-white" : "border-foreground"}`}>
      {meta && (
        <p
          className={`mb-3 text-sm tabular-nums ${
            onDark ? "text-white/70" : "text-muted"
          }`}
        >
          {meta}
        </p>
      )}

      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-3">
        <Heading
          id={id}
          className="max-w-3xl font-display text-4xl font-bold uppercase leading-[0.95] tracking-tight text-balance sm:text-5xl"
        >
          {title}
        </Heading>

        {link && (
          <Link
            href={link.href}
            className={`text-sm font-semibold underline-offset-4 hover:underline ${
              // The accent red does not clear AA on a dark surface at this
              // size; white does, and the link is still obviously a link.
              onDark ? "text-white" : "text-accent"
            }`}
          >
            {link.label}
          </Link>
        )}
      </div>

      {lead && (
        <p
          className={`mt-4 max-w-2xl text-pretty ${
            onDark ? "text-white/75" : "text-muted"
          }`}
        >
          {lead}
        </p>
      )}
    </div>
  );
}
