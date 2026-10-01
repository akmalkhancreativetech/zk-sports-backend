import Image from "next/image";
import Link from "next/link";

import type { BlogPost } from "@/lib/schemas";

/**
 * A post teaser, used by the blog index and the home page strip.
 *
 * `published_at` is formatted with an explicit locale *and* time zone: the
 * runtime default differs between the server and the visitor's browser, which
 * is a hydration mismatch waiting to happen.
 */
export function PostCard({ post }: { post: BlogPost }) {
  return (
    <article className="group h-full border-t-2 border-foreground">
      <Link href={`/blog/${post.slug}`} className="flex h-full flex-col">
        <div className="relative aspect-16/10 w-full overflow-hidden bg-surface">
          {post.featured_image_url && (
            <Image
              src={post.featured_image_url}
              alt={post.featured_image_alt ?? ""}
              fill
              className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            />
          )}
        </div>

        <div className="flex flex-1 flex-col pt-4">
          <div className="flex flex-wrap items-center gap-x-3 text-sm text-muted">
            <time dateTime={post.published_at} className="tabular-nums">
              {new Date(post.published_at).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
                year: "numeric",
                timeZone: "UTC",
              })}
            </time>

            {post.category && <span>{post.category.name}</span>}
          </div>

          <h3 className="mt-1.5 font-display text-2xl font-semibold uppercase leading-none tracking-tight">
            {post.title}
          </h3>

          {post.excerpt && (
            <p className="mt-2.5 line-clamp-3 text-sm leading-relaxed text-muted">
              {post.excerpt}
            </p>
          )}
        </div>
      </Link>
    </article>
  );
}
