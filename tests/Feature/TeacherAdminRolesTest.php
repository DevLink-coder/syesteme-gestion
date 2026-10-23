<?php

namespace Tests\Feature;

use App\Jobs\SendPendingEmailsJob;
use App\Mail\TeacherWelcomeMail;
use App\Models\Salle;
use App\Models\SchoolYear;
use App\Models\Subject;
use App\Models\User;
use App\Support\TenantContext;
use App\Support\TenantDB;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Queue;
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

    public function test_creating_a_teacher_queues_the_welcome_email(): void
    {
        Mail::fake();
        Queue::fake();
        $admin = $this->createUser('admin', true, false);
        $centerId = TenantContext::requireId();

        $year = SchoolYear::create([
            'code' => '2027-2028',
            'label' => '2027-2028',
            'start_date' => '2027-09-01',
            'end_date' => '2028-06-30',
            'is_active' => true,
            'is_archived' => false,
        ]);
        $salle = Salle::create([
            'code' => 'salle-6eme-a-2027',
            'room_id' => '6emeA',
            'name' => '6ème A',
            'school_year_id' => $year->id,
            'status' => 'active',
        ]);
        $subject = Subject::create([
            'name' => 'Mathématiques',
            'slug' => 'mathematiques',
        ]);
        TenantDB::table('salle_subject')->insert([
            'salle_id' => $salle->id,
            'subject_id' => $subject->id,
            'coefficient' => 4,
            'is_optional' => false,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->actingAs($admin)
            ->postJson('/web/teachers', [
                'name' => 'Mme Touré',
                'email' => 'mme.toure@college-liberte.cm',
                'telephone' => '612345678',
                'teaches' => [
                    ['room_id' => $salle->room_id, 'subject' => 'Mathématiques'],
                ],
            ])
            ->assertCreated()
            ->assertJsonPath('mail_queued', true)
            ->assertJsonPath('mail_sent', false);

        $this->assertDatabaseHas('pending_emails', [
            'center_id' => $centerId,
            'email' => 'mme.toure@college-liberte.cm',
            'mailable_class' => TeacherWelcomeMail::class,
            'status' => 'pending',
        ]);
        Queue::assertPushed(SendPendingEmailsJob::class);

        $this->artisan('app:send-pending-emails')->assertSuccessful();

        Mail::assertSent(TeacherWelcomeMail::class, fn (TeacherWelcomeMail $mail): bool => $mail->hasTo('mme.toure@college-liberte.cm'));
        $this->assertDatabaseHas('pending_emails', [
            'center_id' => $centerId,
            'email' => 'mme.toure@college-liberte.cm',
            'status' => 'sent',
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
