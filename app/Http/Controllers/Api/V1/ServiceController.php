<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\Api\V1\ServiceResource;
use App\Models\Service;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class ServiceController extends Controller
{
    public const PER_PAGE = 12;

    /**
     * @return AnonymousResourceCollection<int, ServiceResource>
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $services = Service::query()
            ->active()
            ->ordered()
            ->with('category')
            ->when(
                $request->string('category')->trim()->value(),
                fn (Builder $query, string $slug) => $query->whereHas(
                    'category',
                    fn (Builder $category) => $category->where('slug', $slug),
                ),
            )
            // The home page's featured strip is the only caller, and it wants a
            // short list rather than a filtered page of the catalogue.
            ->when($request->boolean('featured'), fn (Builder $query) => $query->featured())
            ->when(
                $request->string('search')->trim()->value(),
                fn (Builder $query, string $term) => $query->where(
                    fn (Builder $match) => $match
                        ->where('title', 'like', "%{$term}%")
                        ->orWhere('excerpt', 'like', "%{$term}%"),
                ),
            )
            ->paginate(self::PER_PAGE)
            ->withQueryString();

        return ServiceResource::collection($services);
    }

    /**
     * Resolved by an explicit query rather than route-model binding, so the
     * `active` scope is part of the lookup: an inactive service is a 404, not a
     * record fetched and then rejected.
     */
    public function show(string $slug): ServiceResource
    {
        $service = Service::query()
            ->active()
            ->with(['category', 'images', 'options.values', 'priceTiers'])
            ->where('slug', $slug)
            ->firstOrFail();

        return ServiceResource::make($service);
    }
}
