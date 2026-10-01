<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\ServiceCategoryRequest;
use App\Models\ServiceCategory;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Categories are a short, flat list, so they are managed inline on one screen
 * rather than through separate create/edit pages.
 */
class ServiceCategoryController extends Controller
{
    public function index(Request $request): Response
    {
        Gate::authorize('viewAny', ServiceCategory::class);

        return Inertia::render('admin/services/categories', [
            'categories' => ServiceCategory::query()
                ->withCount('services')
                ->ordered()
                ->get()
                ->map(fn (ServiceCategory $category) => [
                    'id' => $category->id,
                    'name' => $category->name,
                    'slug' => $category->slug,
                    'description' => $category->description,
                    'sort_order' => $category->sort_order,
                    'is_active' => $category->is_active,
                    'services_count' => $category->services_count,
                ]),
            // Short list, so the trash ships with the page rather than behind a
            // filter: no query-string state for a screen that has none.
            'trashed' => ServiceCategory::onlyTrashed()
                ->withCount('services')
                ->latest('deleted_at')
                ->get()
                ->map(fn (ServiceCategory $category) => [
                    'id' => $category->id,
                    'name' => $category->name,
                    'slug' => $category->slug,
                    'services_count' => $category->services_count,
                    'deleted_at' => $category->deleted_at?->toIso8601String(),
                ]),
            'canDelete' => $request->user()->can('delete', new ServiceCategory),
            'canRestore' => $request->user()->can('restore', new ServiceCategory),
        ]);
    }

    public function store(ServiceCategoryRequest $request): RedirectResponse
    {
        Gate::authorize('create', ServiceCategory::class);

        $data = $request->validated();
        $data['sort_order'] ??= (int) ServiceCategory::max('sort_order') + 1;

        ServiceCategory::create($data);

        return back()->with('success', 'Category created.');
    }

    public function update(
        ServiceCategoryRequest $request,
        ServiceCategory $serviceCategory,
    ): RedirectResponse {
        Gate::authorize('update', $serviceCategory);

        $serviceCategory->update($request->validated());

        return back()->with('success', 'Category updated.');
    }

    /**
     * The FK is nullOnDelete, so services survive and simply lose their
     * category rather than disappearing with it.
     */
    public function destroy(ServiceCategory $serviceCategory): RedirectResponse
    {
        Gate::authorize('delete', $serviceCategory);

        $serviceCategory->delete();

        return back()->with('success', 'Category deleted. Its services are now uncategorised.');
    }

    public function restore(ServiceCategory $serviceCategory): RedirectResponse
    {
        Gate::authorize('restore', $serviceCategory);

        $serviceCategory->restore();

        return back()->with('success', 'Category restored.');
    }

    /**
     * Only now does the FK fire: `nullOnDelete` leaves services untouched while
     * the category is merely soft-deleted, so restoring puts them back.
     */
    public function forceDelete(ServiceCategory $serviceCategory): RedirectResponse
    {
        Gate::authorize('forceDelete', $serviceCategory);

        $serviceCategory->forceDelete();

        return back()->with('success', 'Category permanently deleted.');
    }

    /** Accepts the whole ordered set in one request, never one call per drag. */
    public function reorder(Request $request): RedirectResponse
    {
        Gate::authorize('create', ServiceCategory::class);

        $validated = $request->validate([
            'categories' => ['required', 'array', 'min:1'],
            'categories.*.id' => ['required', 'integer', Rule::exists('service_categories', 'id')],
            'categories.*.sort_order' => ['required', 'integer', 'min:0'],
        ]);

        DB::transaction(function () use ($validated) {
            foreach ($validated['categories'] as $row) {
                ServiceCategory::whereKey($row['id'])->update(['sort_order' => $row['sort_order']]);
            }
        });

        return back()->with('success', 'Order saved.');
    }
}
