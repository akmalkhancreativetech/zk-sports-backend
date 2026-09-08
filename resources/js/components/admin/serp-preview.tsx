interface Props {
    metaTitle: string;
    metaDescription: string;
    fallbackTitle: string;
    fallbackDescription: string;
    slug: string;
}

/** Google truncates around these lengths (plan.md §6.3). */
const TITLE_LIMIT = 60;
const DESCRIPTION_LIMIT = 160;

function Counter({ value, limit }: { value: number; limit: number }) {
    const over = value > limit;

    return (
        <span className={over ? 'text-destructive' : 'text-muted-foreground'}>
            {value}/{limit}
            {over && ' — will be truncated'}
        </span>
    );
}

/** Approximates how the page will look in search results. */
export function SerpPreview({
    metaTitle,
    metaDescription,
    fallbackTitle,
    fallbackDescription,
    slug,
}: Props) {
    const title = metaTitle || fallbackTitle || 'Untitled service';
    const description =
        metaDescription || fallbackDescription || 'No description yet.';

    return (
        <div className="flex flex-col gap-3">
            <div className="rounded-lg border bg-card p-4">
                <p className="truncate text-xs text-muted-foreground">
                    zksports.com › services › {slug || 'slug'}
                </p>
                <p className="mt-1 truncate text-lg text-blue-700 dark:text-blue-400">
                    {title}
                </p>
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{description}</p>
            </div>

            <div className="flex flex-wrap gap-4 text-xs">
                <span>
                    Title <Counter value={title.length} limit={TITLE_LIMIT} />
                </span>
                <span>
                    Description{' '}
                    <Counter value={description.length} limit={DESCRIPTION_LIMIT} />
                </span>
            </div>
        </div>
    );
}
