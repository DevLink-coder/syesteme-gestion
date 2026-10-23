<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class SuperAdminSeeder extends Seeder
{
    public function run(): void
    {
        $email = config('app.superadmin.email');
        $password = config('app.superadmin.password');

        if (! is_string($email) || $email === '' || ! is_string($password) || $password === '') {
            $this->command?->warn('SUPERADMIN_EMAIL and SUPERADMIN_PASSWORD are not set; skipping superadmin seeding.');

            return;
        }

        $user = User::withTrashed()->firstOrCreate(
            ['email' => $email],
            [
                'name' => config('app.superadmin.name', 'Super Admin'),
                'password' => Hash::make($password),
                'email_verified_at' => now(),
                'role' => 'superadmin',
                'status' => 'active',
                'is_admin' => false,
                'is_teacher' => false,
                'center_id' => null,
                'must_change_password' => false,
                'deleted_at' => null,
            ],
        );

        if ($user->trashed()) {
            $user->restore();
        }
    }
}
