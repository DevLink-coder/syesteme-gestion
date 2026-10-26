<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class TeacherAttendanceTest extends TestCase
{
    use RefreshDatabase;

    public function test_center_admin_can_mark_a_teacher_present_or_absent_for_a_date(): void
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
        $centerId = $teacher->center_id;
        $date = '2026-10-26';

        $this->actingAs($admin)
            ->getJson("/web/teacher-attendances?date={$date}")
            ->assertOk()
            ->assertJsonPath('teachers.0.id', (string) $teacher->id)
            ->assertJsonPath('teachers.0.present', null);

        $this->actingAs($admin)
            ->postJson('/web/teacher-attendances', [
                'teacher_id' => $teacher->id,
                'date' => $date,
                'present' => true,
            ])
            ->assertOk()
            ->assertJsonPath('teacher.present', true);

        $this->assertDatabaseHas('teacher_attendances', [
            'center_id' => $centerId,
            'teacher_id' => $teacher->id,
            'marked_by' => $admin->id,
            'date' => $date,
            'present' => true,
        ]);

        $this->actingAs($admin)
            ->postJson('/web/teacher-attendances', [
                'teacher_id' => $teacher->id,
                'date' => $date,
                'present' => false,
            ])
            ->assertOk()
            ->assertJsonPath('teacher.present', false);

        $this->assertSame(
            1,
            DB::table('teacher_attendances')
                ->where('teacher_id', $teacher->id)
                ->where('date', $date)
                ->count(),
        );

        $this->actingAs($admin)
            ->getJson("/web/teacher-attendances?date={$date}")
            ->assertOk()
            ->assertJsonPath('teachers.0.present', false);
    }

    public function test_teacher_cannot_manage_teacher_attendance(): void
    {
        $teacher = User::factory()->create([
            'role' => 'teacher',
            'is_admin' => false,
            'is_teacher' => true,
        ]);

        $this->actingAs($teacher)
            ->getJson('/web/teacher-attendances')
            ->assertRedirect('/enseignant');

        $this->actingAs($teacher)
            ->postJson('/web/teacher-attendances', [
                'teacher_id' => $teacher->id,
                'date' => '2026-10-26',
                'present' => true,
            ])
            ->assertRedirect('/enseignant');
    }
}
