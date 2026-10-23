<?php

namespace Database\Seeders;

use App\Support\TenantDB;
use Illuminate\Database\Seeder;

class InscriptionSeeder extends Seeder
{
    public function run(): void
    {
        $data = [
            ['code' => 'ins-s01-2026', 'student' => 's01', 'salle' => 'salle-troisieme-2026', 'year' => '2026-2027', 'statut' => 'Validée', 'tarif' => 'tarif-troisieme-2026', 'date' => '2026-09-01'],
            ['code' => 'ins-s02-2026', 'student' => 's02', 'salle' => 'salle-troisieme-2026', 'year' => '2026-2027', 'statut' => 'Validée', 'tarif' => 'tarif-troisieme-2026', 'date' => '2026-09-02'],
            ['code' => 'ins-s03-2026', 'student' => 's03', 'salle' => 'salle-secondeC-2026', 'year' => '2026-2027', 'statut' => 'Validée', 'tarif' => 'tarif-secondeC-2026', 'date' => '2026-09-01'],
            ['code' => 'ins-s04-2026', 'student' => 's04', 'salle' => 'salle-secondeC-2026', 'year' => '2026-2027', 'statut' => 'En pause', 'tarif' => 'tarif-secondeC-2026', 'date' => '2026-09-05'],
            ['code' => 'ins-s05-2026', 'student' => 's05', 'salle' => 'salle-premiereC-2026', 'year' => '2026-2027', 'statut' => 'Validée', 'tarif' => 'tarif-premiereC-2026', 'date' => '2026-09-01'],
            ['code' => 'ins-s06-2026', 'student' => 's06', 'salle' => 'salle-premiereC-2026', 'year' => '2026-2027', 'statut' => 'Validée', 'tarif' => 'tarif-premiereC-2026', 'date' => '2026-09-03'],
            ['code' => 'ins-s07-2026', 'student' => 's07', 'salle' => 'salle-premiereD-2026', 'year' => '2026-2027', 'statut' => 'Validée', 'tarif' => 'tarif-premiereD-2026', 'date' => '2026-09-10'],
            ['code' => 'ins-s08-2026', 'student' => 's08', 'salle' => 'salle-premiereD-2026', 'year' => '2026-2027', 'statut' => 'Validée', 'tarif' => 'tarif-premiereD-2026', 'date' => '2026-09-01'],
            ['code' => 'ins-s09-2026', 'student' => 's09', 'salle' => 'salle-terminaleC-2026', 'year' => '2026-2027', 'statut' => 'Validée', 'tarif' => 'tarif-terminaleC-2026', 'date' => '2026-09-01'],
            ['code' => 'ins-s10-2026', 'student' => 's10', 'salle' => 'salle-terminaleC-2026', 'year' => '2026-2027', 'statut' => 'En attente de paiement', 'tarif' => 'tarif-terminaleC-2026', 'date' => '2026-09-15'],
            ['code' => 'ins-s11-2026', 'student' => 's11', 'salle' => 'salle-terminaleD-2026', 'year' => '2026-2027', 'statut' => 'Validée', 'tarif' => 'tarif-terminaleD-2026', 'date' => '2026-09-01'],
            ['code' => 'ins-s12-2026', 'student' => 's12', 'salle' => 'salle-terminaleD-2026', 'year' => '2026-2027', 'statut' => 'Validée', 'tarif' => 'tarif-terminaleD-2026', 'date' => '2026-09-01'],
            // Historique 2025-2026
            ['code' => 'ins-s01-2025', 'student' => 's01', 'salle' => 'salle-troisieme-2025', 'year' => '2025-2026', 'statut' => 'Validée', 'tarif' => 'tarif-troisieme-2025', 'date' => '2025-09-01'],
            ['code' => 'ins-s03-2025', 'student' => 's03', 'salle' => 'salle-secondeC-2026', 'year' => '2025-2026', 'statut' => 'Validée', 'tarif' => 'tarif-secondeC-2025', 'date' => '2025-09-01'],
            ['code' => 'ins-s05-2025', 'student' => 's05', 'salle' => 'salle-premiereC-2026', 'year' => '2025-2026', 'statut' => 'Validée', 'tarif' => 'tarif-premiereC-2025', 'date' => '2025-09-01'],
            ['code' => 'ins-s07-2025', 'student' => 's07', 'salle' => 'salle-premiereD-2026', 'year' => '2025-2026', 'statut' => 'Validée', 'tarif' => 'tarif-premiereD-2025', 'date' => '2025-09-01'],
            ['code' => 'ins-s09-2025', 'student' => 's09', 'salle' => 'salle-terminaleC-2026', 'year' => '2025-2026', 'statut' => 'Validée', 'tarif' => 'tarif-premiereC-2025', 'date' => '2025-09-01'],
            ['code' => 'ins-s11-2025', 'student' => 's11', 'salle' => 'salle-terminaleD-2026', 'year' => '2025-2026', 'statut' => 'Validée', 'tarif' => 'tarif-premiereD-2025', 'date' => '2025-09-01'],
        ];

        foreach ($data as $d) {
            $studentId = TenantDB::table('students')->where('code', $d['student'])->value('id');
            $salleId = TenantDB::table('salles')->where('code', $d['salle'])->value('id');
            $yearId = TenantDB::table('school_years')->where('code', $d['year'])->value('id');
            $tarifId = TenantDB::table('tarifs')->where('code', $d['tarif'])->value('id');
            if (! $studentId || ! $salleId || ! $yearId || ! $tarifId) {
                continue;
            }

            TenantDB::table('inscriptions')->updateOrInsert(
                ['code' => $d['code']],
                [
                    'student_id' => $studentId,
                    'salle_id' => $salleId,
                    'school_year_id' => $yearId,
                    'tarif_id' => $tarifId,
                    'statut' => $d['statut'],
                    'date_inscription' => $d['date'],
                    'validated_at' => $d['statut'] === 'Validée' ? $d['date'].' 08:00:00' : null,
                    'paused_at' => $d['statut'] === 'En pause' ? '2026-09-15 10:00:00' : null,
                    'created_at' => $d['date'].' 00:00:00',
                    'updated_at' => now(),
                ]
            );
        }
    }
}
