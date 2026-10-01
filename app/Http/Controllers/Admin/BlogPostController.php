<?php

namespace App\Http\Controllers\Admin;

use App\Enums\PostStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\BlogPostRequest;
use App\Models\BlogCategory;
use App\Models\BlogPost;
use App\Models\BlogTag;
use App\Services\ImageProcessor;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class BlogPostController extends Controller
{
    /** Columns the client is allowed to sort by. */
    private const SORTABLE = ['title', 'slug', 'status', 'published_at', 'updated_at'];

    /** Must appear in DataTable's `pageSizeOptions`. */
    private const PER_PAGE = 15;

    public function __construct(private readonly ImageProcessor $images) {}

    public function index(Request $request): Response
    {
        Gate::authorize('viewAny', BlogPost::class);

        $filters = $request->validate([
            'search' => ['nullable', 'string', 'max:255'],
            'status' => ['nullable', Rule::in(['draft', 'published', 'scheduled'])],
            'featured' => ['nullable', Rule::in(['yes', 'no'])],
            'category' => ['nullable', 'integer', Rule::exists('blog_categories', 'id')],
            'trashed' => ['nullable', Rule::in(['with', 'only'])],
            'sort' => ['nullable', 'string', Rule::in(self::SORTABLE)],
            'direction' => ['nullable', 'string', Rule::in(['asc', 'desc'])],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $sort = $filters['sort'] ?? 'published_at';
        $direction = $filters['direction'] ?? 'desc';

        $posts = BlogPost::query()
            ->when(
                $filters['trashed'] ?? null,
                fn ($query, string $value) => $value === 'only'
                    ? $query->onlyTrashed()
                    : $query->withTrashed(),
            )
            ->with(['category:id,name', 'author:id,name'])
            ->withCount('tags')
            ->when(
                $filters['search'] ?? null,
                fn ($query, string $term) => $query->where(
                    fn ($q) => $q->where('title', 'like', "%{$term}%")
                        ->orWhere('slug', 'like', "%{$term}%")
                ),
            )
            ->when($filters['status'] ?? null, function ($query, string $value) {
                // "Scheduled" is derived, so it filters on the date, not a column.
                return match ($value) {
                    'draft' => $query->where('status', PostStatus::Draft),
                    'scheduled' => $query->where('status', PostStatus::Published)
                        ->where('published_at', '>', now()),
                    'published' => $query->live(),
                };
            })
            ->when(
                $filters['featured'] ?? null,
                fn ($query, string $value) => $query->where('is_featured', $value === 'yes'),
            )
            ->when(
                $filters['category'] ?? null,
                fn ($query, int $id) => $query->where('category_id', $id),
            )
            ->orderBy($sort, $direction)
            ->orderBy('id')
            ->paginate($filters['per_page'] ?? self::PER_PAGE)
            ->withQueryString()
            ->through(fn (BlogPost $post) => [
                'id' => $post->id,
                'title' => $post->title,
                'slug' => $post->slug,
                'category' => $post->category?->name,
                'author' => $post->author?->name,
                'tags_count' => $post->tags_count,
                'status' => $post->status->value,
                'is_scheduled' => $post->isScheduled(),
                'published_at' => $post->published_at?->toIso8601String(),
                'is_featured' => $post->is_featured,
                'updated_at' => $post->updated_at?->toIso8601String(),
                'deleted_at' => $post->deleted_at?->toIso8601String(),
            ]);

        return Inertia::render('admin/blog/posts/index', [
            'posts' => $posts,
            'filters' => [
                'search' => $filters['search'] ?? null,
                'status' => $filters['status'] ?? null,
                'featured' => $filters['featured'] ?? null,
                'category' => isset($filters['category']) ? (string) $filters['category'] : null,
                'trashed' => $filters['trashed'] ?? null,
                'sort' => $sort,
                'direction' => $direction,
            ],
            'categories' => $this->categoryOptions(),
            'canDelete' => $request->user()->can('delete', new BlogPost),
            'canRestore' => $request->user()->can('restore', new BlogPost),
        ]);
    }

    public function create(): Response
    {
        Gate::authorize('create', BlogPost::class);

        return Inertia::render('admin/blog/posts/create', [
            'categories' => $this->categoryOptions(),
            'tags' => $this->tagOptions(),
        ]);
    }

    public function store(BlogPostRequest $request): RedirectResponse
    {
        Gate::authorize('create', BlogPost::class);

        $data = $this->prepare($request);
        $data['author_id'] = $request->user()->id;

        $post = BlogPost::create($data);
        $post->tags()->sync($request->validated('tags', []));

        return to_route('admin.blog.posts.edit', $post)->with('success', 'Post created.');
    }

    public function edit(BlogPost $blogPost): Response
    {
        Gate::authorize('update', $blogPost);

        $blogPost->load('tags:id');

        return Inertia::render('admin/blog/posts/edit', [
            'post' => [
                'id' => $blogPost->id,
                'category_id' => $blogPost->category_id ? (string) $blogPost->category_id : null,
                'title' => $blogPost->title,
                'slug' => $blogPost->slug,
                'excerpt' => $blogPost->excerpt,
                'body' => $blogPost->body,
                'featured_image_url' => $blogPost->featuredImageUrl(),
                'featured_image_alt' => $blogPost->featured_image_alt,
                'og_image_url' => $blogPost->ogImageUrl(),
                'status' => $blogPost->status->value,
                // The datetime-local input wants "Y-m-d\TH:i" in local time.
                'published_at' => $blogPost->published_at?->format('Y-m-d\TH:i'),
                'is_featured' => $blogPost->is_featured,
                'meta_title' => $blogPost->meta_title,
                'meta_description' => $blogPost->meta_description,
                'tags' => $blogPost->tags->pluck('id')->map(fn (int $id) => (string) $id),
                'author' => $blogPost->author?->name,
            ],
            'categories' => $this->categoryOptions(),
            'tags' => $this->tagOptions(),
        ]);
    }

    public function update(BlogPostRequest $request, BlogPost $blogPost): RedirectResponse
    {
        Gate::authorize('update', $blogPost);

        $data = $this->prepare($request, $blogPost);

        $blogPost->update($data);
        $blogPost->tags()->sync($request->validated('tags', []));

        return back()->with('success', 'Post updated.');
    }

    /**
     * Soft delete: the public site may still have links pointing at the slug,
     * and an accidental delete should be recoverable.
     */
    public function destroy(BlogPost $blogPost): RedirectResponse
    {
        Gate::authorize('delete', $blogPost);

        $blogPost->delete();

        return to_route('admin.blog.posts.index')->with('success', 'Post deleted.');
    }

    public function restore(BlogPost $blogPost): RedirectResponse
    {
        Gate::authorize('restore', $blogPost);

        $blogPost->restore();

        return back()->with('success', 'Post restored.');
    }

    public function forceDelete(BlogPost $blogPost): RedirectResponse
    {
        Gate::authorize('forceDelete', $blogPost);

        $this->purge($blogPost);

        return to_route('admin.blog.posts.index', ['trashed' => 'only'])
            ->with('success', 'Post permanently deleted.');
    }

    public function bulk(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'action' => ['required', Rule::in([
                'publish', 'draft', 'feature', 'unfeature', 'delete', 'restore', 'force-delete',
            ])],
            'ids' => ['required', 'array', 'min:1', 'max:100'],
            'ids.*' => ['integer', Rule::exists('blog_posts', 'id')],
        ]);

        $action = $validated['action'];

        // Restoring and purging address rows the default scope hides.
        $posts = BlogPost::query()
            ->when(
                in_array($action, ['restore', 'force-delete'], true),
                fn ($query) => $query->withTrashed(),
            )
            ->whereKey($validated['ids'])
            ->get();

        $ability = match ($action) {
            'delete' => 'delete',
            'restore' => 'restore',
            'force-delete' => 'forceDelete',
            default => 'update',
        };

        foreach ($posts as $post) {
            Gate::authorize($ability, $post);
        }

        DB::transaction(function () use ($posts, $action) {
            foreach ($posts as $post) {
                match ($action) {
                    'delete' => $post->delete(),
                    'restore' => $post->restore(),
                    'force-delete' => $this->purge($post),
                    'publish' => $post->update([
                        'status' => PostStatus::Published,
                        'published_at' => $post->published_at ?? now(),
                    ]),
                    'draft' => $post->update(['status' => PostStatus::Draft]),
                    'feature' => $post->update(['is_featured' => true]),
                    'unfeature' => $post->update(['is_featured' => false]),
                };
            }
        });

        $count = $posts->count();

        $outcome = match ($action) {
            'delete' => 'deleted',
            'restore' => 'restored',
            'force-delete' => 'permanently deleted',
            'publish' => 'published',
            'draft' => 'moved to draft',
            default => 'updated',
        };

        return back()->with(
            'success',
            sprintf('%d %s %s.', $count, $count === 1 ? 'post' : 'posts', $outcome),
        );
    }

    /**
     * Shared write path: stores any uploaded images, replacing the previous
     * files, and stamps `published_at` the first time a post goes live.
     *
     * @return array<string, mixed>
     */
    private function prepare(BlogPostRequest $request, ?BlogPost $post = null): array
    {
        $data = $request->safe()->except(['featured_image', 'og_image', 'tags']);

        // Replace then delete, so a failed upload never leaves the row pointing
        // at a file that is already gone.
        foreach (['featured_image', 'og_image'] as $field) {
            if ($request->hasFile($field)) {
                $previous = $post?->{$field};
                $data[$field] = $this->images->store($request->file($field), 'blog');
                $this->images->delete($previous);
            }
        }

        if ($data['status'] === PostStatus::Published->value && empty($data['published_at'])) {
            $data['published_at'] = now();
        }

        return $data;
    }

    /** Files are not covered by the FK cascade, so unlink them explicitly. */
    private function purge(BlogPost $post): void
    {
        $this->images->delete($post->featured_image);
        $this->images->delete($post->og_image);

        $post->forceDelete();
    }

    /**
     * @return array<int, array{value: string, label: string}>
     */
    private function categoryOptions(): array
    {
        return BlogCategory::query()
            ->ordered()
            ->get(['id', 'name'])
            ->map(fn (BlogCategory $category) => [
                'value' => (string) $category->id,
                'label' => $category->name,
            ])
            ->all();
    }

    /**
     * @return array<int, array{value: string, label: string}>
     */
    private function tagOptions(): array
    {
        return BlogTag::query()
            ->ordered()
            ->get(['id', 'name'])
            ->map(fn (BlogTag $tag) => [
                'value' => (string) $tag->id,
                'label' => $tag->name,
            ])
            ->all();
    }
}
