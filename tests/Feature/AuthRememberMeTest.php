<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AuthRememberMeTest extends TestCase
{
    use RefreshDatabase;

    public function test_login_with_remember_enabled_issues_a_remember_token(): void
    {
        $user = User::factory()->create([
            'role' => 'superadmin',
            'is_admin' => false,
            'is_teacher' => false,
            'center_id' => null,
            'password' => Hash::make('password123'),
            'remember_token' => null,
        ]);

        $this->postJson('/login', [
            'email' => $user->email,
            'password' => 'password123',
            'remember' => true,
        ])->assertOk();

        $this->assertNotNull($user->fresh()->remember_token);
        $this->assertAuthenticatedAs($user);
    }

    public function test_login_without_remember_does_not_issue_a_remember_token(): void
    {
        $user = User::factory()->create([
            'role' => 'superadmin',
            'is_admin' => false,
            'is_teacher' => false,
            'center_id' => null,
            'password' => Hash::make('password123'),
            'remember_token' => null,
        ]);

        $this->postJson('/login', [
            'email' => $user->email,
            'password' => 'password123',
        ])->assertOk();

        $this->assertNull($user->fresh()->remember_token);
        $this->assertAuthenticatedAs($user);
    }

    public function test_authenticated_user_receives_their_center_name(): void
    {
        $centerId = DB::table('centers')->insertGetId([
            'name' => 'Centre des Répétitions',
            'slug' => 'centre-des-repetitions-test',
            'director_name' => 'Direction Test',
            'status' => 'active',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $user = User::factory()->create([
            'role' => 'teacher',
            'is_admin' => false,
            'is_teacher' => true,
            'center_id' => $centerId,
        ]);

        $this->actingAs($user)
            ->getJson('/me')
            ->assertOk()
            ->assertJsonPath('center_name', 'Centre des Répétitions');
    }
}
