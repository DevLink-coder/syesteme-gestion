<?php

namespace Tests\Feature;

use App\Mail\CenterDirectorAccessMail;
use App\Models\User;
use App\Support\TenantContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class SuperAdminPlatformTest extends TestCase
{
    use RefreshDatabase;

    public function test_superadmin_can_create_a_center_and_send_director_credentials(): void
    {
        Mail::fake();
        $superadmin = User::factory()->create(['role' => 'superadmin', 'is_admin' => false, 'is_teacher' => false, 'center_id' => null]);

        $response = $this->actingAs($superadmin)->postJson('/web/superadmin/centers', [
            'name' => 'Académie des tests',
            'director_name' => 'Directrice Test',
            'director_email' => 'DIRECTRICE@EXAMPLE.TEST',
        ])->assertCreated()
            ->assertJsonPath('emailQueued', true)
            ->assertJsonPath('emailSent', false);

        $centerId = $response->json('center.id');
        $director = DB::table('users')->where('email', 'directrice@example.test')->first();
        $this->assertNotNull($director);
        $this->assertSame($centerId, (int) $director->center_id);
        $this->assertSame(1, (int) $director->is_teacher);
        $this->assertSame(0, (int) $director->must_change_password);
        $this->assertDatabaseHas('pending_emails', [
            'center_id' => $centerId,
            'email' => 'directrice@example.test',
            'mailable_class' => CenterDirectorAccessMail::class,
            'status' => 'pending',
        ]);

        $this->artisan('app:send-pending-emails')->assertSuccessful();

        $sentPassword = null;
        Mail::assertSent(CenterDirectorAccessMail::class, function (CenterDirectorAccessMail $mail) use (&$sentPassword): bool {
            $sentPassword = $mail->temporaryPassword;
            $this->assertSame(8, strlen($sentPassword));
            $this->assertMatchesRegularExpression('/[A-Z]/', $sentPassword);
            $this->assertMatchesRegularExpression('/[a-z]/', $sentPassword);
            $this->assertMatchesRegularExpression('/[0-9]/', $sentPassword);
            $this->assertMatchesRegularExpression('/[!@#$%&*+\-_]/', $sentPassword);

            return $mail->hasTo('directrice@example.test');
        });
        $this->assertDatabaseHas('pending_emails', [
            'center_id' => $centerId,
            'email' => 'directrice@example.test',
            'status' => 'sent',
        ]);
        $this->assertSame('{}', DB::table('pending_emails')
            ->where('center_id', $centerId)
            ->where('email', 'directrice@example.test')
            ->value('mailable_data'));
        $this->assertTrue(Hash::check($sentPassword, $director->password));
        $directorUser = User::findOrFail($director->id);
        $this->actingAs($directorUser)->getJson('/web/students')->assertOk();
        $this->actingAs($directorUser)
            ->getJson('/web/teachers')
            ->assertOk()
            ->assertJsonFragment([
                'id' => $directorUser->id,
                'is_teacher' => 1,
            ]);
        $this->actingAs($directorUser)
            ->getJson("/web/teachers/{$directorUser->id}/slots")
            ->assertOk();

        $this->actingAs($superadmin)->postJson("/web/superadmin/centers/{$centerId}/status", ['archived' => true])->assertOk();
        $this->actingAs(User::findOrFail($director->id))->getJson('/web/students')->assertStatus(423);
    }

    public function test_audit_endpoint_is_not_available_to_center_administrators(): void
    {
        $admin = User::factory()->create([
            'role' => 'admin', 'is_admin' => true, 'is_teacher' => false,
            'center_id' => TenantContext::requireId(),
        ]);

        $this->actingAs($admin)->getJson('/web/audit-logs')->assertForbidden();
    }

    public function test_superadmin_can_update_a_center_and_its_director_details(): void
    {
        Mail::fake();
        $superadmin = User::factory()->create([
            'role' => 'superadmin',
            'is_admin' => false,
            'is_teacher' => false,
            'center_id' => null,
        ]);

        $centerResponse = $this->actingAs($superadmin)->postJson('/web/superadmin/centers', [
            'name' => 'Centre initial',
            'director_name' => 'Directeur initial',
            'director_email' => 'initial@example.test',
        ])->assertCreated();
        $centerId = $centerResponse->json('center.id');

        $this->actingAs($superadmin)
            ->putJson("/web/superadmin/centers/{$centerId}", [
                'name' => 'Centre modifié',
                'director_name' => 'Directrice modifiée',
                'director_email' => 'directrice-modifiee@example.test',
            ])
            ->assertOk()
            ->assertJsonPath('message', 'Centre et informations du directeur mis à jour.');

        $this->assertDatabaseHas('centers', [
            'id' => $centerId,
            'name' => 'Centre modifié',
            'director_name' => 'Directrice modifiée',
        ]);
        $this->assertDatabaseHas('users', [
            'center_id' => $centerId,
            'name' => 'Directrice modifiée',
            'email' => 'directrice-modifiee@example.test',
        ]);
    }
}
