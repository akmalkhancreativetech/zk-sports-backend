<?php

use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Route;

/*
 * The public marketing site is not built yet, so the root sends visitors
 * straight to the admin panel. Branching on auth here rather than a blanket
 * redirect to /login avoids a second hop: `GET /login` carries Fortify's
 * `guest` middleware, which would bounce a signed-in user on to /admin anyway.
 *
 * The public homepage lives in `resources/js/pages/welcome.tsx` and reads the
 * `home_hero` slider through App\Services\PublicSliders — restore the route
 * below when the marketing site starts.
 */
Route::get('/', function () {
    return Auth::check()
        ? redirect()->route('admin.dashboard')
        : redirect()->route('login');
})->name('home');

require __DIR__.'/admin.php';
