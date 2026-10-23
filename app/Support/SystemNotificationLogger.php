<?php

namespace App\Support;

use Illuminate\Support\Str;

class SystemNotificationLogger
{
    public static function record(array $payload): void
    {
        $user = auth()->user();
        $authorName = $payload['author_name'] ?? ($user ? $user->name : 'Système');

        $schoolYearId = $payload['school_year_id'] ?? null;
        $schoolYearCode = $payload['school_year_code'] ?? null;

        if (empty($schoolYearCode) && $schoolYearId) {
            $schoolYearCode = TenantDB::table('school_years')->where('id', $schoolYearId)->value('code');
        }

        if (empty($schoolYearCode) && empty($schoolYearId)) {
            $schoolYear = TenantDB::table('school_years')
                ->where('is_active', true)
                ->whereNull('deleted_at')
                ->orderByDesc('start_date')
                ->first();

            if ($schoolYear) {
                $schoolYearId = $schoolYear->id;
                $schoolYearCode = $schoolYear->code;
            }
        }

        if (empty($schoolYearCode)) {
            $schoolYearCode = 'non-cloisonne';
        }

        $auditPayload = [
            'code' => $payload['code'] ?? 'audit-'.Str::random(8),
            'author_id' => $payload['author_id'] ?? $user?->id,
            'author_name' => $authorName,
            'happened_at' => $payload['happened_at'] ?? now(),
            'type' => $payload['type'] ?? 'modification_note',
            'entity' => $payload['entity'] ?? 'Système',
            'school_year_code' => $schoolYearCode,
            'school_year_id' => $schoolYearId,
            'old_value' => $payload['old_value'] ?? null,
            'new_value' => $payload['new_value'] ?? null,
            'details' => $payload['details'] ?? null,
            'auditable_type' => $payload['auditable_type'] ?? null,
            'auditable_id' => $payload['auditable_id'] ?? null,
            'created_at' => now(),
            'updated_at' => now(),
        ];

        TenantDB::table('audit_logs')->insert($auditPayload);

        $notification = [
            'code' => 'notif-'.Str::random(10),
            'student_id' => $payload['student_id'] ?? null,
            'recipient_name' => $payload['recipient_name'] ?? $authorName,
            'recipient_whatsapp' => $payload['recipient_whatsapp'] ?? null,
            'recipient_phone' => $payload['recipient_phone'] ?? null,
            'channel' => $payload['channel'] ?? 'sms',
            'provider' => $payload['provider'] ?? 'manual',
            'type' => $payload['notification_type'] ?? 'autre',
            'content' => $payload['notification_content'] ?? ($payload['details'] ?? $payload['entity'] ?? 'Action système réalisée.'),
            'status' => $payload['notification_status'] ?? 'envoyé',
            'attempts' => $payload['attempts'] ?? 1,
            'provider_response' => $payload['provider_response'] ?? null,
            'sent_at' => now(),
            'delivered_at' => $payload['delivered_at'] ?? null,
            'school_year_id' => $payload['school_year_id'] ?? null,
            'created_at' => now(),
            'updated_at' => now(),
        ];

        TenantDB::table('notification_logs')->insert($notification);
    }
}
