<?php

namespace App\Http\Controllers\Admin;

use App\Enums\ServiceOptionType;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\ServiceRequest;
use App\Models\Service;
use App\Models\ServiceCategory;
use App\Services\ImageProcessor;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class ServiceController extends Controller
{
    /** Columns the client is allowed to sort by. */
    private const SORTABLE = ['title', 'slug', 'price_from', 'is_active', 'sort_order', 'updated_at'];

    /** Must appear in DataTable's `pageSizeOptions`. */
    private const PER_PAGE = 15;

    public function __construct(private readonly ImageProcessor $images) {}

    public function index(Request $request): Response
    {
        Gate::authorize('viewAny', Service::class);

        $filters = $request->validate([
            'search' => ['nullable', 'string', 'max:255'],
            'status' => ['nullable', Rule::in(['active', 'inactive'])],
            'featured' => ['nullable', Rule::in(['yes', 'no'])],
            'category' => ['nullable', 'integer', Rule::exists('service_categories', 'id')],
            'trashed' => ['nullable', Rule::in(['with', 'only'])],
            'sort' => ['nullable', 'string', Rule::in(self::SORTABLE)],
            'direction' => ['nullable', 'string', Rule::in(['asc', 'desc'])],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $sort = $filters['sort'] ?? 'sort_order';
        $direction = $filters['direction'] ?? 'asc';

        $services = Service::query()
            ->when(
                $filters['trashed'] ?? null,
                fn ($query, string $value) => $value === 'only'
                    ? $query->onlyTrashed()
                    : $query->withTrashed(),
            )
            ->with('category:id,name')
            ->withCount('images')
            ->when(
                $filters['search'] ?? null,
                fn ($query, string $term) => $query->where(
                    fn ($q) => $q->where('title', 'like', "%{$term}%")
                        ->orWhere('slug', 'like', "%{$term}%")
                ),
            )
            ->when(
                $filters['status'] ?? null,
                fn ($query, string $value) => $query->where('is_active', $value === 'active'),
            )
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
            ->through(fn (Service $service) => [
                'id' => $service->id,
                'title' => $service->title,
                'slug' => $service->slug,
                'category' => $service->category?->name,
                'price_from' => $service->price_from,
                'price_unit' => $service->price_unit,
                'images_count' => $service->images_count,
                'is_active' => $service->is_active,
                'is_featured' => $service->is_featured,
                'sort_order' => $service->sort_order,
                'updated_at' => $service->updated_at?->toIso8601String(),
                'deleted_at' => $service->deleted_at?->toIso8601String(),
            ]);

        return Inertia::render('admin/services/index', [
            'services' => $services,
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
            'canDelete' => $request->user()->can('delete', new Service),
            'canRestore' => $request->user()->can('restore', new Service),
        ]);
    }

    public function create(): Response
    {
        Gate::authorize('create', Service::class);

        return Inertia::render('admin/services/create', [
            'categories' => $this->categoryOptions(),
        ]);
    }

    public function store(ServiceRequest $request): RedirectResponse
    {
        Gate::authorize('create', Service::class);

        $data = $request->safe()->except(['featured_image', 'og_image']);
        $data['sort_order'] = (int) Service::max('sort_order') + 1;

        foreach (['featured_image', 'og_image'] as $field) {
            if ($request->hasFile($field)) {
                $data[$field] = $this->images->store($request->file($field), 'services');
            }
        }

        $service = Service::create($data);

        return to_route('admin.services.edit', $service)->with('success', 'Service created.');
    }

    public function edit(Service $service): Response
    {
        Gate::authorize('update', $service);

        $service->load(['images', 'options.values', 'priceTiers']);

        return Inertia::render('admin/services/edit', [
            'service' => [
                'id' => $service->id,
                'category_id' => $service->category_id ? (string) $service->category_id : null,
                'title' => $service->title,
                'slug' => $service->slug,
                'excerpt' => $service->excerpt,
                'description' => $service->description,
                'icon' => $service->icon,
                'featured_image_url' => $service->featuredImageUrl(),
                'og_image_url' => $service->ogImageUrl(),
                'price_from' => $service->price_from,
                'price_unit' => $service->price_unit,
                'min_order_quantity' => $service->min_order_quantity,
                'is_featured' => $service->is_featured,
                'is_active' => $service->is_active,
                'meta_title' => $service->meta_title,
                'meta_description' => $service->meta_description,
            ],
            'images' => $service->images->map(fn ($image) => [
                'id' => $image->id,
                'url' => $image->url(),
                'alt' => $image->alt,
                'sort_order' => $image->sort_order,
            ]),
            'options' => $service->options->map(fn ($option) => [
                'name' => $option->name,
                'type' => $option->type->value,
                'is_required' => $option->is_required,
                'values' => $option->values->map(fn ($value) => [
                    'label' => $value->label,
                    'price_delta' => $value->price_delta,
                ])->values(),
            ]),
            'priceTiers' => $service->priceTiers->map(fn ($tier) => [
                'min_qty' => $tier->min_qty,
                'max_qty' => $tier->max_qty,
                'unit_price' => $tier->unit_price,
            ]),
            'optionTypes' => array_map(
                fn (ServiceOptionType $case) => [
                    'value' => $case->value,
                    'label' => $case->label(),
                ],
                ServiceOptionType::cases(),
            ),
            'categories' => $this->categoryOptions(),
        ]);
    }

    public function update(ServiceRequest $request, Service $service): RedirectResponse
    {
        Gate::authorize('update', $service);

        $data = $request->safe()->except(['featured_image', 'og_image']);

        // Replace then delete, so a failed upload never leaves the row pointing
        // at a file that is already gone.
        foreach (['featured_image', 'og_image'] as $field) {
            if ($request->hasFile($field)) {
                $previous = $service->{$field};
                $data[$field] = $this->images->store($request->file($field), 'services');
                $this->images->delete($previous);
            }
        }

        $service->update($data);

        return back()->with('success', 'Service updated.');
    }

    /**
     * Soft delete: order line items snapshot name and price, but their
     * `service_id` should still resolve for reporting (plan.md §5.2).
     */
    public function destroy(Service $service): RedirectResponse
    {
        Gate::authorize('delete', $service);

        $service->delete();

        return to_route('admin.services.index')->with('success', 'Service deleted.');
    }

    public function restore(Service $service): RedirectResponse
    {
        Gate::authorize('restore', $service);

        $service->restore();

        return back()->with('success', 'Service restored.');
    }

    public function forceDelete(Service $service): RedirectResponse
    {
        Gate::authorize('forceDelete', $service);

        $this->purge($service);

        return to_route('admin.services.index', ['trashed' => 'only'])
            ->with('success', 'Service permanently deleted.');
    }

    /**
     * The child rows cascade in the database, but their files do not: every
     * image path has to be unlinked here or the disk keeps orphans forever.
     */
    private function purge(Service $service): void
    {
        foreach ($service->images as $image) {
            $this->images->delete($image->path);
        }

        $this->images->delete($service->featured_image);
        $this->images->delete($service->og_image);

        $service->forceDelete();
    }

    /** Accepts the whole ordered set in one request, never one call per drag. */
    public function reorder(Request $request): RedirectResponse
    {
        Gate::authorize('create', Service::class);

        $validated = $request->validate([
            'services' => ['required', 'array', 'min:1'],
            'services.*.id' => ['required', 'integer', Rule::exists('services', 'id')],
            'services.*.sort_order' => ['required', 'integer', 'min:0'],
        ]);

        DB::transaction(function () use ($validated) {
            foreach ($validated['services'] as $row) {
                Service::whereKey($row['id'])->update(['sort_order' => $row['sort_order']]);
            }
        });

        return back()->with('success', 'Order saved.');
    }

    public function bulk(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'action' => ['required', Rule::in([
                'activate', 'deactivate', 'feature', 'unfeature', 'delete', 'restore', 'force-delete',
            ])],
            'ids' => ['required', 'array', 'min:1', 'max:100'],
            'ids.*' => ['integer', Rule::exists('services', 'id')],
        ]);

        $action = $validated['action'];

        // Restoring and purging address rows the default scope hides.
        $services = Service::query()
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

        foreach ($services as $service) {
            Gate::authorize($ability, $service);
        }

        DB::transaction(function () use ($services, $action) {
            foreach ($services as $service) {
                match ($action) {
                    'delete' => $service->delete(),
                    'restore' => $service->restore(),
                    'force-delete' => $this->purge($service),
                    'activate' => $service->update(['is_active' => true]),
                    'deactivate' => $service->update(['is_active' => false]),
                    'feature' => $service->update(['is_featured' => true]),
                    'unfeature' => $service->update(['is_featured' => false]),
                };
            }
        });

        $count = $services->count();

        $outcome = match ($action) {
            'delete' => 'deleted',
            'restore' => 'restored',
            'force-delete' => 'permanently deleted',
            default => 'updated',
        };

        return back()->with(
            'success',
            sprintf('%d %s %s.', $count, $count === 1 ? 'service' : 'services', $outcome),
        );
    }

    /**
     * @return array<int, array{value: string, label: string}>
     */
    private function categoryOptions(): array
    {
        return ServiceCategory::query()
            ->ordered()
            ->get(['id', 'name'])
            ->map(fn (ServiceCategory $category) => [
                'value' => (string) $category->id,
                'label' => $category->name,
            ])
            ->all();
    }
}
