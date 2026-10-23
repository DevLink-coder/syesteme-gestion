<?php

namespace Tests\Feature;

use App\Models\User;
use App\Support\TenantDB;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TeacherAdminRolesTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_promote_a_teacher_and_the_promoter_is_recorded(): void
    {
        $admin = $this->createUser('admin', true, false);
        $teacher = $this->createUser('teacher', false, true);

        $this->actingAs($admin)
            ->postJson("/web/teachers/{$teacher->id}/promote-admin")
            ->assertOk();

        $this->assertDatabaseHas('users', [
            'id' => $teacher->id,
            'role' => 'admin',
            'is_admin' => true,
            'is_teacher' => true,
        ]);
        $this->assertDatabaseHas('admin_promotions', [
            'promoter_id' => $admin->id,
            'promoted_user_id' => $teacher->id,
        ]);
    }

    public function test_promoted_admin_cannot_demote_the_admin_who_promoted_them(): void
    {
        $promoter = $this->createUser('promoter', true, true);
        $promotedAdmin = $this->createUser('promoted', true, true);
        $this->recordPromotion($promoter, $promotedAdmin);

        $this->actingAs($promotedAdmin)
            ->postJson("/web/teachers/{$promoter->id}/demote-admin")
            ->assertForbidden();

        $this->actingAs($promotedAdmin)
            ->getJson('/web/teachers')
            ->assertOk()
            ->assertJsonFragment([
                'id' => $promoter->id,
                'cannotDemote' => true,
            ]);

        $this->assertDatabaseHas('users', [
            'id' => $promoter->id,
            'role' => 'admin',
            'is_admin' => true,
        ]);
    }

    public function test_another_admin_can_demote_a_promoted_teacher(): void
    {
        $promoter = $this->createUser('promoter', true, false);
        $actor = $this->createUser('actor', true, false);
        $promotedAdmin = $this->createUser('promoted', true, true);
        $this->recordPromotion($promoter, $promotedAdmin);

        $this->actingAs($actor)
            ->postJson("/web/teachers/{$promotedAdmin->id}/demote-admin")
            ->assertOk();

        $this->assertDatabaseHas('users', [
            'id' => $promotedAdmin->id,
            'role' => 'teacher',
            'is_admin' => false,
            'is_teacher' => true,
        ]);
    }

    private function createUser(string $name, bool $isAdmin, bool $isTeacher): User
    {
        return User::factory()->create([
            'name' => $name,
            'role' => $isAdmin ? 'admin' : 'teacher',
            'is_admin' => $isAdmin,
            'is_teacher' => $isTeacher,
            'status' => 'active',
        ]);
    }

    private function recordPromotion(User $promoter, User $promotedUser): void
    {
        TenantDB::table('admin_promotions')->insert([
            'promoter_id' => $promoter->id,
            'promoted_user_id' => $promotedUser->id,
            'promoted_at' => now(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }
}
