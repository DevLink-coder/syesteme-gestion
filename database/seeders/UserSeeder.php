<?php

namespace Database\Seeders;

use App\Support\TenantDB;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        // Admin unique RG-01
        TenantDB::table('users')->updateOrInsert(
            ['email' => 'direction@college-liberte.cm'],
            [
                'code' => 'admin-001',
                'name' => "Direction de l'Établissement",
                'email_verified_at' => now(),
                'password' => Hash::make('password'),
                'role' => 'admin',
                'status' => 'active',
                'telephone' => '+237 699 00 00 01',
                'is_admin' => true,
                'is_teacher' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]
        );
    }
}
