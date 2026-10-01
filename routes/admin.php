<?php

use App\Http\Controllers\Admin\BlogCategoryController;
use App\Http\Controllers\Admin\BlogPostController;
use App\Http\Controllers\Admin\BlogTagController;
use App\Http\Controllers\Admin\OrderController;
use App\Http\Controllers\Admin\OrderStatusController;
use App\Http\Controllers\Admin\ServiceCategoryController;
use App\Http\Controllers\Admin\ServiceController;
use App\Http\Controllers\Admin\ServiceImageController;
use App\Http\Controllers\Admin\ServiceOptionController;
use App\Http\Controllers\Admin\SettingsController;
use App\Http\Controllers\Admin\SlideController;
use App\Http\Controllers\Admin\SliderController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::middleware(['auth', 'can:access-admin'])
    ->prefix('admin')
    ->name('admin.')
    ->group(function () {
        Route::get('/', fn () => Inertia::render('admin/dashboard'))->name('dashboard');

        Route::get('settings', [SettingsController::class, 'edit'])->name('settings');

        // Before the resource routes, so these are not swallowed by
        // `sliders/{slider}`.
        Route::get('sliders/{slider}/preview', [SliderController::class, 'preview'])
            ->name('sliders.preview');
        Route::post('sliders/bulk', [SliderController::class, 'bulk'])
            ->name('sliders.bulk');

        Route::resource('sliders', SliderController::class)->except('show');

        Route::post('sliders/{slider}/slides/reorder', [SlideController::class, 'reorder'])
            ->name('sliders.slides.reorder');
        Route::post('sliders/{slider}/slides', [SlideController::class, 'store'])
            ->name('sliders.slides.store');
        Route::put('sliders/{slider}/slides/{slide}', [SlideController::class, 'update'])
            ->name('sliders.slides.update');
        Route::delete('sliders/{slider}/slides/{slide}', [SlideController::class, 'destroy'])
            ->name('sliders.slides.destroy');

        // Non-resource routes first, so `{service}` does not swallow them.
        Route::post('services/reorder', [ServiceController::class, 'reorder'])
            ->name('services.reorder');
        Route::post('services/bulk', [ServiceController::class, 'bulk'])
            ->name('services.bulk');
        Route::resource('services', ServiceController::class)->except('show');

        // Both act on rows the default binding would hide, hence withTrashed().
        Route::put('services/{service}/restore', [ServiceController::class, 'restore'])
            ->withTrashed()
            ->name('services.restore');
        Route::delete('services/{service}/force', [ServiceController::class, 'forceDelete'])
            ->withTrashed()
            ->name('services.force-delete');

        Route::post('services/{service}/images', [ServiceImageController::class, 'store'])
            ->name('services.images.store');
        Route::put('services/{service}/images/{image}', [ServiceImageController::class, 'update'])
            ->name('services.images.update');
        Route::delete('services/{service}/images/{image}', [ServiceImageController::class, 'destroy'])
            ->name('services.images.destroy');

        // Whole-set replacements: both have cross-row rules (duplicate names,
        // overlapping ranges) that need the full set to validate.
        Route::put('services/{service}/options', [ServiceOptionController::class, 'updateOptions'])
            ->name('services.options.update');
        Route::put('services/{service}/price-tiers', [ServiceOptionController::class, 'updateTiers'])
            ->name('services.price-tiers.update');

        // Before the resource, or `{service_category}` swallows `reorder`.
        Route::post('service-categories/reorder', [ServiceCategoryController::class, 'reorder'])
            ->name('service-categories.reorder');
        Route::resource('service-categories', ServiceCategoryController::class)
            ->only(['index', 'store', 'update', 'destroy']);

        Route::put('service-categories/{serviceCategory}/restore', [ServiceCategoryController::class, 'restore'])
            ->withTrashed()
            ->name('service-categories.restore');
        Route::delete('service-categories/{serviceCategory}/force', [ServiceCategoryController::class, 'forceDelete'])
            ->withTrashed()
            ->name('service-categories.force-delete');

        // Non-resource route first, so `{blogPost}` does not swallow it.
        Route::post('blog/posts/bulk', [BlogPostController::class, 'bulk'])
            ->name('blog.posts.bulk');
        Route::resource('blog/posts', BlogPostController::class)
            ->except('show')
            ->parameters(['posts' => 'blogPost'])
            ->names('blog.posts');

        Route::put('blog/posts/{blogPost}/restore', [BlogPostController::class, 'restore'])
            ->withTrashed()
            ->name('blog.posts.restore');
        Route::delete('blog/posts/{blogPost}/force', [BlogPostController::class, 'forceDelete'])
            ->withTrashed()
            ->name('blog.posts.force-delete');

        // Before the resource, or `{blog_category}` swallows `reorder`.
        Route::post('blog/categories/reorder', [BlogCategoryController::class, 'reorder'])
            ->name('blog.categories.reorder');
        Route::resource('blog/categories', BlogCategoryController::class)
            ->only(['index', 'store', 'update', 'destroy'])
            ->parameters(['categories' => 'blogCategory'])
            ->names('blog.categories');

        Route::put('blog/categories/{blogCategory}/restore', [BlogCategoryController::class, 'restore'])
            ->withTrashed()
            ->name('blog.categories.restore');
        Route::delete('blog/categories/{blogCategory}/force', [BlogCategoryController::class, 'forceDelete'])
            ->withTrashed()
            ->name('blog.categories.force-delete');

        Route::resource('blog/tags', BlogTagController::class)
            ->only(['index', 'store', 'update', 'destroy'])
            ->parameters(['tags' => 'blogTag'])
            ->names('blog.tags');

        // No create or edit: orders arrive from the public site, never from
        // this panel. Status is its own route because it enforces the
        // transition graph and writes an audit row.
        Route::get('orders', [OrderController::class, 'index'])->name('orders.index');
        Route::get('orders/{order}', [OrderController::class, 'show'])->name('orders.show');
        Route::patch('orders/{order}', [OrderController::class, 'update'])->name('orders.update');
        Route::delete('orders/{order}', [OrderController::class, 'destroy'])->name('orders.destroy');
        Route::post('orders/{order}/status', [OrderStatusController::class, 'store'])
            ->name('orders.status.store');
    });
