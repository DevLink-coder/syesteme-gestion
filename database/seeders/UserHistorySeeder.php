<?php

namespace Database\Seeders;

use App\Support\TenantDB;
use Illuminate\Database\Seeder;

class UserHistorySeeder extends Seeder
{
    public function run(): void
    {
        $t03 = TenantDB::table('users')->where('code', 't-03')->value('id');
        $admin = TenantDB::table('users')->where('code', 'admin-001')->value('id');

        if ($t03 && $admin) {
            TenantDB::table('user_histories')->updateOrInsert(
                ['user_id' => $t03, 'changed_at' => '2026-09-18 10:32:00'],
                [
                    'role' => 'teacher',
                    'status' => 'suspended',
                    'changed_by' => $admin,
                    'changed_by_name' => "Direction de l'Établissement",
                    'reason' => '6 créneaux impactés',
                    'created_at' => now(),
                    'updated_at' => now(),
                ]
            );
        }

        // teacher_subject - enseignant matières
        $map = [
            't-01' => [['Mathématiques', 'troisieme'], ['Mathématiques', 'secondeC']],
            't-05' => [['Français', 'troisieme'], ['Anglais', 'troisieme']],
        ];
        foreach ($map as $code => $subjects) {
            $userId = TenantDB::table('users')->where('code', $code)->value('id');
            foreach ($subjects as [$name, $room]) {
                $subjectId = TenantDB::table('subjects')->where('name', $name)->value('id');
                if (! $userId || ! $subjectId) {
                    continue;
                }
                TenantDB::table('teacher_subject')->updateOrInsert(
                    ['user_id' => $userId, 'subject_id' => $subjectId, 'room_id' => $room],
                    ['coefficient' => 4, 'created_at' => now(), 'updated_at' => now()]
                );
            }
        }
    }
}
