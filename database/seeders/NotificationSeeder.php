<?php

namespace Database\Seeders;

use App\Support\TenantDB;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class NotificationSeeder extends Seeder
{
    public function run(): void
    {
        $yearId = TenantDB::table('school_years')->where('code', '2026-2027')->value('id');
        $students = TenantDB::table('students')->limit(3)->get();

        foreach ($students as $s) {
            $code = 'notif-'.Str::random(6);
            TenantDB::table('notification_logs')->updateOrInsert(
                ['code' => $code],
                [
                    'student_id' => $s->id,
                    'recipient_name' => $s->parent_name,
                    'recipient_whatsapp' => $s->parent_whatsapp,
                    'channel' => 'whatsapp',
                    'provider' => 'twilio',
                    'type' => 'absence',
                    'content' => "Votre enfant {$s->name} a été absent le ".now()->format('d/m/Y'),
                    'status' => 'envoyé',
                    'attempts' => 1,
                    'sent_at' => now()->subDays(rand(1, 5)),
                    'school_year_id' => $yearId,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]
            );
        }

        // Rappel paiement début mois
        foreach ($students as $s) {
            $code = 'notif-rappel-'.$s->code;
            TenantDB::table('notification_logs')->updateOrInsert(
                ['code' => $code],
                [
                    'student_id' => $s->id,
                    'recipient_name' => $s->parent_name,
                    'recipient_whatsapp' => $s->parent_whatsapp,
                    'channel' => 'sms',
                    'provider' => 'africas_talking',
                    'type' => 'rappel_paiement',
                    'content' => "Rappel: mensualité de {$s->name} à régler début octobre.",
                    'status' => 'en_attente',
                    'attempts' => 0,
                    'school_year_id' => $yearId,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]
            );
        }
    }
}
