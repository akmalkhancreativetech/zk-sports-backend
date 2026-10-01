import Image from "next/image";
import Link from "next/link";

import type { Service } from "@/lib/schemas";

/**
 * A product teaser, used by the home page strip and later by the catalogue.
 *
 * The type is still `Service` because that is what the API calls it; only the
 * public wording and the URLs say "product".
 *
 * Built as a spec entry rather than a floating card: square corners, a single
 * rule, and the numbers set in tabular figures. The only motion is the image
 * scale — the site's one motion moment.
 *
 * `price_from` is a string on the wire and stays one — see the money note in
 * schemas.ts. It is shown as indicative ("from"), never as a quotable total:
 * the real figure comes from staff during the quoting workflow.
 */
export function ServiceCard({ service }: { service: Service }) {
  return (
    <article className="group h-full border-t-2 border-foreground">
      <Link href={`/products/${service.slug}`} className="flex h-full flex-col">
        <div className="relative aspect-4/5 w-full overflow-hidden bg-surface">
          {service.featured_image_url ? (
            <Image
              src={service.featured_image_url}
              alt={service.title}
              fill
              // Product photography is often shot standing, so anchor the crop
              // to the top rather than losing the garment to a centred frame.
              className="object-cover object-top transition-transform duration-700 ease-out group-hover:scale-[1.04]"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            />
          ) : (
            <div className="flex size-full items-center justify-center font-display text-5xl text-muted">
              {service.icon ?? "—"}
            </div>
          )}
        </div>

        <div className="flex flex-1 flex-col pt-4">
          {service.category && (
            <p className="text-sm text-muted">{service.category.name}</p>
          )}

          <h3 className="mt-1.5 font-display text-2xl font-semibold uppercase leading-none tracking-tight">
            {service.title}
          </h3>

          {service.excerpt && (
            <p className="mt-2.5 line-clamp-2 text-sm leading-relaxed text-muted">
              {service.excerpt}
            </p>
          )}

          {/* A two-column spec rail, pinned to the bottom so cards align across
              the grid regardless of copy length. */}
          <dl className="mt-auto flex items-end gap-8 border-t border-border pt-3.5">
            <div>
              <dt className="text-xs text-muted">from</dt>
              <dd className="font-display text-xl font-semibold tabular-nums">
                {service.price_from ?? "Price on enquiry"}
                {service.price_from && service.price_unit && (
                  <span className="ml-1 font-sans text-xs font-medium text-muted">
                    {service.price_unit}
                  </span>
                )}
              </dd>
            </div>

            {service.min_order_quantity && (
              <div>
                <dt className="text-xs text-muted">min qty</dt>
                <dd className="font-display text-xl font-semibold tabular-nums">
                  {service.min_order_quantity}
                </dd>
              </div>
            )}
          </dl>
        </div>
      </Link>
    </article>
  );
}
