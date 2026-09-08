<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Service;
use App\Models\ServiceImage;
use App\Services\ImageProcessor;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class ServiceImageController extends Controller
{
    public function __construct(private readonly ImageProcessor $images) {}

    /** Accepts several files at once; each becomes a gallery row. */
    public function store(Request $request, Service $service): RedirectResponse
    {
        Gate::authorize('update', $service);

        $validated = $request->validate([
            'images' => ['required', 'array', 'min:1', 'max:12'],
            'images.*' => ['image', 'mimes:jpeg,jpg,png,webp,avif', 'max:12288'],
        ]);

        $next = (int) $service->images()->max('sort_order') + 1;

        foreach ($validated['images'] as $file) {
            $service->images()->create([
                'path' => $this->images->store($file, 'services/gallery'),
                'sort_order' => $next++,
            ]);
        }

        $count = count($validated['images']);

        return back()->with(
            'success',
            sprintf('%d %s added.', $count, $count === 1 ? 'image' : 'images'),
        );
    }

    public function update(Request $request, Service $service, ServiceImage $image): RedirectResponse
    {
        Gate::authorize('update', $service);
        $this->ensureBelongsTo($service, $image);

        $image->update($request->validate([
            'alt' => ['nullable', 'string', 'max:255'],
        ]));

        return back()->with('success', 'Image updated.');
    }

    public function destroy(Service $service, ServiceImage $image): RedirectResponse
    {
        Gate::authorize('update', $service);
        $this->ensureBelongsTo($service, $image);

        $this->images->delete($image->path);
        $image->delete();

        return back()->with('success', 'Image removed.');
    }

    private function ensureBelongsTo(Service $service, ServiceImage $image): void
    {
        abort_unless($image->service_id === $service->id, 404);
    }
}
