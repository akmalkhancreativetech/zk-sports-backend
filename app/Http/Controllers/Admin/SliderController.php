<?php

namespace App\Http\Controllers\Admin;

use App\Enums\SliderTransition;
use App\Enums\SlideTextPosition;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\SliderRequest;
use App\Models\Slider;
use App\Services\ImageProcessor;
use App\Services\PublicSliders;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class SliderController extends Controller
{
    /** Columns the client is allowed to sort by. */
    private const SORTABLE = ['name', 'key', 'is_active', 'slides_count', 'updated_at'];

    /** Must appear in DataTable's `pageSizeOptions`, or the dropdown shows a
     * value it does not offer. */
    private const PER_PAGE = 15;

    public function index(Request $request): Response
    {
        Gate::authorize('viewAny', Slider::class);

        $filters = $request->validate([
            'search' => ['nullable', 'string', 'max:255'],
            'status' => ['nullable', Rule::in(['active', 'inactive'])],
            'sort' => ['nullable', 'string', Rule::in(self::SORTABLE)],
            'direction' => ['nullable', 'string', Rule::in(['asc', 'desc'])],
            // min:1 so the pagination itself is testable on a small dataset.
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $sort = $filters['sort'] ?? 'updated_at';
        $direction = $filters['direction'] ?? 'desc';
        $search = $filters['search'] ?? null;
        $status = $filters['status'] ?? null;

        $sliders = Slider::query()
            ->withCount('slides')
            ->when($search, fn ($query, string $term) => $query->where(
                fn ($q) => $q->where('name', 'like', "%{$term}%")
                    ->orWhere('key', 'like', "%{$term}%")
            ))
            ->when($status, fn ($query, string $value) => $query->where(
                'is_active',
                $value === 'active',
            ))
            ->orderBy($sort, $direction)
            // Keeps pagination stable when the sort column has ties.
            ->orderBy('id')
            ->paginate($filters['per_page'] ?? self::PER_PAGE)
            ->withQueryString()
            ->through(fn (Slider $slider) => [
                'id' => $slider->id,
                'name' => $slider->name,
                'key' => $slider->key,
                'is_active' => $slider->is_active,
                'slides_count' => $slider->slides_count,
                'updated_at' => $slider->updated_at?->toIso8601String(),
            ]);

        return Inertia::render('admin/sliders/index', [
            'sliders' => $sliders,
            'filters' => [
                'search' => $search,
                'status' => $status,
                'sort' => $sort,
                'direction' => $direction,
            ],
            // Only admins delete sliders; hide the control rather than let it 403.
            'canDelete' => $request->user()->can('delete', new Slider),
        ]);
    }

    public function create(): Response
    {
        Gate::authorize('create', Slider::class);

        return Inertia::render('admin/sliders/create', [
            'transitions' => $this->transitions(),
        ]);
    }

    public function store(SliderRequest $request): RedirectResponse
    {
        Gate::authorize('create', Slider::class);

        $slider = Slider::create($request->validated());

        return to_route('admin.sliders.edit', $slider)
            ->with('success', 'Slider created.');
    }

    public function edit(Slider $slider): Response
    {
        Gate::authorize('update', $slider);

        $slider->load(['slides' => fn ($query) => $query->ordered()]);

        return Inertia::render('admin/sliders/edit', [
            'slider' => [
                'id' => $slider->id,
                'name' => $slider->name,
                'key' => $slider->key,
                'is_active' => $slider->is_active,
                'autoplay' => $slider->autoplay,
                'interval_ms' => $slider->interval_ms,
                'transition' => $slider->transition->value,
            ],
            'slides' => $slider->slides->map(fn ($slide) => [
                'id' => $slide->id,
                'title' => $slide->title,
                'subtitle' => $slide->subtitle,
                'body' => $slide->body,
                'image_url' => $slide->imageUrl(),
                'mobile_image_url' => $slide->mobileImageUrl(),
                'image_alt' => $slide->image_alt,
                'cta_label' => $slide->cta_label,
                'cta_url' => $slide->cta_url,
                'cta_new_tab' => $slide->cta_new_tab,
                'text_position' => $slide->text_position->value,
                'overlay_opacity' => $slide->overlay_opacity,
                'sort_order' => $slide->sort_order,
                'is_active' => $slide->is_active,
                'starts_at' => $slide->starts_at?->toIso8601String(),
                'ends_at' => $slide->ends_at?->toIso8601String(),
            ]),
            'transitions' => $this->transitions(),
            'textPositions' => $this->textPositions(),
        ]);
    }

    /**
     * Renders the slider the way the public site will, so editors can check
     * their work before the Next.js front end exists. Uncached and indifferent
     * to `is_active`, so a draft can be previewed.
     */
    public function preview(Slider $slider, PublicSliders $sliders): Response
    {
        Gate::authorize('view', $slider);

        return Inertia::render('admin/sliders/preview', [
            'slider' => [
                'id' => $slider->id,
                'name' => $slider->name,
                'key' => $slider->key,
                'is_active' => $slider->is_active,
            ],
            'hero' => $sliders->payloadFor($slider),
        ]);
    }

    public function update(SliderRequest $request, Slider $slider): RedirectResponse
    {
        Gate::authorize('update', $slider);

        $slider->update($request->validated());

        return back()->with('success', 'Slider updated.');
    }

    /**
     * Activate, deactivate or delete several sliders in one request.
     *
     * Uses model updates rather than a mass query update so the cache-flush
     * hooks on Slider actually fire.
     */
    public function bulk(Request $request, ImageProcessor $images): RedirectResponse
    {
        $validated = $request->validate([
            'action' => ['required', Rule::in(['activate', 'deactivate', 'delete'])],
            'ids' => ['required', 'array', 'min:1', 'max:100'],
            'ids.*' => ['integer', Rule::exists('sliders', 'id')],
        ]);

        $sliders = Slider::query()->whereKey($validated['ids'])->get();
        $action = $validated['action'];

        // Authorise every row before touching any of them, so a bulk delete is
        // all-or-nothing rather than partially applied.
        foreach ($sliders as $slider) {
            Gate::authorize($action === 'delete' ? 'delete' : 'update', $slider);
        }

        DB::transaction(function () use ($sliders, $action, $images) {
            foreach ($sliders as $slider) {
                if ($action === 'delete') {
                    foreach ($slider->slides as $slide) {
                        $images->delete($slide->image_path);
                        $images->delete($slide->mobile_image_path);
                    }

                    $slider->delete();

                    continue;
                }

                $slider->update(['is_active' => $action === 'activate']);
            }
        });

        $count = $sliders->count();
        $verb = match ($action) {
            'activate' => 'activated',
            'deactivate' => 'deactivated',
            'delete' => 'deleted',
        };

        return back()->with(
            'success',
            sprintf('%d %s %s.', $count, $count === 1 ? 'slider' : 'sliders', $verb),
        );
    }

    public function destroy(Slider $slider, ImageProcessor $images): RedirectResponse
    {
        Gate::authorize('delete', $slider);

        // The FK cascades the rows; the image files are ours to clean up.
        foreach ($slider->slides as $slide) {
            $images->delete($slide->image_path);
            $images->delete($slide->mobile_image_path);
        }

        $slider->delete();

        return to_route('admin.sliders.index')->with('success', 'Slider deleted.');
    }

    /**
     * @return array<int, array{value: string, label: string}>
     */
    private function transitions(): array
    {
        return array_map(
            fn (SliderTransition $case) => ['value' => $case->value, 'label' => $case->label()],
            SliderTransition::cases(),
        );
    }

    /**
     * @return array<int, array{value: string, label: string}>
     */
    private function textPositions(): array
    {
        return array_map(
            fn (SlideTextPosition $case) => ['value' => $case->value, 'label' => $case->label()],
            SlideTextPosition::cases(),
        );
    }
}
