<?php

namespace Database\Seeders;

use App\Support\TenantDB;
use Illuminate\Database\Seeder;

class EvaluationSeeder extends Seeder
{
    public function run(): void
    {
        $yearId = TenantDB::table('school_years')->where('code', '2026-2027')->value('id');
        $adminId = TenantDB::table('users')->where('code', 'admin-001')->value('id');

        $evals = [
            ['code' => 'ev-troisieme', 'salle' => 'salle-troisieme-2026', 'room' => 'troisieme', 'subject' => 'Toutes les matières', 'date' => '2026-11-10'],
            ['code' => 'ev-secondeC', 'salle' => 'salle-secondeC-2026', 'room' => 'secondeC', 'subject' => 'Toutes les matières', 'date' => '2026-11-12'],
            ['code' => 'ev-premiereC', 'salle' => 'salle-premiereC-2026', 'room' => 'premiereC', 'subject' => 'Toutes les matières', 'date' => '2026-11-13'],
            ['code' => 'ev-premiereD', 'salle' => 'salle-premiereD-2026', 'room' => 'premiereD', 'subject' => 'Toutes les matières', 'date' => '2026-11-14'],
            ['code' => 'ev-terminaleC', 'salle' => 'salle-terminaleC-2026', 'room' => 'terminaleC', 'subject' => 'Toutes les matières', 'date' => '2026-11-15'],
            ['code' => 'ev-terminaleD', 'salle' => 'salle-terminaleD-2026', 'room' => 'terminaleD', 'subject' => 'Toutes les matières', 'date' => '2026-11-16'],
        ];

        foreach ($evals as $e) {
            $salleId = TenantDB::table('salles')->where('code', $e['salle'])->value('id');
            TenantDB::table('evaluations')->updateOrInsert(
                ['code' => $e['code']],
                [
                    'salle_id' => $salleId,
                    'room_id' => $e['room'],
                    'subject' => $e['subject'],
                    'date' => $e['date'],
                    'status' => 'notée',
                    'school_year_id' => $yearId,
                    'created_by' => $adminId,
                    'created_at' => $e['date'].' 08:00:00',
                    'updated_at' => now(),
                ]
            );
        }
    }
}
