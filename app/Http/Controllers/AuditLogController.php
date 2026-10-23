<?php

namespace App\Http\Controllers;

use App\Support\TenantDB;
use Illuminate\Http\Request;

class AuditLogController extends Controller
{
    public function index(Request $request)
    {
        $validated = $request->validate([
            'type' => ['nullable', 'in:modification_note,modification_paiement,changement_statut'],
            'author_id' => ['nullable', 'integer'],
            'search' => ['nullable', 'string', 'max:120'],
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $query = TenantDB::table('audit_logs')
            ->leftJoin('school_years', 'school_years.id', '=', 'audit_logs.school_year_id')
            ->select(
                'audit_logs.id',
                'audit_logs.author_id',
                'audit_logs.author_name',
                'audit_logs.happened_at',
                'audit_logs.type',
                'audit_logs.entity',
                'audit_logs.school_year_code',
                'school_years.label as school_year_label',
                'audit_logs.old_value',
                'audit_logs.new_value',
                'audit_logs.details',
            );

        if (! empty($validated['type'])) {
            $query->where('audit_logs.type', $validated['type']);
        }
        if (! empty($validated['author_id'])) {
            $query->where('audit_logs.author_id', $validated['author_id']);
        }
        if (! empty($validated['search'])) {
            $search = trim($validated['search']);
            $query->where(function ($where) use ($search) {
                $where->where('audit_logs.entity', 'like', "%{$search}%")
                    ->orWhere('audit_logs.author_name', 'like', "%{$search}%")
                    ->orWhere('audit_logs.details', 'like', "%{$search}%")
                    ->orWhere('audit_logs.old_value', 'like', "%{$search}%")
                    ->orWhere('audit_logs.new_value', 'like', "%{$search}%");
            });
        }

        $logs = $query
            ->orderByDesc('audit_logs.happened_at')
            ->orderByDesc('audit_logs.id')
            ->paginate($validated['per_page'] ?? 50);

        $authors = TenantDB::table('audit_logs')
            ->whereNotNull('author_id')
            ->select('author_id', 'author_name')
            ->distinct()
            ->orderBy('author_name')
            ->get()
            ->map(fn ($author) => [
                'id' => (string) $author->author_id,
                'name' => $author->author_name,
            ])->values();

        return response()->json([
            'data' => $logs->getCollection()->map(fn ($log) => [
                'id' => (string) $log->id,
                'auteurId' => $log->author_id ? (string) $log->author_id : null,
                'auteurNom' => $log->author_name,
                'date' => $log->happened_at,
                'type' => $log->type,
                'entite' => $log->entity,
                'anneeScolaire' => $log->school_year_label ?: $log->school_year_code,
                'valeurAvant' => $log->old_value,
                'valeurApres' => $log->new_value,
                'details' => $log->details,
            ])->values(),
            'authors' => $authors,
            'meta' => [
                'currentPage' => $logs->currentPage(),
                'perPage' => $logs->perPage(),
                'total' => $logs->total(),
                'lastPage' => $logs->lastPage(),
            ],
        ]);
    }
}
