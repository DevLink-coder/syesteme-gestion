<?php

namespace App\Http\Controllers;

use App\Models\SchoolYear;
use App\Support\SystemNotificationLogger;
use App\Support\TenantContext;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class SchoolYearController extends Controller
{
    public function index(Request $request)
    {
        $search = trim((string) $request->query('search', ''));
        $perPage = max(1, min(100, (int) ($request->query('per_page', 10) ?: 10)));

        $query = SchoolYear::query();

        if ($search !== '') {
            $query->where(function ($q) use ($search) {
                $q->where('code', 'like', "%{$search}%")
                    ->orWhere('label', 'like', "%{$search}%")
                    ->orWhere('start_date', 'like', "%{$search}%")
                    ->orWhere('end_date', 'like', "%{$search}%");
            });
        }

        $years = $query->orderBy('start_date', 'desc')->paginate($perPage);

        return response()->json([
            'data' => $years->items(),
            'meta' => [
                'current_page' => $years->currentPage(),
                'per_page' => $years->perPage(),
                'total' => $years->total(),
                'last_page' => $years->lastPage(),
            ],
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'code' => ['required', 'string', 'max:50', Rule::unique('school_years', 'code')->where('center_id', TenantContext::requireId())],
            'label' => ['required', 'string', 'max:100'],
            'start_date' => ['required', 'date'],
            'end_date' => ['required', 'date', 'after_or_equal:start_date'],
            'is_active' => ['sometimes', 'boolean'],
            'is_archived' => ['sometimes', 'boolean'],
        ]);

        $year = SchoolYear::create([
            'code' => trim($validated['code']),
            'label' => trim($validated['label']),
            'start_date' => $validated['start_date'],
            'end_date' => $validated['end_date'],
            'is_active' => (bool) ($validated['is_active'] ?? false),
            'is_archived' => (bool) ($validated['is_archived'] ?? false),
        ]);

        if ($year->is_active) {
            SchoolYear::whereKeyNot($year->id)->update(['is_active' => false]);
        }

        SystemNotificationLogger::record([
            'entity' => 'Année scolaire '.$year->label,
            'type' => 'modification_note',
            'school_year_id' => $year->id,
            'school_year_code' => $year->code,
            'old_value' => null,
            'new_value' => $year->label,
            'details' => 'Création de l\'année scolaire',
            'notification_type' => 'autre',
            'notification_content' => 'Création de l\'année scolaire '.$year->label,
        ]);

        return response()->json($year, 201);
    }

    public function update(Request $request, $id)
    {
        $year = SchoolYear::findOrFail($id);

        $validated = $request->validate([
            'code' => ['sometimes', 'string', 'max:50', Rule::unique('school_years', 'code')->where('center_id', TenantContext::requireId())->ignore($year->id)],
            'label' => ['sometimes', 'string', 'max:100'],
            'start_date' => ['sometimes', 'date'],
            'end_date' => ['sometimes', 'date', 'after_or_equal:start_date'],
            'is_active' => ['sometimes', 'boolean'],
            'is_archived' => ['sometimes', 'boolean'],
        ]);

        $year->fill($validated);

        if (($request->has('is_active') && $request->boolean('is_active')) || ($request->has('is_archived') && $request->boolean('is_archived'))) {
            if ($request->boolean('is_active')) {
                SchoolYear::whereKeyNot($year->id)->update(['is_active' => false]);
            }
            if ($request->boolean('is_archived')) {
                $year->is_active = false;
            }
        }

        $year->save();

        SystemNotificationLogger::record([
            'entity' => 'Année scolaire '.$year->label,
            'type' => 'modification_note',
            'school_year_id' => $year->id,
            'school_year_code' => $year->code,
            'old_value' => $year->getOriginal('label'),
            'new_value' => $year->label,
            'details' => 'Mise à jour de l\'année scolaire',
            'notification_type' => 'autre',
            'notification_content' => 'Mise à jour de l\'année scolaire '.$year->label,
        ]);

        return response()->json($year);
    }

    public function destroy($id)
    {
        $year = SchoolYear::findOrFail($id);
        if ($year->is_active) {
            $year->is_active = false;
            $year->save();
        }
        $year->delete();

        SystemNotificationLogger::record([
            'entity' => 'Année scolaire '.$year->label,
            'type' => 'modification_note',
            'school_year_id' => $year->id,
            'school_year_code' => $year->code,
            'old_value' => $year->label,
            'new_value' => 'Supprimé',
            'details' => 'Suppression de l\'année scolaire',
            'notification_type' => 'autre',
            'notification_content' => 'Suppression de l\'année scolaire '.$year->label,
        ]);

        return response()->json(['message' => 'Année scolaire supprimée.']);
    }

    public function restore($id)
    {
        $year = SchoolYear::withTrashed()->findOrFail($id);
        if (! $year->trashed()) {
            return response()->json(['message' => 'L’année scolaire est déjà active.'], 409);
        }

        $year->restore();
        if ($year->is_active) {
            SchoolYear::whereKeyNot($year->id)->update(['is_active' => false]);
        }

        return response()->json(['message' => 'Année scolaire restaurée.', 'schoolYear' => $year]);
    }
}
