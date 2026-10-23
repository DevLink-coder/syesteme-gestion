<?php

namespace App\Support;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

final class PlatformAuditLogger
{
    public static function record(
        string $action,
        ?User $actor = null,
        ?int $centerId = null,
        ?Request $request = null,
        ?int $statusCode = null,
        array $metadata = [],
    ): void {
        DB::table('platform_audit_logs')->insert([
            'actor_id' => $actor?->id,
            'center_id' => $centerId,
            'actor_name' => $actor?->name,
            'action' => $action,
            'method' => $request?->method(),
            'path' => $request?->path(),
            'status_code' => $statusCode,
            'ip_address' => $request?->ip(),
            'user_agent' => substr((string) $request?->userAgent(), 0, 4000) ?: null,
            'metadata' => $metadata ? json_encode($metadata, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR) : null,
            'created_at' => now(),
        ]);
    }
}
