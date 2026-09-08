<?php

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

        Route::resource('service-categories', ServiceCategoryController::class)
            ->only(['index', 'store', 'update', 'destroy']);
    });
