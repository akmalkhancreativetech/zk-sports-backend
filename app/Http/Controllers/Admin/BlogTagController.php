<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\BlogTagRequest;
use App\Models\BlogTag;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Tags carry no content of their own, so unlike categories they are ordered by
 * name, have no active flag and are deleted outright rather than trashed.
 */
class BlogTagController extends Controller
{
    public function index(Request $request): Response
    {
        Gate::authorize('viewAny', BlogTag::class);

        return Inertia::render('admin/blog/tags', [
            'tags' => BlogTag::query()
                ->withCount('posts')
                ->ordered()
                ->get()
                ->map(fn (BlogTag $tag) => [
                    'id' => $tag->id,
                    'name' => $tag->name,
                    'slug' => $tag->slug,
                    'posts_count' => $tag->posts_count,
                ]),
            'canDelete' => $request->user()->can('delete', new BlogTag),
        ]);
    }

    public function store(BlogTagRequest $request): RedirectResponse
    {
        Gate::authorize('create', BlogTag::class);

        BlogTag::create($request->validated());

        return back()->with('success', 'Tag created.');
    }

    public function update(BlogTagRequest $request, BlogTag $blogTag): RedirectResponse
    {
        Gate::authorize('update', $blogTag);

        $blogTag->update($request->validated());

        return back()->with('success', 'Tag updated.');
    }

    public function destroy(BlogTag $blogTag): RedirectResponse
    {
        Gate::authorize('delete', $blogTag);

        $blogTag->delete();

        return back()->with('success', 'Tag deleted.');
    }
}
