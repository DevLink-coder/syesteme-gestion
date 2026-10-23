<?php

namespace Tests\Feature;

use App\Models\Student;
use App\Models\User;
use App\Support\TenantContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class MultiCenterSecurityTest extends TestCase
{
    use RefreshDatabase;

    public function test_center_users_only_receive_students_from_their_center(): void
    {
        $centerA = TenantContext::requireId();
        $admin = User::factory()->create(['role' => 'admin', 'is_admin' => true, 'is_teacher' => false, 'center_id' => $centerA]);
        $ownStudent = Student::create(['code' => 'own-student', 'name' => 'Élève Centre A', 'parent_name' => 'Parent A', 'parent_whatsapp' => '600000001']);
        $centerB = DB::table('centers')->insertGetId([
            'name' => 'Centre B', 'slug' => 'centre-b', 'director_name' => 'Direction B',
            'status' => 'active', 'created_at' => now(), 'updated_at' => now(),
        ]);
        $foreignStudent = TenantContext::run($centerB, fn () => Student::create([
            'code' => 'foreign-student', 'name' => 'Élève Centre B', 'parent_name' => 'Parent B', 'parent_whatsapp' => '600000002',
        ]));

        $this->actingAs($admin)->getJson('/web/students')
            ->assertOk()
            ->assertJsonFragment(['name' => 'Élève Centre A'])
            ->assertJsonMissing(['name' => 'Élève Centre B']);

        $this->assertNotNull($ownStudent->fresh());
        $this->assertNull(TenantContext::run($centerA, fn () => Student::find($foreignStudent->id)));
    }

    public function test_center_admin_cannot_access_platform_superadmin_endpoints(): void
    {
        $admin = User::factory()->create([
            'role' => 'admin', 'is_admin' => true, 'is_teacher' => false,
            'center_id' => TenantContext::requireId(),
        ]);

        $this->actingAs($admin)->getJson('/web/superadmin/overview')->assertForbidden();
    }

    public function test_superadmin_gets_center_access_only_after_selecting_that_center(): void
    {
        $superadmin = User::factory()->create([
            'role' => 'superadmin', 'is_admin' => false, 'is_teacher' => false, 'center_id' => null,
        ]);
        $centerId = TenantContext::requireId();

        $this->actingAs($superadmin)->getJson('/web/students')->assertForbidden();
        $this->withSession(['selected_center_id' => $centerId])
            ->actingAs($superadmin)
            ->getJson('/web/students')
            ->assertOk();
    }

    public function test_archived_center_accounts_are_blocked_from_center_apis(): void
    {
        $centerId = TenantContext::requireId();
        $admin = User::factory()->create([
            'role' => 'admin', 'is_admin' => true, 'is_teacher' => false, 'center_id' => $centerId,
        ]);
        DB::table('centers')->where('id', $centerId)->update(['status' => 'archived', 'archived_at' => now()]);

        $this->actingAs($admin)->getJson('/web/students')->assertStatus(423);
    }
}
