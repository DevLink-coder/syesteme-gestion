<?php

namespace Database\Seeders;

use App\Support\TenantDB;
use Illuminate\Database\Seeder;

class AttendanceSeeder extends Seeder
{
    public function run(): void
    {
        $data = [
            ['code' => 'att-1', 'room' => 'troisieme', 'salle' => 'salle-troisieme-2026', 'date' => '2026-10-01', 'student' => 's01', 'present' => true, 'wa' => null, 'heure' => '08:15', 'slot' => 'sl-01'],
            ['code' => 'att-2', 'room' => 'troisieme', 'salle' => 'salle-troisieme-2026', 'date' => '2026-10-01', 'student' => 's02', 'present' => false, 'wa' => 'Envoyé', 'heure' => '08:15', 'slot' => 'sl-01'],
            ['code' => 'att-5', 'room' => 'premiereC', 'salle' => 'salle-premiereC-2026', 'date' => '2026-10-03', 'student' => 's05', 'present' => true, 'wa' => null, 'heure' => '08:20', 'slot' => 'sl-18'],
            ['code' => 'att-6', 'room' => 'premiereC', 'salle' => 'salle-premiereC-2026', 'date' => '2026-10-03', 'student' => 's06', 'present' => false, 'wa' => 'Échec', 'heure' => '08:20', 'slot' => 'sl-18'],
            ['code' => 'att-9', 'room' => 'terminaleC', 'salle' => 'salle-terminaleC-2026', 'date' => '2026-10-05', 'student' => 's09', 'present' => true, 'wa' => null, 'heure' => '08:30', 'slot' => 'sl-36'],
            ['code' => 'att-10', 'room' => 'terminaleC', 'salle' => 'salle-terminaleC-2026', 'date' => '2026-10-05', 'student' => 's10', 'present' => false, 'wa' => 'En attente', 'heure' => '08:30', 'slot' => 'sl-36'],
        ];

        $yearId = TenantDB::table('school_years')->where('code', '2026-2027')->value('id');
        $teacherId = TenantDB::table('users')->where('code', 't-01')->value('id');

        foreach ($data as $d) {
            $studentId = TenantDB::table('students')->where('code', $d['student'])->value('id');
            $salleId = TenantDB::table('salles')->where('code', $d['salle'])->value('id');
            $slotId = TenantDB::table('timetable_slots')->where('code', $d['slot'])->value('id');
            if (! $studentId || ! $salleId) {
                continue;
            }

            TenantDB::table('attendances')->updateOrInsert(
                ['code' => $d['code']],
                [
                    'student_id' => $studentId,
                    'salle_id' => $salleId,
                    'timetable_slot_id' => $slotId,
                    'room_id' => $d['room'],
                    'date' => $d['date'],
                    'heure_appel' => $d['heure'],
                    'present' => $d['present'],
                    'whatsapp_status' => $d['wa'],
                    'marked_by' => $teacherId,
                    'school_year_id' => $yearId,
                    'created_at' => $d['date'].' '.$d['heure'].':00',
                    'updated_at' => now(),
                ]
            );
        }
    }
}
