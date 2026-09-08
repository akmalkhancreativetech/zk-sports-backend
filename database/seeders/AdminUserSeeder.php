<?php

namespace Database\Seeders;

use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class AdminUserSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        User::updateOrCreate(
            ['email' => 'admin@zksports.test'],
            [
                'name' => 'ZK Sports Admin',
                'password' => Hash::make('password'),
                'role' => UserRole::Admin,
                'email_verified_at' => now(),
            ],
        );

        User::updateOrCreate(
            ['email' => 'editor@zksports.test'],
            [
                'name' => 'ZK Sports Editor',
                'password' => Hash::make('password'),
                'role' => UserRole::Editor,
                'email_verified_at' => now(),
            ],
        );
    }
}
