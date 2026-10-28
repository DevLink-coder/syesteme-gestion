<?php

namespace App\Http\Controllers;

use App\Models\Salle;
use App\Models\Subject;
use App\Support\SystemNotificationLogger;
use App\Support\TenantContext;
use App\Support\TenantDB;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class SubjectController extends Controller
{
    public function index(Request $request)
    {
        $includeArchived = filter_var($request->query('include_archived', false), FILTER_VALIDATE_BOOLEAN);
        $query = $includeArchived ? Subject::withTrashed() : Subject::query();
        $search = trim((string) $request->query('search', ''));
        $salleId = $request->query('salle_id');
        $perPage = max(1, min(100, (int) ($request->query('per_page', 10) ?: 10)));

        if (! $includeArchived) {
            $query->whereNull('deleted_at');
        }

        if ($search !== '') {
            $query->where('name', 'like', "%{$search}%");
        }

        if ($salleId) {
            $query->whereHas('salles', function ($q) use ($salleId) {
                $q->where('salles.id', $salleId);
            });
        }

        $subjects = $query->with(['salles' => function ($q) {
            $q->select('salles.id', 'salles.name', 'salles.room_id', 'salle_subject.coefficient', 'salle_subject.is_optional')
                ->withPivot(['coefficient', 'is_optional']);
        }])
            ->orderBy('name')
            ->paginate($perPage);

        $items = collect($subjects->items())->map(function ($subject) {
            $firstSalle = $subject->salles->first();
            $coefficient = $firstSalle?->pivot?->coefficient ?? $firstSalle?->coefficient ?? null;
            $subject->coefficient = $coefficient;

            return $subject;
        })->all();

        return response()->json([
            'data' => $items,
            'meta' => [
                'current_page' => $subjects->currentPage(),
                'per_page' => $subjects->perPage(),
                'total' => $subjects->total(),
                'last_page' => $subjects->lastPage(),
            ],
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'min:2', 'max:100'],
            'coefficient' => ['nullable', 'numeric', 'min:0.5'],
            'room_ids' => ['nullable', 'array'],
            'room_ids.*' => ['integer', Rule::exists('salles', 'id')->where('center_id', TenantContext::requireId())->whereNull('deleted_at')],
            'is_optional' => ['sometimes', 'boolean'],
            'description' => ['nullable', 'string', 'max:255'],
        ]);

        $normalizedName = trim($validated['name']);
        $normalizedName = mb_convert_case(mb_strtolower($normalizedName), MB_CASE_TITLE, 'UTF-8');

        $subject = Subject::withTrashed()->where('name', $normalizedName)->first();
        if ($subject?->trashed()) {
            $subject->restore();
        }
        if (! $subject) {
            $subject = Subject::create([
                'name' => $normalizedName,
                'slug' => Str::slug($normalizedName),
                'description' => $validated['description'] ?? null,
            ]);
        }

        $roomIds = array_values(array_unique(array_filter(($validated['room_ids'] ?? []), 'strlen')));
        $schoolYear = null;

        if (! empty($roomIds)) {
            foreach ($roomIds as $roomId) {
                $exists = $subject->salles()->where('salles.id', $roomId)->exists();
                if ($exists) {
                    continue;
                }
                $subject->salles()->attach($roomId, [
                    'center_id' => TenantContext::requireId(),
                    'coefficient' => (float) ($validated['coefficient'] ?? 1),
                    'is_optional' => (bool) ($validated['is_optional'] ?? false),
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }

            $schoolYear = TenantDB::table('salles')
                ->join('school_years', 'school_years.id', '=', 'salles.school_year_id')
                ->whereNull('salles.deleted_at')
                ->whereNull('school_years.deleted_at')
                ->whereIn('salles.id', $roomIds)
                ->select('school_years.id', 'school_years.code')
                ->first();
        }

        if (! $schoolYear) {
            $schoolYear = TenantDB::table('school_years')->whereNull('deleted_at')->where('is_active', true)->first();
        }

        SystemNotificationLogger::record([
            'entity' => 'Matière '.$subject->name,
            'type' => 'modification_note',
            'school_year_id' => $schoolYear?->id,
            'school_year_code' => $schoolYear?->code,
            'old_value' => null,
            'new_value' => $subject->name,
            'details' => 'Création de matière',
            'notification_type' => 'autre',
            'notification_content' => 'Création de la matière '.$subject->name,
        ]);

        return response()->json($subject->load('salles'), 201);
    }

    public function update(Request $request, Subject $subject)
    {
        $validated = $request->validate([
            'name' => ['sometimes', 'string', 'min:2', 'max:100'],
            'coefficient' => ['sometimes', 'numeric', 'min:0.5'],
            'room_ids' => ['sometimes', 'array'],
            'room_ids.*' => ['integer', Rule::exists('salles', 'id')->where('center_id', TenantContext::requireId())->whereNull('deleted_at')],
            'is_optional' => ['sometimes', 'boolean'],
            'description' => ['nullable', 'string', 'max:255'],
        ]);

        $schoolYear = TenantDB::table('salles')
            ->join('school_years', 'school_years.id', '=', 'salles.school_year_id')
            ->whereNull('salles.deleted_at')
            ->whereNull('school_years.deleted_at')
            ->whereIn('salles.id', $subject->salles()->pluck('salles.id')->toArray())
            ->select('school_years.id', 'school_years.code')
            ->first();

        if (! $schoolYear && ! empty($validated['room_ids'] ?? [])) {
            $schoolYear = TenantDB::table('salles')
                ->join('school_years', 'school_years.id', '=', 'salles.school_year_id')
                ->whereNull('salles.deleted_at')
                ->whereNull('school_years.deleted_at')
                ->whereIn('salles.id', $validated['room_ids'])
                ->select('school_years.id', 'school_years.code')
                ->first();
        }

        if (! $schoolYear) {
            $schoolYear = TenantDB::table('school_years')->whereNull('deleted_at')->where('is_active', true)->first();
        }

        if (isset($validated['name'])) {
            $subject->name = trim($validated['name']);
            $subject->name = mb_convert_case(mb_strtolower($subject->name), MB_CASE_TITLE, 'UTF-8');
            $subject->slug = Str::slug($subject->name);
        }
        if (isset($validated['description'])) {
            $subject->description = $validated['description'];
        }
        $subject->save();

        if (isset($validated['room_ids'])) {
            $subject->salles()->sync([]);
            $roomIds = array_values(array_unique($validated['room_ids']));
            foreach ($roomIds as $roomId) {
                $subject->salles()->attach($roomId, [
                    'center_id' => TenantContext::requireId(),
                    'coefficient' => (float) ($validated['coefficient'] ?? 1),
                    'is_optional' => (bool) ($validated['is_optional'] ?? false),
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        }

        if (isset($validated['coefficient'])) {
            if (! empty($validated['room_ids'] ?? [])) {
                foreach ($validated['room_ids'] as $roomId) {
                    $subject->salles()->updateExistingPivot($roomId, ['coefficient' => (float) $validated['coefficient'], 'updated_at' => now()]);
                }
            }
        }

        SystemNotificationLogger::record([
            'entity' => 'Matière '.$subject->name,
            'type' => 'modification_note',
            'school_year_id' => $schoolYear?->id,
            'school_year_code' => $schoolYear?->code,
            'old_value' => $subject->getOriginal('name'),
            'new_value' => $subject->name,
            'details' => 'Mise à jour de matière',
            'notification_type' => 'autre',
            'notification_content' => 'Mise à jour de la matière '.$subject->name,
        ]);

        return response()->json($subject->load('salles'));
    }

    public function destroy(Subject $subject)
    {
        if ($subject->trashed()) {
            return response()->json(['message' => 'Cette matière est déjà archivée.'], 409);
        }

        $name = $subject->name;
        $schoolYear = TenantDB::table('salles')
            ->join('school_years', 'school_years.id', '=', 'salles.school_year_id')
            ->whereIn('salles.id', $subject->salles()->pluck('salles.id')->toArray())
            ->select('school_years.id', 'school_years.code')
            ->first();

        if (! $schoolYear) {
            $schoolYear = TenantDB::table('school_years')->whereNull('deleted_at')->where('is_active', true)->first();
        }

        $subject->delete();

        SystemNotificationLogger::record([
            'entity' => 'Matière '.$name,
            'type' => 'modification_note',
            'school_year_id' => $schoolYear?->id,
            'school_year_code' => $schoolYear?->code,
            'old_value' => $name,
            'new_value' => 'Supprimé',
            'details' => 'Archivage de matière',
            'notification_type' => 'autre',
            'notification_content' => 'Archivage de la matière '.$name,
        ]);

        return response()->json(['message' => 'Matière archivée.']);
    }

    public function restore($id)
    {
        $subject = Subject::withTrashed()->findOrFail($id);
        if (! $subject->trashed()) {
            return response()->json(['message' => 'La matière est déjà active.'], 409);
        }

        $subject->restore();

        return response()->json(['message' => 'Matière restaurée.', 'subject' => $subject->load('salles')]);
    }

    public function attachToRooms(Request $request, Subject $subject)
    {
        if ($subject->trashed()) {
            return response()->json(['message' => 'Cette matière est archivée. Désarchivez-la avant de l\'affecter à une salle.'], 409);
        }

        $validated = $request->validate([
            'room_ids' => ['required', 'array'],
            'room_ids.*' => ['integer', Rule::exists('salles', 'id')->where('center_id', TenantContext::requireId())->whereNull('deleted_at')],
            'coefficient' => ['nullable', 'numeric', 'min:0.5'],
            'is_optional' => ['sometimes', 'boolean'],
        ]);

        $defaultCoefficient = (float) ($validated['coefficient'] ?? 1);
        $roomIds = array_values(array_unique($validated['room_ids']));

        foreach ($roomIds as $roomId) {
            $salle = Salle::find($roomId);
            if (! $salle) {
                continue;
            }

            if (! $subject->salles()->where('salles.id', $roomId)->exists()) {
                $subject->salles()->attach($roomId, [
                    'center_id' => TenantContext::requireId(),
                    'coefficient' => $defaultCoefficient,
                    'is_optional' => (bool) ($validated['is_optional'] ?? false),
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        }

        return response()->json($subject->load('salles'));
    }
}
