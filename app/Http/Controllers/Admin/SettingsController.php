<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Renders the account settings screen. The writes themselves are Fortify's
 * (`PUT /user/profile-information`, `PUT /user/password`), handled by the
 * actions bound in FortifyServiceProvider.
 */
class SettingsController extends Controller
{
    public function edit(Request $request): Response
    {
        $user = $request->user();

        return Inertia::render('admin/settings/index', [
            'profile' => [
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role->value,
                'role_label' => $user->role->label(),
            ],
        ]);
    }
}
