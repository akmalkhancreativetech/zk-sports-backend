<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\Api\V1\ServiceCategoryResource;
use App\Models\ServiceCategory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class ServiceCategoryController extends Controller
{
    /**
     * Categories are flat — there is no `parent_id` on the table — so this is a
     * plain ordered list, not a tree.
     *
     * The count is constrained to active services: a category holding nothing
     * but deactivated services should read as empty, not as stocked.
     *
     * @return AnonymousResourceCollection<int, ServiceCategoryResource>
     */
    public function index(): AnonymousResourceCollection
    {
        $categories = ServiceCategory::query()
            ->active()
            ->ordered()
            ->withCount(['services' => fn (Builder $services) => $services->active()])
            ->get();

        return ServiceCategoryResource::collection($categories);
    }
}
