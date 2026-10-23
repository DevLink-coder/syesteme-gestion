<?php

namespace Tests\Feature;

use App\Models\User;
use App\Support\TenantDB;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TeacherPortalTest extends TestCase
{
    use RefreshDatabase;

    public function test_teacher_can_view_their_schedule_and_save_assigned_grades_and_attendance(): void
    {
        $data = $this->createPortalData();

        $this->assertSame(1, TenantDB::table('timetable_slots')->count(), 'The center-scoped slot row was not inserted.');
        $this->assertSame(1, TenantDB::table('timetable_slots')
            ->join('salles', 'salles.id', '=', 'timetable_slots.salle_id')->count(), 'Tenant join to salles failed.');

        $this->assertSame(1, TenantDB::table('timetable_slots')
            ->join('salles', 'salles.id', '=', 'timetable_slots.salle_id')
            ->leftJoin('school_years', 'school_years.id', '=', 'timetable_slots.school_year_id')
            ->whereNull('timetable_slots.deleted_at')->whereNull('salles.deleted_at')
            ->whereNull('school_years.deleted_at')->where('timetable_slots.week_start', $data['weekStart'])->count());

        $this->actingAs($data['teacher'])
            ->getJson('/web/teacher-portal/dashboard')
            ->assertOk()
            ->assertJsonPath('teacher.id', (string) $data['teacher']->id)
            ->assertJsonPath('weekSlotsCount', 1);

        $this->actingAs($data['teacher'])
            ->getJson('/web/teacher-portal/timetable?week_start='.$data['weekStart'])
            ->assertOk()
            ->assertJsonCount(1, 'slots')
            ->assertJsonPath('slots.0.subject', 'Mathématiques');

        $this->actingAs($data['teacher'])
            ->getJson('/web/teacher-portal/evaluations')
            ->assertOk()
            ->assertJsonPath('data.0.id', (string) $data['evaluationId'])
            ->assertJsonPath('data.0.subjects.0.name', 'Mathématiques');

        $this->actingAs($data['teacher'])
            ->getJson("/web/teacher-portal/evaluations/{$data['evaluationId']}/grades?subject_id={$data['subjectId']}")
            ->assertOk()
            ->assertJsonPath('students.0.id', (string) $data['studentId'])
            ->assertJsonPath('students.0.note', null);

        $this->actingAs($data['teacher'])
            ->postJson("/web/teacher-portal/evaluations/{$data['evaluationId']}/grades", [
                'student_id' => $data['studentId'],
                'subject_id' => $data['subjectId'],
                'note' => 15.5,
            ])
            ->assertOk();

        $this->assertDatabaseHas('grades', [
            'evaluation_id' => $data['evaluationId'],
            'student_id' => $data['studentId'],
            'subject_id' => $data['subjectId'],
            'graded_by' => $data['teacher']->id,
        ]);

        $this->actingAs($data['teacher'])
            ->postJson("/web/teacher-portal/slots/{$data['slotId']}/attendance", [
                'date' => $data['date'],
                'attendances' => [
                    ['student_id' => $data['studentId'], 'present' => false],
                ],
            ])
            ->assertOk();

        $this->assertDatabaseHas('attendances', [
            'student_id' => $data['studentId'],
            'timetable_slot_id' => $data['slotId'],
            'date' => $data['date'],
            'present' => false,
            'marked_by' => $data['teacher']->id,
        ]);

        $this->actingAs($data['teacher'])
            ->getJson("/web/teacher-portal/slots/{$data['slotId']}/attendance?date={$data['date']}")
            ->assertOk()
            ->assertJsonPath('hasSaved', true)
            ->assertJsonPath('students.0.present', false);

        $this->actingAs($data['otherTeacher'])
            ->getJson("/web/teacher-portal/slots/{$data['slotId']}/attendance?date={$data['date']}")
            ->assertNotFound();

        $this->actingAs($data['otherTeacher'])
            ->postJson("/web/teacher-portal/evaluations/{$data['evaluationId']}/grades", [
                'student_id' => $data['studentId'],
                'subject_id' => $data['subjectId'],
                'note' => 19,
            ])
            ->assertForbidden();
    }

    public function test_admin_without_a_personal_schedule_can_access_all_teacher_portal_data(): void
    {
        $data = $this->createPortalData();
        $admin = User::factory()->create([
            'role' => 'admin',
            'is_admin' => true,
            'is_teacher' => false,
            'status' => 'active',
        ]);

        $this->actingAs($admin)
            ->getJson('/web/teacher-portal/dashboard')
            ->assertOk()
            ->assertJsonPath('teacher.id', (string) $admin->id)
            ->assertJsonPath('weekSlotsCount', 1);

        $this->actingAs($admin)
            ->getJson('/web/teacher-portal/evaluations')
            ->assertOk()
            ->assertJsonPath('data.0.id', (string) $data['evaluationId']);

        $this->actingAs($admin)
            ->postJson("/web/teacher-portal/evaluations/{$data['evaluationId']}/grades", [
                'student_id' => $data['studentId'],
                'subject_id' => $data['subjectId'],
                'note' => 18,
            ])
            ->assertOk();

        $this->actingAs($admin)
            ->postJson("/web/teacher-portal/slots/{$data['slotId']}/attendance", [
                'date' => $data['date'],
                'attendances' => [
                    ['student_id' => $data['studentId'], 'present' => true],
                ],
            ])
            ->assertOk();
    }

    private function createPortalData(): array
    {
        $teacher = User::factory()->create([
            'code' => 't-portal-1',
            'role' => 'teacher',
            'is_admin' => false,
            'is_teacher' => true,
            'status' => 'active',
        ]);
        $otherTeacher = User::factory()->create([
            'code' => 't-portal-2',
            'role' => 'teacher',
            'is_admin' => false,
            'is_teacher' => true,
            'status' => 'active',
        ]);
        $now = now();
        $yearId = TenantDB::table('school_years')->insertGetId([
            'code' => '2026-2027-portal',
            'label' => '2026-2027',
            'start_date' => '2026-09-01',
            'end_date' => '2027-06-30',
            'is_active' => true,
            'is_archived' => false,
            'created_at' => $now,
            'updated_at' => $now,
        ]);
        $salleId = TenantDB::table('salles')->insertGetId([
            'code' => 'salle-seconde-portal',
            'room_id' => 'secondeA',
            'name' => 'Seconde A',
            'school_year_id' => $yearId,
            'status' => 'active',
            'created_at' => $now,
            'updated_at' => $now,
        ]);
        $subjectId = TenantDB::table('subjects')->insertGetId([
            'name' => 'Mathématiques',
            'slug' => 'mathematiques-portal',
            'created_at' => $now,
            'updated_at' => $now,
        ]);
        TenantDB::table('teacher_subject')->insert([
            'user_id' => $teacher->id,
            'subject_id' => $subjectId,
            'room_id' => 'secondeA',
            'coefficient' => 2,
            'created_at' => $now,
            'updated_at' => $now,
        ]);
        $studentId = TenantDB::table('students')->insertGetId([
            'code' => 's-portal-1',
            'name' => 'Élève Test',
            'parent_name' => 'Parent Test',
            'parent_whatsapp' => '612345678',
            'room_id' => 'secondeA',
            'enrollment_status' => 'validée',
            'created_at' => $now,
            'updated_at' => $now,
        ]);
        $tarifId = TenantDB::table('tarifs')->insertGetId([
            'code' => 'tarif-portal',
            'salle_id' => $salleId,
            'school_year_id' => $yearId,
            'frais_inscription' => 1000,
            'mensualite' => 1000,
            'created_at' => $now,
            'updated_at' => $now,
        ]);
        TenantDB::table('inscriptions')->insert([
            'code' => 'inscription-portal',
            'student_id' => $studentId,
            'salle_id' => $salleId,
            'school_year_id' => $yearId,
            'tarif_id' => $tarifId,
            'statut' => 'Validée',
            'date_inscription' => $now->toDateString(),
            'created_at' => $now,
            'updated_at' => $now,
        ]);
        $evaluationId = TenantDB::table('evaluations')->insertGetId([
            'code' => 'eval-portal',
            'title' => 'Devoir test',
            'salle_id' => $salleId,
            'room_id' => 'secondeA',
            'subject' => 'Mathématiques',
            'date' => $now->toDateString(),
            'status' => 'en attente',
            'school_year_id' => $yearId,
            'created_by' => $teacher->id,
            'created_at' => $now,
            'updated_at' => $now,
        ]);
        $weekStart = $now->copy()->startOfWeek()->toDateString();
        $slotId = TenantDB::table('timetable_slots')->insertGetId([
            'code' => 'slot-portal',
            'salle_id' => $salleId,
            'room_id' => 'secondeA',
            'day' => 'Lundi',
            'start_time' => '08:00:00',
            'end_time' => '09:00:00',
            'subject_id' => $subjectId,
            'subject_name' => 'Mathématiques',
            'teacher_id' => $teacher->id,
            'week_start' => $weekStart,
            'school_year_id' => $yearId,
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        return compact('teacher', 'otherTeacher', 'studentId', 'subjectId', 'evaluationId', 'slotId', 'weekStart') + [
            'date' => $now->toDateString(),
        ];
    }
}
