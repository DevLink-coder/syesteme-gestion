<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PlatformAuditController extends Controller
{
    public function index(Request $request)
    {
        $filters = $request->validate([
            'center_id' => ['nullable', 'integer'],
            'actor_id' => ['nullable', 'integer'],
            'search' => ['nullable', 'string', 'max:120'],
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        // Combine the historical center audit and the platform activity stream.
        $platformEvents = DB::table('platform_audit_logs')->selectRaw(
            "'platform' as source, id, actor_id, actor_name, center_id, action, method, path, status_code, ip_address, created_at, metadata, NULL as details, NULL as entity, NULL as before_value, NULL as after_value"
        );
        $centerEvents = DB::table('audit_logs')->selectRaw(
            "'center' as source, id, author_id as actor_id, author_name as actor_name, center_id, type as action, NULL as method, NULL as path, NULL as status_code, NULL as ip_address, happened_at as created_at, NULL as metadata, details, entity, old_value as before_value, new_value as after_value"
        );
        $events = $platformEvents->unionAll($centerEvents);

        $query = DB::query()->fromSub($events, 'events')
            ->leftJoin('centers', 'centers.id', '=', 'events.center_id')
            ->select('events.*', 'centers.name as center_name');

        if (! empty($filters['center_id'])) {
            $query->where('events.center_id', $filters['center_id']);
        }
        if (! empty($filters['actor_id'])) {
            $query->where('events.actor_id', $filters['actor_id']);
        }
        if (! empty($filters['search'])) {
            $term = trim($filters['search']);
            $query->where(fn ($where) => $where
                ->where('events.action', 'like', "%{$term}%")
                ->orWhere('events.path', 'like', "%{$term}%")
                ->orWhere('events.actor_name', 'like', "%{$term}%")
                ->orWhere('events.entity', 'like', "%{$term}%")
                ->orWhere('events.details', 'like', "%{$term}%")
                ->orWhere('centers.name', 'like', "%{$term}%"));
        }

        $logs = $query->orderByDesc('events.created_at')->orderByDesc('events.id')
            ->paginate($filters['per_page'] ?? 50);
        $centers = DB::table('centers')->orderBy('name')->get(['id', 'name']);
        $actors = DB::query()->fromSub($events, 'actors')->whereNotNull('actor_id')
            ->select('actor_id', 'actor_name')->distinct()->orderBy('actor_name')->get()
            ->map(fn ($row) => ['id' => (int) $row->actor_id, 'name' => $row->actor_name])->values();

        return response()->json([
            'data' => $logs->getCollection()->map(fn ($row) => [
                'id' => $row->source.'-'.$row->id,
                'actorId' => $row->actor_id ? (int) $row->actor_id : null,
                'actorName' => $row->actor_name ?: 'Système',
                'auteurId' => $row->actor_id ? (string) $row->actor_id : null,
                'auteurNom' => $row->actor_name,
                'action' => $row->action,
                'method' => $row->method,
                'path' => $row->path,
                'statusCode' => $row->status_code ? (int) $row->status_code : null,
                'centerId' => $row->center_id ? (int) $row->center_id : null,
                'centerName' => $row->center_name ?: 'Plateforme',
                'ipAddress' => $row->ip_address,
                'createdAt' => $row->created_at,
                'metadata' => $row->metadata ? json_decode($row->metadata, true) : array_filter([
                    'details' => $row->details,
                    'entity' => $row->entity,
                    'before' => $row->before_value,
                    'after' => $row->after_value,
                ], fn ($value) => $value !== null),
            ])->values(),
            'centers' => $centers,
            'actors' => $actors,
            'authors' => $actors,
            'meta' => ['currentPage' => $logs->currentPage(), 'lastPage' => $logs->lastPage(), 'total' => $logs->total()],
        ])->header('Cache-Control', 'no-store, private');
    }
}
