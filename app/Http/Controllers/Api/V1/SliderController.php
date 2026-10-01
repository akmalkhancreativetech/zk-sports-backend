<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Services\PublicSliders;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class SliderController extends Controller
{
    public function __construct(private PublicSliders $sliders) {}

    /**
     * `PublicSliders::forKey()` already returns the exact public shape — cached,
     * active-only, live slides in order — and is what the Inertia welcome page
     * renders. So there is no Resource here on purpose: a SliderResource would
     * be a second definition of the same payload, free to drift from it.
     *
     * @return array<string, mixed>
     */
    public function show(string $key): array
    {
        return $this->sliders->forKey($key)
            ?? throw new NotFoundHttpException("No active slider for key [{$key}].");
    }
}
