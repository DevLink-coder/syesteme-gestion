<?php

namespace Database\Seeders;

use App\Support\TenantDB;
use Illuminate\Database\Seeder;

class PaymentSeeder extends Seeder
{
    public function run(): void
    {
        // Paiements inspirés de payments.ts - simplifiés avec inscription_id
        $payments = [
            // s01 - Awa Diallo - Troisieme - inscription + 2 mensualités
            ['code' => 'p-001-s01', 'student' => 's01', 'ins' => 'ins-s01-2026', 'type' => 'inscription', 'amount' => 20000, 'expected' => 20000, 'solde' => 0, 'status' => 'payé', 'date' => '2026-09-01'],
            ['code' => 'p-002-s01', 'student' => 's01', 'ins' => 'ins-s01-2026', 'type' => 'mensualité', 'amount' => 12000, 'expected' => 12000, 'solde' => 0, 'status' => 'payé', 'date' => '2026-09-15'],
            ['code' => 'p-003-s01', 'student' => 's01', 'ins' => 'ins-s01-2026', 'type' => 'mensualité', 'amount' => 12000, 'expected' => 12000, 'solde' => 0, 'status' => 'payé', 'date' => '2026-10-15'],
            // s04 - Hugo Mbarga - en pause - partiel
            ['code' => 'p-001-s04', 'student' => 's04', 'ins' => 'ins-s04-2026', 'type' => 'inscription', 'amount' => 18000, 'expected' => 18000, 'solde' => 0, 'status' => 'payé', 'date' => '2026-09-05'],
            ['code' => 'p-002-s04', 'student' => 's04', 'ins' => 'ins-s04-2026', 'type' => 'mensualité', 'amount' => 6000, 'expected' => 12000, 'solde' => 6000, 'status' => 'partiel', 'date' => '2026-09-15'],
            // s07 - Emma Nkomo - prorata mi-septembre
            ['code' => 'p-001-s07', 'student' => 's07', 'ins' => 'ins-s07-2026', 'type' => 'inscription', 'amount' => 22000, 'expected' => 22000, 'solde' => 0, 'status' => 'payé', 'date' => '2026-09-10'],
            ['code' => 'p-002-s07', 'student' => 's07', 'ins' => 'ins-s07-2026', 'type' => 'mensualité', 'amount' => 9000, 'expected' => 18000, 'solde' => 9000, 'status' => 'partiel', 'date' => '2026-09-15'],
            // s10 - Louis Onana - en attente
            ['code' => 'p-001-s10', 'student' => 's10', 'ins' => 'ins-s10-2026', 'type' => 'inscription', 'amount' => 0, 'expected' => 25000, 'solde' => 25000, 'status' => 'impayé', 'date' => '2026-09-15'],
            // Autres élèves - paiements complets
            ['code' => 'p-001-s03', 'student' => 's03', 'ins' => 'ins-s03-2026', 'type' => 'inscription', 'amount' => 18000, 'expected' => 18000, 'solde' => 0, 'status' => 'payé', 'date' => '2026-09-01'],
            ['code' => 'p-002-s03', 'student' => 's03', 'ins' => 'ins-s03-2026', 'type' => 'mensualité', 'amount' => 12000, 'expected' => 12000, 'solde' => 0, 'status' => 'payé', 'date' => '2026-09-15'],
            ['code' => 'p-001-s05', 'student' => 's05', 'ins' => 'ins-s05-2026', 'type' => 'inscription', 'amount' => 25000, 'expected' => 25000, 'solde' => 0, 'status' => 'payé', 'date' => '2026-09-01'],
            ['code' => 'p-002-s05', 'student' => 's05', 'ins' => 'ins-s05-2026', 'type' => 'mensualité', 'amount' => 18000, 'expected' => 18000, 'solde' => 0, 'status' => 'payé', 'date' => '2026-09-15'],
            ['code' => 'p-001-s09', 'student' => 's09', 'ins' => 'ins-s09-2026', 'type' => 'inscription', 'amount' => 25000, 'expected' => 25000, 'solde' => 0, 'status' => 'payé', 'date' => '2026-09-01'],
            ['code' => 'p-002-s09', 'student' => 's09', 'ins' => 'ins-s09-2026', 'type' => 'mensualité', 'amount' => 20000, 'expected' => 20000, 'solde' => 0, 'status' => 'payé', 'date' => '2026-09-15'],
        ];

        $adminId = TenantDB::table('users')->where('code', 'admin-001')->value('id');

        foreach ($payments as $p) {
            $studentId = TenantDB::table('students')->where('code', $p['student'])->value('id');
            $insId = TenantDB::table('inscriptions')->where('code', $p['ins'])->value('id');
            if (! $studentId || ! $insId) {
                continue;
            }
            TenantDB::table('payments')->updateOrInsert(
                ['code' => $p['code']],
                [
                    'student_id' => $studentId,
                    'inscription_id' => $insId,
                    'type' => $p['type'],
                    'amount' => $p['amount'],
                    'expected_amount' => $p['expected'],
                    'solde_du' => $p['solde'],
                    'status' => $p['status'],
                    'due_date' => $p['date'],
                    'paid_at' => $p['status'] !== 'impayé' ? $p['date'] : null,
                    'created_by' => $adminId,
                    'created_at' => $p['date'].' 10:00:00',
                    'updated_at' => now(),
                ]
            );
        }

        // Génère des mensualités supplémentaires pour chiffre d'affaires
        $extraStudents = ['s02', 's06', 's08', 's11', 's12'];
        foreach ($extraStudents as $code) {
            $studentId = TenantDB::table('students')->where('code', $code)->value('id');
            $ins = TenantDB::table('inscriptions')->where('code', "ins-$code-2026")->first();
            if (! $studentId || ! $ins) {
                continue;
            }
            $tarif = TenantDB::table('tarifs')->where('id', $ins->tarif_id)->first();
            $mens = $tarif ? $tarif->mensualite : 12000;
            foreach (['2026-09-01', '2026-10-01'] as $d) {
                $pcode = "p-extra-$code-".str_replace('-', '', $d);
                TenantDB::table('payments')->updateOrInsert(
                    ['code' => $pcode],
                    [
                        'student_id' => $studentId,
                        'inscription_id' => $ins->id,
                        'type' => 'mensualité',
                        'amount' => $mens,
                        'expected_amount' => $mens,
                        'solde_du' => 0,
                        'status' => 'payé',
                        'due_date' => $d,
                        'paid_at' => $d,
                        'created_by' => $adminId,
                        'created_at' => $d.' 10:00:00',
                        'updated_at' => now(),
                    ]
                );
            }
        }
    }
}
