<?php

namespace Tests\Feature;

use App\Models\User;
use Database\Seeders\UserSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminOnlySeedTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_seeder_keeps_only_admin_account(): void
    {
        $this->seed(UserSeeder::class);

        $this->assertSame(1, User::count());
        $this->assertDatabaseHas('users', [
            'email' => 'direction@college-liberte.cm',
            'role' => 'admin',
            'status' => 'active',
        ]);
        $this->assertDatabaseMissing('users', ['role' => 'teacher']);
    }
}
