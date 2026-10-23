<?php

namespace Database\Seeders;

use App\Support\TenantDB;
use Illuminate\Database\Seeder;

class SalleSeeder extends Seeder
{
    public function run(): void
    {
        $year2026 = TenantDB::table('school_years')->where('code', '2026-2027')->first();
        $year2025 = TenantDB::table('school_years')->where('code', '2025-2026')->first();

        $salles = [
            ['code' => 'salle-troisieme-2026', 'room_id' => 'troisieme', 'name' => 'Troisième', 'year' => $year2026->id],
            ['code' => 'salle-secondeC-2026', 'room_id' => 'secondeC', 'name' => 'Seconde C', 'year' => $year2026->id],
            ['code' => 'salle-premiereC-2026', 'room_id' => 'premiereC', 'name' => 'Première C', 'year' => $year2026->id],
            ['code' => 'salle-premiereD-2026', 'room_id' => 'premiereD', 'name' => 'Première D', 'year' => $year2026->id],
            ['code' => 'salle-terminaleC-2026', 'room_id' => 'terminaleC', 'name' => 'Terminale C', 'year' => $year2026->id],
            ['code' => 'salle-terminaleD-2026', 'room_id' => 'terminaleD', 'name' => 'Terminale D', 'year' => $year2026->id],
            ['code' => 'salle-troisieme-2025', 'room_id' => 'troisieme', 'name' => 'Troisième', 'year' => $year2025->id],
        ];

        foreach ($salles as $s) {
            TenantDB::table('salles')->updateOrInsert(
                ['code' => $s['code']],
                [
                    'room_id' => $s['room_id'],
                    'name' => $s['name'],
                    'school_year_id' => $s['year'],
                    'status' => 'active',
                    'created_at' => '2026-08-20 00:00:00',
                    'updated_at' => now(),
                ]
            );
        }
    }
}
