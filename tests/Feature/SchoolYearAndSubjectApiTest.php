<?php

namespace Tests\Feature;

use App\Models\Inscription;
use App\Models\Payment;
use App\Models\Salle;
use App\Models\SchoolYear;
use App\Models\Student;
use App\Models\Subject;
use App\Models\Tarif;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SchoolYearAndSubjectApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_school_year_can_be_created_and_searched(): void
    {
        $admin = User::factory()->create([
            'role' => 'admin',
            'status' => 'active',
            'is_admin' => true,
            'is_teacher' => false,
            'email' => 'direction@college-liberte.cm',
        ]);

        $this->actingAs($admin)
            ->postJson('/web/school-years', [
                'code' => '2027-2028',
                'label' => '2027-2028',
                'start_date' => '2027-09-01',
                'end_date' => '2028-06-30',
                'is_active' => true,
            ])
            ->assertCreated();

        $this->actingAs($admin)
            ->getJson('/web/school-years?search=2027')
            ->assertOk()
            ->assertJsonPath('data.0.code', '2027-2028');
    }

    public function test_subject_can_be_created_for_selected_rooms(): void
    {
        $admin = User::factory()->create([
            'role' => 'admin',
            'status' => 'active',
            'is_admin' => true,
            'is_teacher' => false,
            'email' => 'direction@college-liberte.cm',
        ]);

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

        $this->actingAs($admin)
            ->postJson('/web/subjects', [
                'name' => 'Philosophie',
                'coefficient' => 2,
                'room_ids' => [$salle->id],
            ])
            ->assertCreated();

        $this->assertDatabaseHas('subjects', ['name' => 'Philosophie']);
        $this->assertDatabaseHas('salle_subject', [
            'salle_id' => $salle->id,
        ]);
    }

    public function test_subject_creation_records_active_school_year_in_audit_log(): void
    {
        $admin = User::factory()->create([
            'role' => 'admin',
            'status' => 'active',
            'is_admin' => true,
            'is_teacher' => false,
            'email' => 'direction@college-liberte.cm',
        ]);

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

        $this->actingAs($admin)
            ->postJson('/web/subjects', [
                'name' => 'Informatique',
                'coefficient' => 2,
                'room_ids' => [$salle->id],
            ])
            ->assertCreated();

        $this->assertDatabaseHas('audit_logs', [
            'entity' => 'Matière Informatique',
            'school_year_code' => '2027-2028',
            'school_year_id' => $year->id,
        ]);
    }

    public function test_teacher_cannot_be_created_for_an_archived_room(): void
    {
        $admin = User::factory()->create([
            'role' => 'admin',
            'status' => 'active',
            'is_admin' => true,
            'is_teacher' => false,
            'email' => 'direction@college-liberte.cm',
        ]);

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
            'status' => 'archivée',
        ]);

        $subject = Subject::create([
            'name' => 'Mathématiques',
            'slug' => 'mathematiques',
        ]);

        $subject->salles()->attach($salle->id, [
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
            ->assertStatus(422)
            ->assertJsonPath('message', 'La salle 6emeA est archivée et ne peut pas recevoir d\'enseignant.');
    }

    public function test_subject_list_endpoint_returns_paginated_records(): void
    {
        $admin = User::factory()->create([
            'role' => 'admin',
            'status' => 'active',
            'is_admin' => true,
            'is_teacher' => false,
            'email' => 'direction@college-liberte.cm',
        ]);

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
            'name' => 'Informatique',
            'slug' => 'informatique',
        ]);

        $subject->salles()->attach($salle->id, [
            'coefficient' => 2,
            'is_optional' => false,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->actingAs($admin)
            ->getJson('/web/subjects?page=1&per_page=10')
            ->assertOk()
            ->assertJsonPath('meta.total', 1)
            ->assertJsonFragment(['name' => 'Informatique']);
    }

    public function test_subject_name_is_normalized_in_title_case(): void
    {
        $admin = User::factory()->create([
            'role' => 'admin',
            'status' => 'active',
            'is_admin' => true,
            'is_teacher' => false,
            'email' => 'direction@college-liberte.cm',
        ]);

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

        $this->actingAs($admin)
            ->postJson('/web/subjects', [
                'name' => 'philosophie generale',
                'coefficient' => 2,
                'room_ids' => [$salle->id],
            ])
            ->assertCreated()
            ->assertJsonPath('name', 'Philosophie Generale');

        $this->assertDatabaseHas('subjects', ['name' => 'Philosophie Generale']);
    }

    public function test_archiving_a_room_keeps_it_visible_in_the_list(): void
    {
        $admin = User::factory()->create([
            'role' => 'admin',
            'status' => 'active',
            'is_admin' => true,
            'is_teacher' => false,
            'email' => 'direction@college-liberte.cm',
        ]);

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

        $this->actingAs($admin)
            ->postJson('/web/salles/'.$salle->id.'/archive')
            ->assertOk();

        $this->assertDatabaseHas('salles', [
            'id' => $salle->id,
            'status' => 'archivée',
            'deleted_at' => null,
        ]);

        $this->actingAs($admin)
            ->getJson('/web/salles')
            ->assertOk()
            ->assertJsonFragment(['id' => $salle->id]);
    }

    public function test_dashboard_data_endpoint_returns_live_metrics_for_admin(): void
    {
        $admin = User::factory()->create([
            'role' => 'admin',
            'status' => 'active',
            'is_admin' => true,
            'is_teacher' => false,
            'email' => 'direction@college-liberte.cm',
        ]);

        $year = SchoolYear::create([
            'code' => '2027-2028',
            'label' => '2027-2028',
            'start_date' => '2027-09-01',
            'end_date' => '2028-06-30',
            'is_active' => true,
            'is_archived' => false,
        ]);

        Salle::create([
            'code' => 'salle-6eme-a-2027',
            'room_id' => '6emeA',
            'name' => '6ème A',
            'school_year_id' => $year->id,
            'status' => 'active',
        ]);

        $this->actingAs($admin)
            ->getJson('/web/dashboard-data')
            ->assertOk()
            ->assertJsonPath('salles', 1)
            ->assertJsonPath('activeStudents', 0);
    }

    public function test_students_endpoint_returns_live_db_records_for_admin(): void
    {
        $admin = User::factory()->create([
            'role' => 'admin',
            'status' => 'active',
            'is_admin' => true,
            'is_teacher' => false,
            'email' => 'direction@college-liberte.cm',
        ]);

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

        $student = Student::create([
            'code' => 's01',
            'name' => 'Alice Dupont',
            'parent_name' => 'Marie Dupont',
            'parent_whatsapp' => '+237600000001',
            'room_id' => '6emeA',
            'enrollment_status' => 'validée',
        ]);

        $tarif = Tarif::create([
            'code' => 'tarif-6eme-a-2027',
            'salle_id' => $salle->id,
            'school_year_id' => $year->id,
            'frais_inscription' => 15000,
            'mensualite' => 12000,
        ]);

        $inscription = Inscription::create([
            'code' => 'ins-s01-2027',
            'student_id' => $student->id,
            'salle_id' => $salle->id,
            'school_year_id' => $year->id,
            'tarif_id' => $tarif->id,
            'statut' => 'Validée',
            'date_inscription' => '2027-09-05',
        ]);

        Payment::create([
            'code' => 'pay-s01-1',
            'student_id' => $student->id,
            'inscription_id' => $inscription->id,
            'type' => 'inscription',
            'amount' => 10000,
            'expected_amount' => 15000,
            'solde_du' => 5000,
            'status' => 'partiel',
            'due_date' => '2027-09-30',
            'paid_at' => '2027-09-06',
        ]);

        $this->actingAs($admin)
            ->getJson('/web/students')
            ->assertOk()
            ->assertJsonFragment(['student' => ['name' => 'Alice Dupont']]);
    }

    public function test_tarifs_endpoint_returns_db_records(): void
    {
        $admin = User::factory()->create([
            'role' => 'admin',
            'status' => 'active',
            'is_admin' => true,
            'is_teacher' => false,
            'email' => 'direction@college-liberte.cm',
        ]);

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

        Tarif::create([
            'code' => 'tarif-6eme-a-2027-bis',
            'salle_id' => $salle->id,
            'school_year_id' => $year->id,
            'frais_inscription' => 18000,
            'mensualite' => 15000,
        ]);

        $this->actingAs($admin)
            ->getJson('/web/tarifs')
            ->assertOk()
            ->assertJsonFragment(['fraisInscription' => 18000]);
    }

    public function test_dettes_endpoint_returns_db_debt_rows(): void
    {
        $admin = User::factory()->create([
            'role' => 'admin',
            'status' => 'active',
            'is_admin' => true,
            'is_teacher' => false,
            'email' => 'direction@college-liberte.cm',
        ]);

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

        $student = Student::create([
            'code' => 's02',
            'name' => 'Bob Nganou',
            'parent_name' => 'Noel Nganou',
            'parent_whatsapp' => '+237600000002',
            'room_id' => '6emeA',
            'enrollment_status' => 'validée',
        ]);

        $tarif = Tarif::create([
            'code' => 'tarif-6eme-a-2027-2',
            'salle_id' => $salle->id,
            'school_year_id' => $year->id,
            'frais_inscription' => 20000,
            'mensualite' => 12000,
        ]);

        $inscription = Inscription::create([
            'code' => 'ins-s02-2027',
            'student_id' => $student->id,
            'salle_id' => $salle->id,
            'school_year_id' => $year->id,
            'tarif_id' => $tarif->id,
            'statut' => 'En attente de paiement',
            'date_inscription' => '2027-09-04',
        ]);

        Payment::create([
            'code' => 'pay-s02-1',
            'student_id' => $student->id,
            'inscription_id' => $inscription->id,
            'type' => 'inscription',
            'amount' => 5000,
            'expected_amount' => 20000,
            'solde_du' => 15000,
            'status' => 'partiel',
            'due_date' => '2027-09-30',
            'paid_at' => '2027-09-05',
        ]);

        $this->actingAs($admin)
            ->getJson('/web/dettes')
            ->assertOk()
            ->assertJsonFragment(['studentName' => 'Bob Nganou']);
    }
}
