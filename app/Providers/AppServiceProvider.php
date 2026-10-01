<?php

namespace App\Providers;

use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Gate::define('access-admin', fn (User $user) => in_array(
            $user->role,
            [UserRole::Admin, UserRole::Editor],
            true,
        ));

        Gate::define('manage-users', fn (User $user) => $user->isAdmin());

        /*
         * Laravel 11 dropped the RouteServiceProvider that used to register
         * this, so `throttle:api` in routes/api.php would throw "Rate limiter
         * [api] is not defined" without it. Keyed by user first so one busy
         * office NAT does not throttle every signed-in customer behind it.
         */
        RateLimiter::for('api', fn (Request $request) => Limit::perMinute(60)
            ->by($request->user()?->id ?: $request->ip()));
    }
}
