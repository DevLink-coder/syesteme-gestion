<?php

namespace Tests\Feature;

use App\Models\Salle;
use App\Models\SchoolYear;
use App\Models\Subject;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class TeacherAssignmentsTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_replace_a_teachers_subject_and_room_assignments(): void
    {
        $admin = User::factory()->create([
            'role' => 'admin',
            'is_admin' => true,
            'is_teacher' => false,
        ]);
        $teacher = User::factory()->create([
            'role' => 'teacher',
            'is_admin' => false,
            'is_teacher' => true,
        ]);
        $year = SchoolYear::create([
            'code' => '2027-2028-teacher-assignments',
            'label' => '2027-2028',
            'start_date' => '2027-09-01',
            'end_date' => '2028-06-30',
            'is_active' => true,
            'is_archived' => false,
        ]);
        $firstRoom = Salle::create([
            'code' => 'room-first-assignment',
            'room_id' => 'PremiereA',
            'name' => 'Première A',
            'school_year_id' => $year->id,
            'status' => 'active',
        ]);
        $secondRoom = Salle::create([
            'code' => 'room-second-assignment',
            'room_id' => 'TerminaleA',
            'name' => 'Terminale A',
            'school_year_id' => $year->id,
            'status' => 'active',
        ]);
        $firstSubject = Subject::create([
            'name' => 'Mathématiques',
            'slug' => 'mathematiques',
        ]);
        $secondSubject = Subject::create([
            'name' => 'Physique',
            'slug' => 'physique',
        ]);
        DB::table('salle_subject')->insert([
            'center_id' => $firstRoom->center_id,
            'salle_id' => $firstRoom->id,
            'subject_id' => $firstSubject->id,
            'coefficient' => 3,
            'is_optional' => false,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        DB::table('salle_subject')->insert([
            'center_id' => $secondRoom->center_id,
            'salle_id' => $secondRoom->id,
            'subject_id' => $secondSubject->id,
            'coefficient' => 2,
            'is_optional' => false,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        DB::table('teacher_subject')->insert([
            'center_id' => $teacher->center_id,
            'user_id' => $teacher->id,
            'subject_id' => $firstSubject->id,
            'room_id' => $firstRoom->room_id,
            'coefficient' => 3,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $response = $this->actingAs($admin)
            ->putJson("/web/teachers/{$teacher->id}", [
                'teaches' => [
                    [
                        'room_id' => $secondRoom->room_id,
                        'subject' => $secondSubject->name,
                    ],
                ],
            ]);
        $response->assertOk();

        $this->assertDatabaseMissing('teacher_subject', [
            'user_id' => $teacher->id,
            'subject_id' => $firstSubject->id,
            'room_id' => $firstRoom->room_id,
        ]);
        $this->assertDatabaseHas('teacher_subject', [
            'user_id' => $teacher->id,
            'subject_id' => $secondSubject->id,
            'room_id' => $secondRoom->room_id,
            'coefficient' => 2,
        ]);
    }

    public function test_admin_cannot_assign_a_subject_that_is_not_linked_to_the_room(): void
    {
        $admin = User::factory()->create([
            'role' => 'admin',
            'is_admin' => true,
            'is_teacher' => false,
        ]);
        $teacher = User::factory()->create([
            'role' => 'teacher',
            'is_admin' => false,
            'is_teacher' => true,
        ]);
        $year = SchoolYear::create([
            'code' => '2027-2028-invalid-teacher-assignment',
            'label' => '2027-2028',
            'start_date' => '2027-09-01',
            'end_date' => '2028-06-30',
            'is_active' => true,
            'is_archived' => false,
        ]);
        $room = Salle::create([
            'code' => 'room-invalid-assignment',
            'room_id' => 'SecondeA',
            'name' => 'Seconde A',
            'school_year_id' => $year->id,
            'status' => 'active',
        ]);
        $subject = Subject::create([
            'name' => 'Chimie',
            'slug' => 'chimie',
        ]);

        $this->actingAs($admin)
            ->putJson("/web/teachers/{$teacher->id}", [
                'teaches' => [
                    ['room_id' => $room->room_id, 'subject' => $subject->name],
                ],
            ])
            ->assertUnprocessable()
            ->assertJsonPath('message', "La matière Chimie n'est pas enseignée en SecondeA.");

        $this->assertDatabaseMissing('teacher_subject', [
            'user_id' => $teacher->id,
            'subject_id' => $subject->id,
        ]);
    }
}
