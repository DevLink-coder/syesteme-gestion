<?php

namespace App\Http\Controllers;

use App\Support\TenantContext;
use App\Support\TenantDB;
use Illuminate\Http\Request;

class ApplicationNotificationController extends Controller
{
    public function index(Request $request)
    {
        if (TenantContext::id() === null) {
            abort_unless($request->user()->isSuperAdmin(), 403);

            return response()->json([
                'notifications' => [],
                'unreadCount' => 0,
            ])->header('Cache-Control', 'no-store, private');
        }

        $userId = $request->user()->id;
        $unreadCount = TenantDB::table('application_notifications')
            ->where('recipient_id', $userId)
            ->whereNull('read_at')
            ->count();

        $notifications = TenantDB::table('application_notifications')
            ->where('recipient_id', $userId)
            ->where(function ($query) {
                $query->whereNull('read_at')->orWhere('read_at', '>', now()->subHour());
            })
            ->orderByDesc('created_at')
            ->limit(30)
            ->get(['id', 'type', 'title', 'message', 'target_url', 'read_at', 'created_at']);

        return response()->json([
            'notifications' => $notifications,
            'unreadCount' => $unreadCount,
        ])->header('Cache-Control', 'no-store, private');
    }

    public function markViewed(Request $request)
    {
        $validated = $request->validate([
            'ids' => ['required', 'array', 'min:1', 'max:30'],
            'ids.*' => ['required', 'integer'],
        ]);

        if (TenantContext::id() === null) {
            abort_unless($request->user()->isSuperAdmin(), 403);

            return response()->json(['updated' => 0]);
        }

        $updated = TenantDB::table('application_notifications')
            ->where('recipient_id', $request->user()->id)
            ->whereIn('id', $validated['ids'])
            ->whereNull('read_at')
            ->update(['read_at' => now(), 'updated_at' => now()]);

        return response()->json(['updated' => $updated]);
    }
}
