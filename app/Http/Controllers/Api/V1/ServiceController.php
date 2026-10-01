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
            // Bounds on the "from" price. A non-numeric value is ignored rather
            // than rejected, and comparing against `price_from` drops services
            // priced on enquiry whenever either bound is set.
            ->when(
                is_numeric($request->query('min_price')) ? $request->query('min_price') : null,
                fn (Builder $query, string $min) => $query->where('price_from', '>=', $min),
            )
            ->when(
                is_numeric($request->query('max_price')) ? $request->query('max_price') : null,
                fn (Builder $query, string $max) => $query->where('price_from', '<=', $max),
            )
            ->tap(fn (Builder $query) => $this->applySort($query, $request->string('sort')->value()))
            ->paginate(self::PER_PAGE)
            ->withQueryString();

        return ServiceResource::collection($services);
    }

    /**
     * The catalogue's sort orders. An unknown value falls back to the admin's
     * manual order rather than failing, so a stale or hand-edited URL still
     * renders. Products priced "on enquiry" sort after priced ones either way,
     * and `id` breaks ties so pages never repeat or skip a row.
     *
     * @param  Builder<Service>  $query
     */
    private function applySort(Builder $query, string $sort): void
    {
        match ($sort) {
            'price_asc' => $query->orderByRaw('price_from is null')->orderBy('price_from')->orderBy('id'),
            'price_desc' => $query->orderByRaw('price_from is null')->orderByDesc('price_from')->orderBy('id'),
            'newest' => $query->latest()->orderByDesc('id'),
            'name' => $query->orderBy('title')->orderBy('id'),
            default => $query->ordered(),
        };
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
