<?php

namespace Database\Seeders;

use App\Support\TenantDB;
use Illuminate\Database\Seeder;

class SchoolYearSeeder extends Seeder
{
    public function run(): void
    {
        $years = [
            ['code' => '2024-2025', 'label' => '2024—2025', 'start_date' => '2024-09-01', 'end_date' => '2025-06-30', 'is_active' => false, 'is_archived' => true],
            ['code' => '2025-2026', 'label' => '2025—2026', 'start_date' => '2025-09-01', 'end_date' => '2026-06-30', 'is_active' => false, 'is_archived' => false],
            ['code' => '2026-2027', 'label' => '2026—2027', 'start_date' => '2026-09-01', 'end_date' => '2027-06-30', 'is_active' => true, 'is_archived' => false],
            // Année future pour tests V2
            ['code' => '2027-2028', 'label' => '2027—2028', 'start_date' => '2027-09-01', 'end_date' => '2028-06-30', 'is_active' => false, 'is_archived' => false],
        ];

        foreach ($years as $y) {
            TenantDB::table('school_years')->updateOrInsert(
                ['code' => $y['code']],
                array_merge($y, ['created_at' => now(), 'updated_at' => now()])
            );
        }
    }
}
