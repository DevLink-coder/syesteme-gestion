<?php

namespace Database\Seeders;

use App\Support\TenantDB;
use Illuminate\Database\Seeder;

class TarifSeeder extends Seeder
{
    public function run(): void
    {
        $tarifs = [
            ['code' => 'tarif-troisieme-2026', 'salle' => 'salle-troisieme-2026', 'year' => '2026-2027', 'frais' => 20000, 'mens' => 12000],
            ['code' => 'tarif-secondeC-2026', 'salle' => 'salle-secondeC-2026', 'year' => '2026-2027', 'frais' => 18000, 'mens' => 12000],
            ['code' => 'tarif-premiereC-2026', 'salle' => 'salle-premiereC-2026', 'year' => '2026-2027', 'frais' => 25000, 'mens' => 18000],
            ['code' => 'tarif-premiereD-2026', 'salle' => 'salle-premiereD-2026', 'year' => '2026-2027', 'frais' => 22000, 'mens' => 18000],
            ['code' => 'tarif-terminaleC-2026', 'salle' => 'salle-terminaleC-2026', 'year' => '2026-2027', 'frais' => 25000, 'mens' => 20000],
            ['code' => 'tarif-terminaleD-2026', 'salle' => 'salle-terminaleD-2026', 'year' => '2026-2027', 'frais' => 22000, 'mens' => 20000],
            // Historique 2025-2026
            ['code' => 'tarif-troisieme-2025', 'salle' => 'salle-troisieme-2026', 'year' => '2025-2026', 'frais' => 19000, 'mens' => 11000],
            ['code' => 'tarif-secondeC-2025', 'salle' => 'salle-secondeC-2026', 'year' => '2025-2026', 'frais' => 17000, 'mens' => 11000],
            ['code' => 'tarif-premiereC-2025', 'salle' => 'salle-premiereC-2026', 'year' => '2025-2026', 'frais' => 23000, 'mens' => 17000],
            ['code' => 'tarif-premiereD-2025', 'salle' => 'salle-premiereD-2026', 'year' => '2025-2026', 'frais' => 21000, 'mens' => 17000],
            ['code' => 'tarif-terminaleC-2025', 'salle' => 'salle-terminaleC-2026', 'year' => '2025-2026', 'frais' => 23000, 'mens' => 19000],
        ];

        foreach ($tarifs as $t) {
            $salleId = TenantDB::table('salles')->where('code', $t['salle'])->value('id');
            $yearId = TenantDB::table('school_years')->where('code', $t['year'])->value('id');
            if (! $salleId || ! $yearId) {
                continue;
            }
            TenantDB::table('tarifs')->updateOrInsert(
                ['code' => $t['code']],
                [
                    'salle_id' => $salleId,
                    'school_year_id' => $yearId,
                    'frais_inscription' => $t['frais'],
                    'mensualite' => $t['mens'],
                    'created_at' => now(),
                    'updated_at' => now(),
                ]
            );
        }
    }
}
