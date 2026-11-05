<?php

namespace Tests\Feature;

use App\Models\Student;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ParentPortalTest extends TestCase
{
    use RefreshDatabase;

    public function test_parent_login_and_admin_links_use_unprefixed_parent_routes(): void
    {
        $admin = User::factory()->create([
            'role' => 'admin',
            'is_admin' => true,
            'is_teacher' => false,
            'status' => 'active',
        ]);
        $student = Student::create([
            'code' => 'parent-link-student',
            'name' => 'Élève Parent',
            'parent_name' => 'Parent Test',
            'parent_whatsapp' => '612345678',
            'enrollment_status' => 'validée',
        ]);

        $adminLink = $this->actingAs($admin)
            ->postJson("/web/students/{$student->id}/parent-link")
            ->assertOk()
            ->json('url');

        $this->assertSame('/parent/'.$student->code, parse_url($adminLink, PHP_URL_PATH));

        $loginLink = $this->postJson('/web/parent/login', [
            'whatsapp' => $student->parent_whatsapp,
        ])
            ->assertOk()
            ->json('url');

        $this->assertSame('/parent/'.$student->code, parse_url($loginLink, PHP_URL_PATH));
    }
}
