import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { z } from "zod";

import { JsonLd } from "@/components/site/json-ld";
import { ApiError, apiGet } from "@/lib/api";
import { blogPostSchema, type BlogPost } from "@/lib/schemas";
import { SITE, SITE_URL } from "@/lib/site";

const postSchema = z.object({ data: blogPostSchema });

/**
 * `cache` so `generateMetadata` and the page body share one request rather than
 * fetching the same post twice per render.
 */
const getPost = cache(async (slug: string): Promise<BlogPost | null> => {
  try {
    const { data } = await apiGet(`posts/${slug}`, postSchema);

    return data;
  } catch (error) {
    // A draft or scheduled post is a 404 here — the `live` scope decides that
    // server side, and this page only has to respect it.
    if (error instanceof ApiError && error.isNotFound) {
      return null;
    }

    throw error;
  }
});

/** The one date format on the site: explicit locale and zone, never the runtime default. */
function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export async function generateMetadata({
  params,
}: PageProps<"/blog/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);

  if (!post) {
    return { title: "Post not found" };
  }

  const title = post.meta_title ?? post.title;
  const description = post.meta_description ?? post.excerpt ?? SITE.description;
  const image = post.og_image_url ?? post.featured_image_url;

  return {
    title,
    description,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      // `article`, not `website`: this is a dated, authored piece, and the
      // type is what lets a crawler treat the timestamps below as meaningful.
      type: "article",
      title,
      description,
      url: `/blog/${post.slug}`,
      publishedTime: post.published_at,
      ...(post.author ? { authors: [post.author.name] } : {}),
      ...(image ? { images: [{ url: image }] } : {}),
    },
  };
}

export default async function PostPage({ params }: PageProps<"/blog/[slug]">) {
  const { slug } = await params;
  const post = await getPost(slug);

  if (!post) {
    notFound();
  }

  const image = post.featured_image_url;

  const articleLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.meta_description ?? post.excerpt ?? undefined,
    datePublished: post.published_at,
    ...(image ? { image: [image] } : {}),
    ...(post.author ? { author: { "@type": "Person", name: post.author.name } } : {}),
    publisher: {
      "@type": "Organization",
      name: SITE.name,
      url: SITE_URL,
    },
    mainEntityOfPage: `${SITE_URL}/blog/${post.slug}`,
  };

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Blog", item: `${SITE_URL}/blog` },
      ...(post.category
        ? [
            {
              "@type": "ListItem",
              position: 2,
              name: post.category.name,
              item: `${SITE_URL}/blog?category=${post.category.slug}`,
            },
          ]
        : []),
      {
        "@type": "ListItem",
        position: post.category ? 3 : 2,
        name: post.title,
        item: `${SITE_URL}/blog/${post.slug}`,
      },
    ],
  };

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
      <JsonLd data={articleLd} />
      <JsonLd data={breadcrumbLd} />

      <nav aria-label="Breadcrumb">
        <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted">
          <li>
            <Link href="/blog" className="hover:text-foreground">
              Blog
            </Link>
          </li>

          {post.category && (
            <li className="flex items-center gap-2">
              <span aria-hidden="true">/</span>
              <Link
                href={`/blog?category=${post.category.slug}`}
                className="hover:text-foreground"
              >
                {post.category.name}
              </Link>
            </li>
          )}
        </ol>
      </nav>

      <article className="mt-6">
        <header>
          <h1 className="font-display text-4xl font-bold uppercase leading-[0.95] tracking-tight text-balance sm:text-5xl">
            {post.title}
          </h1>

          <p className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
            <time dateTime={post.published_at} className="tabular-nums">
              {formatDate(post.published_at)}
            </time>

            {post.author && <span>by {post.author.name}</span>}
          </p>

          {post.excerpt && (
            <p className="mt-6 text-lg leading-relaxed text-muted text-pretty">
              {post.excerpt}
            </p>
          )}
        </header>

        {image && (
          <div className="relative mt-8 aspect-16/9 w-full bg-surface">
            <Image
              src={image}
              alt={post.featured_image_alt ?? ""}
              fill
              priority
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 48rem"
            />
          </div>
        )}

        {post.body && (
          /*
           * Plain text, not HTML: the admin edits the body in a textarea, so
           * the only structure it carries is the line breaks the author typed.
           */
          <div className="mt-8 whitespace-pre-line leading-relaxed">{post.body}</div>
        )}

        {post.tags && post.tags.length > 0 && (
          <footer className="mt-10 border-t border-border pt-6">
            <h2 className="sr-only">Tags</h2>

            <ul className="flex flex-wrap gap-2">
              {post.tags.map((tag) => (
                <li key={tag.id}>
                  <Link
                    href={`/blog?tag=${tag.slug}`}
                    className="border border-border px-3 py-1.5 text-sm text-muted hover:border-foreground hover:text-foreground"
                  >
                    {tag.name}
                  </Link>
                </li>
              ))}
            </ul>
          </footer>
        )}
      </article>

      <aside className="mt-16 border-t-2 border-foreground pt-6">
        <h2 className="font-display text-2xl font-semibold uppercase tracking-tight">
          Kitting out a team?
        </h2>
        <p className="mt-2 text-muted text-pretty">
          Send your requirement and quantities. We reply with a costed quote.
        </p>
        <Link
          href="/quote"
          className="mt-5 inline-block bg-accent-solid px-6 py-3 text-sm font-semibold text-accent-foreground hover:opacity-90"
        >
          Request a quote
        </Link>
      </aside>
    </main>
  );
}
