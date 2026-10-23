<?php

namespace Tests\Feature;

use App\Models\Attendance;
use App\Models\Evaluation;
use App\Models\Grade;
use App\Models\Inscription;
use App\Models\Payment;
use App\Models\SchoolYear;
use App\Models\Student;
use App\Models\Subject;
use App\Models\Tarif;
use App\Models\TimetableSlot;
use App\Models\User;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class SoftDeletesTest extends TestCase
{
    use RefreshDatabase;

    public function test_business_models_use_soft_deletes(): void
    {
        foreach ([
            SchoolYear::class,
            Subject::class,
            Tarif::class,
            Inscription::class,
            Payment::class,
            TimetableSlot::class,
            Attendance::class,
            Evaluation::class,
            Grade::class,
        ] as $model) {
            $this->assertContains(SoftDeletes::class, class_uses_recursive($model));
        }
    }

    public function test_student_can_be_soft_deleted_and_restored_through_the_api(): void
    {
        $admin = User::factory()->create([
            'role' => 'admin',
            'is_admin' => true,
            'is_teacher' => false,
            'status' => 'active',
        ]);
        $student = Student::create([
            'code' => 'student-soft-delete',
            'name' => 'Élève Soft Delete',
            'parent_name' => 'Parent Test',
            'parent_whatsapp' => '612345678',
            'enrollment_status' => 'validée',
        ]);

        $this->actingAs($admin)
            ->deleteJson("/web/students/{$student->id}")
            ->assertOk();

        $this->assertSoftDeleted('students', ['id' => $student->id]);
        $this->assertNull(Student::find($student->id));

        $this->actingAs($admin)
            ->postJson("/web/students/{$student->id}/restore")
            ->assertOk();

        $this->assertDatabaseHas('students', [
            'id' => $student->id,
            'deleted_at' => null,
        ]);
        $this->assertSame('Élève Soft Delete', Student::findOrFail($student->id)->name);
    }

    public function test_restoring_a_subject_keeps_its_room_assignments(): void
    {
        $admin = User::factory()->create([
            'role' => 'admin',
            'is_admin' => true,
            'is_teacher' => false,
            'status' => 'active',
        ]);
        $now = now();
        $yearId = DB::table('school_years')->insertGetId([
            'code' => '2026-2027-soft-delete',
            'label' => '2026-2027',
            'start_date' => '2026-09-01',
            'end_date' => '2027-06-30',
            'is_active' => true,
            'is_archived' => false,
            'created_at' => $now,
            'updated_at' => $now,
        ]);
        $salleId = DB::table('salles')->insertGetId([
            'code' => 'salle-soft-delete',
            'room_id' => 'secondeSoftDelete',
            'name' => 'Seconde Soft Delete',
            'school_year_id' => $yearId,
            'status' => 'active',
            'created_at' => $now,
            'updated_at' => $now,
        ]);
        $subject = Subject::create([
            'name' => 'Matière Soft Delete',
            'slug' => 'matiere-soft-delete',
        ]);
        $subject->salles()->attach($salleId, [
            'coefficient' => 2,
            'is_optional' => false,
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        $this->actingAs($admin)
            ->deleteJson("/web/subjects/{$subject->id}")
            ->assertOk();

        $this->assertSoftDeleted('subjects', ['id' => $subject->id]);
        $this->assertDatabaseHas('salle_subject', [
            'salle_id' => $salleId,
            'subject_id' => $subject->id,
        ]);

        $this->actingAs($admin)
            ->postJson("/web/subjects/{$subject->id}/restore")
            ->assertOk();

        $this->assertCount(1, Subject::findOrFail($subject->id)->salles);
    }
}
