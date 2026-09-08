<?php

namespace App\Providers;

use App\Actions\Fortify\ResetUserPassword;
use App\Actions\Fortify\UpdateUserPassword;
use App\Actions\Fortify\UpdateUserProfileInformation;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Laravel\Fortify\Fortify;

class FortifyServiceProvider extends ServiceProvider
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
        // Only features enabled in config/fortify.php are bound. Registration is
        // deliberately off, and email verification has no page yet — binding a
        // view for either would ship a blank screen if it were switched on.
        Fortify::loginView(fn () => Inertia::render('auth/login'));
        Fortify::requestPasswordResetLinkView(fn () => Inertia::render('auth/forgot-password'));
        Fortify::resetPasswordView(fn (Request $request) => Inertia::render('auth/reset-password', [
            'email' => $request->email,
            'token' => $request->route('token'),
        ]));
        Fortify::confirmPasswordView(fn () => Inertia::render('auth/confirm-password'));

        // The action classes in app/Actions/Fortify are useless until they are
        // bound. `fortify:install` normally writes these; this provider was
        // hand-written and omitted them, so every enabled feature 500'd.
        Fortify::resetUserPasswordsUsing(ResetUserPassword::class);
        Fortify::updateUserProfileInformationUsing(UpdateUserProfileInformation::class);
        Fortify::updateUserPasswordsUsing(UpdateUserPassword::class);

        RateLimiter::for('login', function (Request $request) {
            $key = Str::transliterate(Str::lower($request->input(Fortify::username())).'|'.$request->ip());

            return Limit::perMinute(5)->by($key);
        });
    }
}
