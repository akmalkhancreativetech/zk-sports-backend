<?php

use App\Http\Controllers\Api\V1\BlogCategoryController;
use App\Http\Controllers\Api\V1\BlogPostController;
use App\Http\Controllers\Api\V1\BlogTagController;
use App\Http\Controllers\Api\V1\OrderController;
use App\Http\Controllers\Api\V1\ServiceCategoryController;
use App\Http\Controllers\Api\V1\ServiceController;
use App\Http\Controllers\Api\V1\SliderController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

/*
 * The public Next.js site's API — see docs/frontend-plan.md.
 *
 * Everything is versioned from the start: the frontend deploys separately from
 * this app, so a breaking change to a payload cannot be shipped atomically with
 * its consumer. `v1` is the contract that lets the two drift for a deploy.
 *
 * Fortify's auth endpoints are not here. They live in the `web` group at their
 * bare paths (`POST /login`, `/register`, `/logout`) and already return JSON to
 * a request that expects it, per the handler in bootstrap/app.php.
 *
 * The read endpoints are `index`/`show` only. The one write is the quotation
 * intake below; every other mutation belongs to the admin panel.
 */
Route::middleware('throttle:api')->prefix('v1')->name('api.v1.')->group(function () {
    Route::get('health', fn () => ['ok' => true])->name('health');

    Route::get('sliders/{key}', [SliderController::class, 'show'])->name('sliders.show');

    Route::get('service-categories', [ServiceCategoryController::class, 'index'])
        ->name('service-categories.index');
    Route::get('services', [ServiceController::class, 'index'])->name('services.index');
    Route::get('services/{slug}', [ServiceController::class, 'show'])->name('services.show');

    Route::get('blog-categories', [BlogCategoryController::class, 'index'])
        ->name('blog-categories.index');
    Route::get('blog-tags', [BlogTagController::class, 'index'])->name('blog-tags.index');
    Route::get('posts', [BlogPostController::class, 'index'])->name('posts.index');
    Route::get('posts/{slug}', [BlogPostController::class, 'show'])->name('posts.show');

    /*
     * Unauthenticated and it writes, so it gets its own, far tighter limit:
     * the shared `throttle:api` allowance is sized for a page of reads and
     * would let one address file an enquiry every second.
     */
    Route::post('orders', [OrderController::class, 'store'])
        ->middleware('throttle:5,1')
        ->name('orders.store');

    Route::middleware('auth:sanctum')->group(function () {
        Route::get('me', fn (Request $request) => $request->user())->name('me');
    });
});
