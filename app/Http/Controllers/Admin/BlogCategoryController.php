<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\BlogCategoryRequest;
use App\Models\BlogCategory;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Categories are a short, flat list, so they are managed inline on one screen
 * rather than through separate create/edit pages — as with service categories.
 */
class BlogCategoryController extends Controller
{
    public function index(Request $request): Response
    {
        Gate::authorize('viewAny', BlogCategory::class);

        return Inertia::render('admin/blog/categories', [
            'categories' => BlogCategory::query()
                ->withCount('posts')
                ->ordered()
                ->get()
                ->map(fn (BlogCategory $category) => [
                    'id' => $category->id,
                    'name' => $category->name,
                    'slug' => $category->slug,
                    'description' => $category->description,
                    'sort_order' => $category->sort_order,
                    'is_active' => $category->is_active,
                    'posts_count' => $category->posts_count,
                ]),
            // Short list, so the trash ships with the page rather than behind a
            // filter: no query-string state for a screen that has none.
            'trashed' => BlogCategory::onlyTrashed()
                ->withCount('posts')
                ->latest('deleted_at')
                ->get()
                ->map(fn (BlogCategory $category) => [
                    'id' => $category->id,
                    'name' => $category->name,
                    'slug' => $category->slug,
                    'posts_count' => $category->posts_count,
                    'deleted_at' => $category->deleted_at?->toIso8601String(),
                ]),
            'canDelete' => $request->user()->can('delete', new BlogCategory),
            'canRestore' => $request->user()->can('restore', new BlogCategory),
        ]);
    }

    public function store(BlogCategoryRequest $request): RedirectResponse
    {
        Gate::authorize('create', BlogCategory::class);

        $data = $request->validated();
        $data['sort_order'] ??= (int) BlogCategory::max('sort_order') + 1;

        BlogCategory::create($data);

        return back()->with('success', 'Category created.');
    }

    public function update(
        BlogCategoryRequest $request,
        BlogCategory $blogCategory,
    ): RedirectResponse {
        Gate::authorize('update', $blogCategory);

        $blogCategory->update($request->validated());

        return back()->with('success', 'Category updated.');
    }

    public function destroy(BlogCategory $blogCategory): RedirectResponse
    {
        Gate::authorize('delete', $blogCategory);

        $blogCategory->delete();

        return back()->with('success', 'Category moved to the trash.');
    }

    public function restore(BlogCategory $blogCategory): RedirectResponse
    {
        Gate::authorize('restore', $blogCategory);

        $blogCategory->restore();

        return back()->with('success', 'Category restored.');
    }

    public function forceDelete(BlogCategory $blogCategory): RedirectResponse
    {
        Gate::authorize('forceDelete', $blogCategory);

        $blogCategory->forceDelete();

        return back()->with('success', 'Category permanently deleted.');
    }

    /** Accepts the whole ordered set in one request, never one call per drag. */
    public function reorder(Request $request): RedirectResponse
    {
        Gate::authorize('create', BlogCategory::class);

        $validated = $request->validate([
            'categories' => ['required', 'array', 'min:1'],
            'categories.*.id' => ['required', 'integer', Rule::exists('blog_categories', 'id')],
            'categories.*.sort_order' => ['required', 'integer', 'min:0'],
        ]);

        DB::transaction(function () use ($validated) {
            foreach ($validated['categories'] as $row) {
                BlogCategory::whereKey($row['id'])->update(['sort_order' => $row['sort_order']]);
            }
        });

        return back()->with('success', 'Order saved.');
    }
}
