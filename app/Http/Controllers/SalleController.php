<?php

namespace App\Http\Controllers;

use App\Support\SystemNotificationLogger;
use App\Support\TenantContext;
use App\Support\TenantDB;
use App\Support\TenantRules;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class SalleController extends Controller
{
    public function index(Request $request)
    {
        $salles = TenantDB::table('salles')
            ->leftJoin('school_years', 'school_years.id', '=', 'salles.school_year_id')
            ->whereNull('salles.deleted_at')
            ->whereNull('school_years.deleted_at')
            ->select('salles.*', 'school_years.label as school_year_label')
            ->orderBy('salles.name')
            ->get()
            ->map(function ($s) {
                $s->subjects = TenantDB::table('salle_subject')->where('salle_id', $s->id)->get();
                $s->students_count = TenantDB::table('inscriptions')->whereNull('deleted_at')->where('salle_id', $s->id)->where('statut', 'Validée')->count();

                return $s;
            });

        return response()->json($salles);
    }

    public function show($id)
    {
        $salle = TenantDB::table('salles')->whereNull('deleted_at')->where(function ($query) use ($id) {
            $query->where('id', $id)->orWhere('code', $id);
        })->first();
        if (! $salle) {
            return response()->json(['message' => 'Salle introuvable'], 404);
        }
        $salle->subjects = TenantDB::table('salle_subject')->join('subjects', 'subjects.id', '=', 'salle_subject.subject_id')->whereNull('subjects.deleted_at')->where('salle_subject.salle_id', $salle->id)->select('subjects.name', 'salle_subject.coefficient', 'salle_subject.is_optional as optionale')->get();
        $salle->students = TenantDB::table('inscriptions')->join('students', 'students.id', '=', 'inscriptions.student_id')->whereNull('inscriptions.deleted_at')->whereNull('students.deleted_at')->where('inscriptions.salle_id', $salle->id)->select('students.*', 'inscriptions.statut')->get();

        return response()->json($salle);
    }

    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|min:2',
            'serie' => 'nullable|string|max:10',
            'school_year_id' => ['required', Rule::exists('school_years', 'id')->where('center_id', TenantContext::requireId())->whereNull('deleted_at')],
            'status' => 'sometimes|in:active,archivée',
        ]);

        $rawName = trim($request->name);
        $rawSerie = trim($request->serie ?? '');
        $formattedName = mb_convert_case(mb_strtolower($rawName), MB_CASE_TITLE, 'UTF-8');
        $formattedName = str_replace('Premiere', 'Première', $formattedName);
        $formattedName = str_replace('premiere', 'Première', $formattedName);
        if ($rawSerie !== '') {
            $formattedSerie = mb_strtoupper($rawSerie, 'UTF-8');
            $displayName = $formattedName.' '.$formattedSerie;
            $roomId = Str::slug(mb_strtolower($rawName), '').$formattedSerie;
            $roomId = lcfirst($formattedName).$formattedSerie;
            $roomId = str_replace(['é', 'è', 'ê', 'à', 'ù', 'ô', 'î'], ['e', 'e', 'e', 'a', 'u', 'o', 'i'], $roomId);
            $roomId = preg_replace('/[^a-zA-Z0-9]/', '', $roomId);
        } else {
            $displayName = $formattedName;
            $roomId = Str::slug(mb_strtolower($rawName), '');
            $roomId = str_replace(['é', 'è'], ['e', 'e'], $roomId);
            $roomId = preg_replace('/[^a-zA-Z0-9]/', '', $roomId);
            $roomId = lcfirst($roomId);
        }

        $year = TenantDB::table('school_years')->whereNull('deleted_at')->where('id', $request->school_year_id)->first();
        $yearCode = $year ? explode('-', $year->code)[0] : '2026';
        $code = 'salle-'.$roomId.'-'.$yearCode;

        if (TenantDB::table('salles')->where('room_id', $roomId)->where('school_year_id', $request->school_year_id)->exists()) {
            return response()->json(['message' => 'Cette salle existe déjà pour cette année scolaire.'], 409);
        }
        if (TenantDB::table('salles')->where('code', $code)->exists()) {
            return response()->json(['message' => 'Une salle avec ce code existe déjà.'], 409);
        }

        $id = TenantDB::table('salles')->insertGetId([
            'code' => $code,
            'room_id' => $roomId,
            'name' => $displayName,
            'school_year_id' => $request->school_year_id,
            'status' => $request->status ?? 'active',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $salle = TenantDB::table('salles')->where('id', $id)->first();

        SystemNotificationLogger::record([
            'entity' => 'Salle '.$salle->name,
            'type' => 'modification_note',
            'school_year_id' => $salle->school_year_id,
            'school_year_code' => TenantDB::table('school_years')->where('id', $salle->school_year_id)->value('code'),
            'old_value' => null,
            'new_value' => $salle->name,
            'details' => 'Création de salle',
            'notification_type' => 'autre',
            'notification_content' => 'Création de la salle '.$salle->name,
        ]);

        return response()->json($salle, 201);
    }

    public function update(Request $request, $id)
    {
        $salle = TenantDB::table('salles')->whereNull('deleted_at')->where(function ($query) use ($id) {
            $query->where('id', $id)->orWhere('code', $id);
        })->first();
        if (! $salle) {
            return response()->json(['message' => 'Salle introuvable'], 404);
        }

        $request->validate([
            'name' => 'sometimes|string|min:2',
            'serie' => 'nullable|string|max:10',
            'school_year_id' => ['sometimes', TenantRules::exists('school_years')],
            'status' => 'sometimes|in:active,archivée',
        ]);

        $data = [];
        if ($request->has('name') || $request->has('serie')) {
            $rawName = trim($request->input('name', $salle->name));
            $parts = explode(' ', $rawName);
            $baseName = $parts[0];
            $rawSerie = $request->has('serie') ? trim($request->serie) : (isset($parts[1]) ? $parts[1] : '');
            $formattedName = mb_convert_case(mb_strtolower($baseName), MB_CASE_TITLE, 'UTF-8');
            $formattedName = str_replace(['Premiere', 'premiere'], 'Première', $formattedName);
            if ($rawSerie !== '' && $rawSerie !== null) {
                $formattedSerie = mb_strtoupper($rawSerie, 'UTF-8');
                $data['name'] = $formattedName.' '.$formattedSerie;
                $roomId = lcfirst($formattedName).$formattedSerie;
                $roomId = str_replace(['é', 'è'], ['e', 'e'], $roomId);
                $roomId = preg_replace('/[^a-zA-Z0-9]/', '', $roomId);
                $data['room_id'] = $roomId;
                $year = TenantDB::table('school_years')->whereNull('deleted_at')->where('id', $request->input('school_year_id', $salle->school_year_id))->first();
                $yearCode = $year ? explode('-', $year->code)[0] : '2026';
                $data['code'] = 'salle-'.$roomId.'-'.$yearCode;
            } else {
                $data['name'] = $formattedName;
                $roomId = Str::slug(mb_strtolower($baseName), '');
                $roomId = str_replace(['é', 'è'], ['e', 'e'], $roomId);
                $roomId = preg_replace('/[^a-zA-Z0-9]/', '', $roomId);
                $data['room_id'] = lcfirst($roomId);
            }
        }
        if ($request->has('school_year_id')) {
            $data['school_year_id'] = $request->school_year_id;
        }
        if ($request->has('status')) {
            $data['status'] = $request->status;
        }
        $data['updated_at'] = now();
        if (! empty($data)) {
            TenantDB::table('salles')->where('id', $salle->id)->update($data);
        }

        $updatedSalle = TenantDB::table('salles')->where('id', $salle->id)->first();

        SystemNotificationLogger::record([
            'entity' => 'Salle '.($updatedSalle->name ?? $salle->name),
            'type' => 'modification_note',
            'school_year_id' => $updatedSalle->school_year_id ?? $salle->school_year_id,
            'school_year_code' => TenantDB::table('school_years')->where('id', ($updatedSalle->school_year_id ?? $salle->school_year_id))->value('code'),
            'old_value' => $salle->name,
            'new_value' => $updatedSalle->name,
            'details' => 'Mise à jour de salle',
            'notification_type' => 'autre',
            'notification_content' => 'Mise à jour de la salle '.($updatedSalle->name ?? $salle->name),
        ]);

        return response()->json($updatedSalle);
    }

    public function archive(Request $request, $id)
    {
        $salle = TenantDB::table('salles')->whereNull('deleted_at')->where(function ($query) use ($id) {
            $query->where('id', $id)->orWhere('code', $id);
        })->first();
        if (! $salle) {
            return response()->json(['message' => 'Salle introuvable'], 404);
        }
        TenantDB::table('salles')->where('id', $salle->id)->update([
            'status' => 'archivée',
            'archived_at' => now(),
            'deleted_at' => null,
            'updated_at' => now(),
        ]);

        SystemNotificationLogger::record([
            'entity' => 'Salle '.$salle->name,
            'type' => 'changement_statut',
            'school_year_id' => $salle->school_year_id,
            'school_year_code' => TenantDB::table('school_years')->where('id', $salle->school_year_id)->value('code'),
            'old_value' => 'active',
            'new_value' => 'archivée',
            'details' => 'Archivage de salle',
            'notification_type' => 'autre',
            'notification_content' => 'Salle archivée : '.$salle->name,
        ]);

        return response()->json(['message' => 'Salle archivée']);
    }

    public function unarchive(Request $request, $id)
    {
        $salle = TenantDB::table('salles')->where(function ($query) use ($id) {
            $query->where('id', $id)->orWhere('code', $id);
        })->whereNull('deleted_at')->first();
        if (! $salle) {
            $salle = TenantDB::table('salles')->whereNotNull('deleted_at')->where(function ($q) use ($id) {
                $q->where('id', $id)->orWhere('code', $id);
            })->first();
        }
        if (! $salle) {
            return response()->json(['message' => 'Salle introuvable'], 404);
        }
        TenantDB::table('salles')->where('id', $salle->id)->update([
            'status' => 'active',
            'archived_at' => null,
            'deleted_at' => null,
            'updated_at' => now(),
        ]);

        SystemNotificationLogger::record([
            'entity' => 'Salle '.$salle->name,
            'type' => 'changement_statut',
            'school_year_id' => $salle->school_year_id,
            'school_year_code' => TenantDB::table('school_years')->where('id', $salle->school_year_id)->value('code'),
            'old_value' => 'archivée',
            'new_value' => 'active',
            'details' => 'Restauration de salle',
            'notification_type' => 'autre',
            'notification_content' => 'Salle restaurée : '.$salle->name,
        ]);

        return response()->json(['message' => 'Salle restaurée']);
    }

    public function students($id)
    {
        $salle = TenantDB::table('salles')->whereNull('deleted_at')->where(function ($query) use ($id) {
            $query->where('id', $id)->orWhere('code', $id);
        })->first();
        if (! $salle) {
            return response()->json([], 404);
        }
        $students = TenantDB::table('inscriptions')
            ->join('students', 'students.id', '=', 'inscriptions.student_id')
            ->whereNull('inscriptions.deleted_at')
            ->whereNull('students.deleted_at')
            ->where('inscriptions.salle_id', $salle->id)
            ->select('students.*', 'inscriptions.statut', 'inscriptions.date_inscription')
            ->get();

        return response()->json($students);
    }

    public function matieres($id)
    {
        $salle = TenantDB::table('salles')->whereNull('deleted_at')->where(function ($query) use ($id) {
            $query->where('id', $id)->orWhere('code', $id);
        })->first();
        if (! $salle) {
            return response()->json([], 404);
        }
        $subjects = TenantDB::table('salle_subject')->join('subjects', 'subjects.id', '=', 'salle_subject.subject_id')->whereNull('subjects.deleted_at')->where('salle_id', $salle->id)->select('subjects.name', 'salle_subject.coefficient', 'salle_subject.is_optional as optionale', 'subjects.id as subject_id')->get();

        return response()->json($subjects);
    }

    public function addMatiere(Request $request, $id)
    {
        $salle = TenantDB::table('salles')->whereNull('deleted_at')->where(function ($query) use ($id) {
            $query->where('id', $id)->orWhere('code', $id);
        })->first();
        if (! $salle) {
            return response()->json(['message' => 'Salle introuvable'], 404);
        }
        $request->validate(['name' => 'required|string|min:2', 'coefficient' => 'required|numeric|min:0.5']);
        $subject = TenantDB::table('subjects')->where('name', $request->name)->first();
        if ($subject && ! is_null($subject->deleted_at)) {
            return response()->json(['message' => 'Cette matière est archivée. Désarchivez-la avant de la réaffecter.'], 409);
        }
        if (! $subject) {
            $sid = TenantDB::table('subjects')->insertGetId(['name' => $request->name, 'slug' => Str::slug($request->name), 'created_at' => now(), 'updated_at' => now()]);
            $subject = (object) ['id' => $sid, 'name' => $request->name, 'deleted_at' => null];
        }
        $exists = TenantDB::table('salle_subject')->where('salle_id', $salle->id)->where('subject_id', $subject->id)->exists();
        if ($exists) {
            return response()->json(['message' => 'Matière déjà associée'], 409);
        }
        TenantDB::table('salle_subject')->insert(['salle_id' => $salle->id, 'subject_id' => $subject->id, 'coefficient' => $request->coefficient, 'is_optional' => false, 'created_at' => now(), 'updated_at' => now()]);

        return response()->json(['message' => 'Matière ajoutée']);
    }

    public function updateCoefficient(Request $request, $id, $subjectName)
    {
        $salle = TenantDB::table('salles')->whereNull('deleted_at')->where(function ($query) use ($id) {
            $query->where('id', $id)->orWhere('code', $id);
        })->first();
        if (! $salle) {
            return response()->json(['message' => 'Salle introuvable'], 404);
        }
        $subject = TenantDB::table('subjects')->whereNull('deleted_at')->where('name', $subjectName)->first();
        if (! $subject) {
            return response()->json(['message' => 'Matière introuvable'], 404);
        }
        $request->validate(['coefficient' => 'required|numeric|min:0.5']);
        TenantDB::table('salle_subject')->where('salle_id', $salle->id)->where('subject_id', $subject->id)->update(['coefficient' => $request->coefficient, 'updated_at' => now()]);

        return response()->json(['message' => 'Coefficient mis à jour']);
    }

    public function removeMatiere($id, $subjectName)
    {
        $salle = TenantDB::table('salles')->whereNull('deleted_at')->where(function ($query) use ($id) {
            $query->where('id', $id)->orWhere('code', $id);
        })->first();
        if (! $salle) {
            return response()->json(['message' => 'Salle introuvable'], 404);
        }
        $subject = TenantDB::table('subjects')->whereNull('deleted_at')->where('name', $subjectName)->first();
        if (! $subject) {
            return response()->json(['message' => 'Matière introuvable'], 404);
        }
        TenantDB::table('salle_subject')->where('salle_id', $salle->id)->where('subject_id', $subject->id)->delete();

        return response()->json(['message' => 'Matière retirée']);
    }
}
