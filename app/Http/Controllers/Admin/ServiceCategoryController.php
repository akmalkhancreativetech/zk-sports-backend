<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\ServiceCategoryRequest;
use App\Models\ServiceCategory;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
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
            'canDelete' => $request->user()->can('delete', new ServiceCategory),
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
}
