<?php

namespace Tests\Feature;

use App\Models\Salle;
use App\Models\SchoolYear;
use App\Models\Student;
use App\Models\Tarif;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class EnrollmentApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_student_and_inscription_can_be_created_via_api(): void
    {
        $admin = User::factory()->create([
            'role' => 'admin',
            'status' => 'active',
            'is_admin' => true,
            'is_teacher' => false,
            'email' => 'direction@college-liberte.cm',
        ]);

        $year = SchoolYear::create([
            'code' => '2026-2027',
            'label' => '2026-2027',
            'start_date' => '2026-09-01',
            'end_date' => '2027-06-30',
            'is_active' => true,
            'is_archived' => false,
        ]);

        $salle = Salle::create([
            'code' => 'salle-6eme-a-2026',
            'room_id' => '6emeA',
            'name' => '6ème A',
            'school_year_id' => $year->id,
            'status' => 'active',
        ]);

        $tarif = Tarif::create([
            'code' => 'tarif-6eme-a-2026',
            'salle_id' => $salle->id,
            'school_year_id' => $year->id,
            'frais_inscription' => 15000,
            'mensualite' => 25000,
        ]);

        $this->actingAs($admin)
            ->postJson('/web/students', [
                'name' => 'Jean Dupont',
                'parentName' => 'Mme Dupont',
                'parentWhatsApp' => '+237690000001',
                'language' => 'espagnol',
            ])
            ->assertCreated()
            ->assertJsonPath('student.name', 'Jean Dupont');

        $student = Student::query()->where('name', 'Jean Dupont')->firstOrFail();

        $this->actingAs($admin)
            ->postJson('/web/inscriptions', [
                'student_id' => $student->id,
                'salle_id' => $salle->id,
                'school_year_id' => $year->id,
                'tarif_id' => $tarif->id,
                'date_inscription' => now()->toDateString(),
            ])
            ->assertCreated()
            ->assertJsonPath('inscription.student_id', $student->id);

        $this->assertDatabaseHas('students', [
            'name' => 'Jean Dupont',
            'parent_whatsapp' => '+237690000001',
        ]);

        $this->assertDatabaseHas('inscriptions', [
            'student_id' => $student->id,
            'salle_id' => $salle->id,
            'school_year_id' => $year->id,
        ]);

        $this->actingAs($admin)
            ->getJson('/web/dettes')
            ->assertOk()
            ->assertJsonPath('dettes.0.totalDu', 40000)
            ->assertJsonPath('dettes.0.solde', 40000);
    }
}
