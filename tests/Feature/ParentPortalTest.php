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

    public function test_parent_login_returns_all_children_for_selection(): void
    {
        $whatsapp = '699887766';
        $first = Student::create([
            'code' => 'enfant-un',
            'name' => 'Alice Martin',
            'parent_name' => 'Parent Test',
            'parent_whatsapp' => $whatsapp,
            'enrollment_status' => 'validée',
        ]);
        $second = Student::create([
            'code' => 'enfant-deux',
            'name' => 'Bruno Martin',
            'parent_name' => 'Parent Test',
            'parent_whatsapp' => '+237'.$whatsapp,
            'enrollment_status' => 'validée',
        ]);
        Student::create([
            'code' => 'enfant-autre',
            'name' => 'Autre Famille',
            'parent_name' => 'Autre Parent',
            'parent_whatsapp' => '600000001',
            'enrollment_status' => 'validée',
        ]);

        $response = $this->postJson('/web/parent/login', [
            'whatsapp' => $whatsapp,
        ])->assertOk();

        $children = $response->json('children');
        $this->assertCount(2, $children);
        $this->assertSame(
            [$first->code, $second->code],
            collect($children)->pluck('code')->all(),
        );

        foreach ($children as $child) {
            $this->assertStringContainsString('/parent/', $child['url']);
            $this->assertStringContainsString('token=', $child['url']);
        }

        // Chaque lien retourné doit être fonctionnel.
        foreach ($children as $child) {
            parse_str((string) parse_url($child['url'], PHP_URL_QUERY), $query);
            $this->getJson('/web/parent/'.($child['code']).'?token='.$query['token'])
                ->assertOk()
                ->assertJsonPath('student.code', $child['code']);
        }
    }
}
