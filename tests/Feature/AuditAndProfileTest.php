<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AuditAndProfileTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_read_audit_logs_and_teacher_cannot(): void
    {
        $admin = $this->createUser('admin');
        $teacher = $this->createUser('teacher');
        $this->insertAuditLog($admin);

        $this->actingAs($admin)
            ->getJson('/web/audit-logs')
            ->assertForbidden();

        $superAdmin = User::factory()->create(['name' => 'Super Admin', 'role' => 'superadmin', 'is_admin' => false, 'is_teacher' => false]);
        $this->actingAs($superAdmin)
            ->getJson('/web/audit-logs')
            ->assertOk()
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.0.auteurNom', 'Direction Test');

        $this->actingAs($teacher)
            ->getJson('/web/audit-logs')
            ->assertRedirect('/enseignant');
    }

    public function test_user_can_update_profile_and_change_password_with_current_password(): void
    {
        $user = $this->createUser('teacher');

        $this->actingAs($user)
            ->putJson('/web/profile', [
                'name' => 'Nom Modifié',
                'email' => 'modified@example.test',
                'telephone' => '612345678',
                'current_password' => 'password',
                'new_password' => 'NewPassword123',
                'new_password_confirmation' => 'NewPassword123',
            ])
            ->assertOk()
            ->assertJsonPath('user.name', 'Nom Modifié')
            ->assertJsonPath('user.email', 'modified@example.test');

        $this->assertDatabaseHas('users', [
            'id' => $user->id,
            'name' => 'Nom Modifié',
            'email' => 'modified@example.test',
            'telephone' => '+237612345678',
        ]);
        $this->assertDatabaseHas('audit_logs', [
            'author_id' => $user->id,
            'details' => 'Mise à jour du profil personnel',
        ]);
        $this->assertTrue(Hash::check('NewPassword123', $user->fresh()->password));
    }

    public function test_profile_password_change_requires_the_current_password(): void
    {
        $user = $this->createUser('teacher');

        $this->actingAs($user)
            ->putJson('/web/profile', [
                'name' => $user->name,
                'email' => $user->email,
                'telephone' => $user->telephone,
                'current_password' => 'incorrect',
                'new_password' => 'NewPassword123',
                'new_password_confirmation' => 'NewPassword123',
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('current_password');

        $this->assertTrue(Hash::check('password', $user->fresh()->password));
    }

    private function createUser(string $role): User
    {
        return User::factory()->create([
            'name' => $role === 'admin' ? 'Direction Test' : 'Professeur Test',
            'role' => $role,
            'is_admin' => $role === 'admin',
            'is_teacher' => $role === 'teacher',
            'status' => 'active',
            'telephone' => '612345678',
        ]);
    }

    private function insertAuditLog(User $author): void
    {
        DB::table('audit_logs')->insert([
            'code' => 'audit-test',
            'author_id' => $author->id,
            'author_name' => $author->name,
            'happened_at' => now(),
            'type' => 'modification_note',
            'entity' => 'Note — Élève Test',
            'school_year_code' => 'non-cloisonne',
            'old_value' => '10',
            'new_value' => '15',
            'details' => 'Note corrigée',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }
}
