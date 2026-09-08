<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\SlideRequest;
use App\Models\Slide;
use App\Models\Slider;
use App\Services\ImageProcessor;
use App\Services\PublicSliders;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;

class SlideController extends Controller
{
    public function __construct(private readonly ImageProcessor $images) {}

    public function store(SlideRequest $request, Slider $slider): RedirectResponse
    {
        Gate::authorize('create', Slide::class);

        $data = $request->safe()->except(['image', 'mobile_image']);

        $data['image_path'] = $this->images->store($request->file('image'), 'sliders');

        if ($request->hasFile('mobile_image')) {
            $data['mobile_image_path'] = $this->images->store(
                $request->file('mobile_image'),
                'sliders',
            );
        }

        // Append rather than collide with an existing position.
        $data['sort_order'] = (int) $slider->slides()->max('sort_order') + 1;

        $slider->slides()->create($data);

        return back()->with('success', 'Slide added.');
    }

    public function update(SlideRequest $request, Slider $slider, Slide $slide): RedirectResponse
    {
        Gate::authorize('update', $slide);
        $this->ensureBelongsTo($slider, $slide);

        $data = $request->safe()->except(['image', 'mobile_image']);

        // Replace-then-delete, so a failed upload never leaves the row pointing
        // at a file that is already gone.
        if ($request->hasFile('image')) {
            $previous = $slide->image_path;
            $data['image_path'] = $this->images->store($request->file('image'), 'sliders');
            $this->images->delete($previous);
        }

        if ($request->hasFile('mobile_image')) {
            $previous = $slide->mobile_image_path;
            $data['mobile_image_path'] = $this->images->store(
                $request->file('mobile_image'),
                'sliders',
            );
            $this->images->delete($previous);
        }

        $slide->update($data);

        return back()->with('success', 'Slide updated.');
    }

    public function destroy(Slider $slider, Slide $slide): RedirectResponse
    {
        Gate::authorize('delete', $slide);
        $this->ensureBelongsTo($slider, $slide);

        $this->images->delete($slide->image_path);
        $this->images->delete($slide->mobile_image_path);

        $slide->delete();

        return back()->with('success', 'Slide deleted.');
    }

    /**
     * Accepts the whole ordered set in one request — never one call per drag
     * (plan.md §4.3).
     */
    public function reorder(Request $request, Slider $slider): RedirectResponse
    {
        Gate::authorize('update', $slider);

        $validated = $request->validate([
            'slides' => ['required', 'array', 'min:1'],
            'slides.*.id' => [
                'required',
                'integer',
                // Scoped to this slider, so an id from another slider is rejected.
                Rule::exists('slides', 'id')->where('slider_id', $slider->id),
            ],
            'slides.*.sort_order' => ['required', 'integer', 'min:0'],
        ]);

        DB::transaction(function () use ($validated, $slider) {
            foreach ($validated['slides'] as $row) {
                $slider->slides()
                    ->whereKey($row['id'])
                    ->update(['sort_order' => $row['sort_order']]);
            }
        });

        // A query-builder update fires no model events, so the Slide hook that
        // normally flushes the public cache never runs. Flush it here.
        PublicSliders::forget($slider->key);

        return back()->with('success', 'Slide order saved.');
    }

    private function ensureBelongsTo(Slider $slider, Slide $slide): void
    {
        abort_unless($slide->slider_id === $slider->id, 404);
    }
}
