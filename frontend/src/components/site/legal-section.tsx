import type { ReactNode } from "react";

/**
 * A titled section of a legal page, shared by /privacy and /terms so the two
 * cannot drift apart typographically.
 *
 * The `[&_a]` selectors style links inside the prose without every paragraph
 * repeating the classes — these pages are almost entirely text, and a link that
 * looks different on one page from the other reads as an oversight.
 */
export function LegalSection({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="mt-10 border-t border-border pt-6">
      <h2
        id={id}
        className="font-display text-2xl font-semibold uppercase tracking-tight"
      >
        {title}
      </h2>

      <div className="mt-3 space-y-3 leading-relaxed text-muted [&_a]:text-accent [&_a:hover]:underline [&_strong]:text-foreground">
        {children}
      </div>
    </section>
  );
}
