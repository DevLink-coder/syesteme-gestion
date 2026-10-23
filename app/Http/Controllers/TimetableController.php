<?php

namespace App\Http\Controllers;

use App\Models\Subject;
use App\Models\TimetableSlot;
use App\Support\TenantContext;
use App\Support\TenantDB;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class TimetableController extends Controller
{
    // GET /web/timetable?room_id=troisieme&week_start=2026-09-14&salle_id=1
    public function index(Request $request)
    {
        $query = TenantDB::table('timetable_slots')
            ->join('salles', 'salles.id', '=', 'timetable_slots.salle_id')
            ->join('subjects', 'subjects.id', '=', 'timetable_slots.subject_id')
            ->join('users', 'users.id', '=', 'timetable_slots.teacher_id')
            ->join('school_years', 'school_years.id', '=', 'timetable_slots.school_year_id')
            ->whereNull('timetable_slots.deleted_at')
            ->whereNull('salles.deleted_at')
            ->whereNull('subjects.deleted_at')
            ->whereNull('users.deleted_at')
            ->whereNull('school_years.deleted_at')
            ->select('timetable_slots.*', 'salles.name as salle_name', 'subjects.name as subject_label', 'users.name as teacher_name');

        if ($request->filled('room_id')) {
            $query->where('timetable_slots.room_id', $request->room_id);
        }
        if ($request->filled('salle_id')) {
            $query->where('timetable_slots.salle_id', $request->salle_id);
        }
        if ($request->filled('teacher_id')) {
            $query->where('timetable_slots.teacher_id', $request->teacher_id);
        }
        if ($request->filled('week_start')) {
            $query->where('timetable_slots.week_start', $request->week_start);
        }
        if ($request->filled('school_year_id')) {
            $query->where('timetable_slots.school_year_id', $request->school_year_id);
        }

        $slots = $query->orderBy('day')->orderBy('start_time')->get();

        return response()->json($slots);
    }

    // POST /web/timetable (Ajouter un créneau)
    public function store(Request $request)
    {
        $request->validate([
            'salle_id' => ['required', Rule::exists('salles', 'id')->where('center_id', TenantContext::requireId())->whereNull('deleted_at')],
            'room_id' => 'required|string',
            'day' => 'required|in:Lundi,Mardi,Mercredi,Jeudi,Vendredi,Samedi,Dimanche',
            'start_time' => 'required|date_format:H:i',
            'end_time' => 'required|date_format:H:i|after:start_time',
            'subject' => 'required|string',
            'teacher_id' => ['required', Rule::exists('users', 'id')->where('center_id', TenantContext::requireId())->whereNull('deleted_at')],
            'week_start' => 'nullable|date',
            'school_year_id' => ['required', Rule::exists('school_years', 'id')->where('center_id', TenantContext::requireId())->whereNull('deleted_at')],
        ]);

        // RG-03 : chevauchement même enseignant même jour même week
        $conflict = $this->findConflict(
            $request->teacher_id,
            $request->day,
            $request->start_time,
            $request->end_time,
            $request->week_start
        );
        if ($conflict) {
            return response()->json(['message' => "Conflit RG-03 : {$conflict->teacher_name} a déjà un créneau le {$conflict->day} {$conflict->start_time}-{$conflict->end_time} en {$conflict->room_id} ({$conflict->subject_name})", 'conflict' => $conflict], 409);
        }

        // Contrainte : le prof ne peut enseigner que dans une salle assignée et que ses matières assignées
        $subjectId = TenantDB::table('subjects')->whereNull('deleted_at')->where('name', $request->subject)->value('id');
        $deletedSubjectExists = Subject::withTrashed()->where('name', $request->subject)->whereNotNull('deleted_at')->exists();
        if (! $subjectId && $deletedSubjectExists) {
            return response()->json(['message' => 'Cette matière est supprimée. Restaurez-la avant de planifier.'], 422);
        }
        $assigned = TenantDB::table('teacher_subject')->where('user_id', $request->teacher_id)->where('room_id', $request->room_id)->where('subject_id', $subjectId ?? 0)->exists();
        // Si pas trouvé, vérifie si le prof est assigné à cette salle (au moins une matière) et à cette matière (au moins une salle)
        if (! $assigned) {
            $hasRoom = TenantDB::table('teacher_subject')->where('user_id', $request->teacher_id)->where('room_id', $request->room_id)->exists();
            $hasSubject = TenantDB::table('teacher_subject')->where('user_id', $request->teacher_id)->where('subject_id', $subjectId ?? -1)->exists();
            if (! $hasRoom || ! $hasSubject) {
                // Pour les profs qui n'ont pas encore d'assignation précise, on autorise si la matière est bien dans la salle
                $inSalle = TenantDB::table('salle_subject')->where('salle_id', $request->salle_id)->where('subject_id', $subjectId ?? 0)->exists();
                if (! $inSalle) {
                    return response()->json(['message' => "Ce professeur n'est pas assigné à cette salle/matière."], 422);
                }
            }
        }

        if (! $subjectId) {
            $subjectId = TenantDB::table('subjects')->insertGetId([
                'name' => $request->subject,
                'slug' => Str::slug($request->subject),
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        $id = TenantDB::table('timetable_slots')->insertGetId([
            'code' => 'sl-'.Str::random(8),
            'salle_id' => $request->salle_id,
            'room_id' => $request->room_id,
            'day' => $request->day,
            'start_time' => $request->start_time,
            'end_time' => $request->end_time,
            'subject_id' => $subjectId,
            'subject_name' => $request->subject,
            'teacher_id' => $request->teacher_id,
            'week_start' => $request->week_start,
            'school_year_id' => $request->school_year_id,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $slot = TenantDB::table('timetable_slots')->whereNull('deleted_at')->where('id', $id)->first();

        // Audit log
        TenantDB::table('audit_logs')->insert([
            'code' => 'audit-'.Str::random(6),
            'author_id' => $request->user()?->id,
            'author_name' => $request->user()?->name ?? 'Système',
            'happened_at' => now(),
            'type' => 'modification_note',
            'entity' => "Créneau {$slot->subject_name} {$slot->day} {$slot->start_time}",
            'school_year_code' => TenantDB::table('school_years')->where('id', $slot->school_year_id)->value('code') ?? '2026-2027',
            'school_year_id' => $slot->school_year_id,
            'old_value' => null,
            'new_value' => json_encode($slot),
            'details' => 'Ajout créneau',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return response()->json($slot, 201);
    }

    // PUT /web/timetable/{id} (Modifier)
    public function update(Request $request, $id)
    {
        $slot = TenantDB::table('timetable_slots')->whereNull('deleted_at')->where('id', $id)->first();
        if (! $slot) {
            return response()->json(['message' => 'Créneau introuvable'], 404);
        }

        $request->validate([
            'day' => 'sometimes|in:Lundi,Mardi,Mercredi,Jeudi,Vendredi,Samedi,Dimanche',
            'start_time' => 'sometimes|date_format:H:i',
            'end_time' => 'sometimes|date_format:H:i|after:start_time',
            'subject' => 'sometimes|string',
            'teacher_id' => ['sometimes', Rule::exists('users', 'id')->where('center_id', TenantContext::requireId())->whereNull('deleted_at')],
            'week_start' => 'nullable|date',
        ]);

        $day = $request->day ?? $slot->day;
        $start = $request->start_time ?? substr($slot->start_time, 0, 5);
        $end = $request->end_time ?? substr($slot->end_time, 0, 5);
        $teacherId = $request->teacher_id ?? $slot->teacher_id;
        $week = $request->has('week_start') ? $request->week_start : $slot->week_start;

        $conflict = $this->findConflict($teacherId, $day, $start, $end, $week, $id);
        if ($conflict) {
            return response()->json(['message' => "Conflit RG-03 : {$conflict->teacher_name} déjà occupé"], 409);
        }

        $old = clone $slot;
        $update = [];
        if ($request->has('day')) {
            $update['day'] = $day;
        }
        if ($request->has('start_time')) {
            $update['start_time'] = $start;
        }
        if ($request->has('end_time')) {
            $update['end_time'] = $end;
        }
        if ($request->has('subject')) {
            $subjectId = TenantDB::table('subjects')->whereNull('deleted_at')->where('name', $request->subject)->value('id');
            if (! $subjectId && Subject::withTrashed()->where('name', $request->subject)->whereNotNull('deleted_at')->exists()) {
                return response()->json(['message' => 'Cette matière est supprimée. Restaurez-la avant de modifier le créneau.'], 422);
            }
            if (! $subjectId) {
                $subjectId = TenantDB::table('subjects')->insertGetId(['name' => $request->subject, 'slug' => Str::slug($request->subject), 'created_at' => now(), 'updated_at' => now()]);
            }
            $update['subject_id'] = $subjectId;
            $update['subject_name'] = $request->subject;
        }
        if ($request->has('teacher_id')) {
            $update['teacher_id'] = $teacherId;
        }
        if ($request->has('week_start')) {
            $update['week_start'] = $week;
        }
        $update['updated_at'] = now();

        TenantDB::table('timetable_slots')->whereNull('deleted_at')->where('id', $id)->update($update);
        $new = TenantDB::table('timetable_slots')->whereNull('deleted_at')->where('id', $id)->first();

        TenantDB::table('audit_logs')->insert([
            'code' => 'audit-'.Str::random(6),
            'author_id' => $request->user()?->id,
            'author_name' => $request->user()?->name ?? 'Système',
            'happened_at' => now(),
            'type' => 'modification_note',
            'entity' => "Créneau {$old->subject_name} {$old->day}",
            'school_year_code' => TenantDB::table('school_years')->where('id', $old->school_year_id)->value('code') ?? '2026-2027',
            'school_year_id' => $old->school_year_id,
            'old_value' => json_encode($old),
            'new_value' => json_encode($new),
            'details' => 'Modification créneau',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return response()->json($new);
    }

    public function destroy(Request $request, $id)
    {
        $slot = TenantDB::table('timetable_slots')->whereNull('deleted_at')->where('id', $id)->first();
        if (! $slot) {
            return response()->json(['message' => 'Introuvable'], 404);
        }
        TimetableSlot::query()->whereKey($id)->delete();

        TenantDB::table('audit_logs')->insert([
            'code' => 'audit-'.Str::random(6),
            'author_id' => $request->user()?->id,
            'author_name' => $request->user()?->name ?? 'Système',
            'happened_at' => now(),
            'type' => 'modification_note',
            'entity' => "Créneau {$slot->subject_name} {$slot->day}",
            'school_year_code' => TenantDB::table('school_years')->where('id', $slot->school_year_id)->value('code') ?? '2026-2027',
            'school_year_id' => $slot->school_year_id,
            'old_value' => json_encode($slot),
            'new_value' => 'Supprimé',
            'details' => 'Suppression créneau',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return response()->json(['message' => 'Supprimé']);
    }

    public function restore($id)
    {
        $slot = TimetableSlot::withTrashed()->findOrFail($id);
        if (! $slot->trashed()) {
            return response()->json(['message' => 'Le créneau est déjà actif.'], 409);
        }

        $slot->restore();

        return response()->json(['message' => 'Créneau restauré.', 'slot' => $slot]);
    }

    // POST /web/timetable/reuse-last-week {room_id, week_start, salle_id}
    public function reuseLastWeek(Request $request)
    {
        $request->validate([
            'room_id' => 'required|string',
            'week_start' => 'required|date',
            'salle_id' => ['required', Rule::exists('salles', 'id')->where('center_id', TenantContext::requireId())->whereNull('deleted_at')],
            'school_year_id' => ['required', Rule::exists('school_years', 'id')->where('center_id', TenantContext::requireId())->whereNull('deleted_at')],
        ]);

        $currentWeek = $request->week_start;
        $lastWeek = date('Y-m-d', strtotime($currentWeek.' -7 days'));

        $lastSlots = TenantDB::table('timetable_slots')
            ->where('room_id', $request->room_id)
            ->whereNull('deleted_at')
            ->where('week_start', $lastWeek)
            ->get();

        // Si pas de semaine passée avec week_start, prend les récurrents (week_start null) ou la dernière semaine existante
        if ($lastSlots->isEmpty()) {
            $lastSlots = TenantDB::table('timetable_slots')
                ->where('room_id', $request->room_id)
                ->whereNull('deleted_at')
                ->whereNull('week_start')
                ->get();
            if ($lastSlots->isEmpty()) {
                $lastWeekRow = TenantDB::table('timetable_slots')->whereNull('deleted_at')->where('room_id', $request->room_id)->orderByDesc('week_start')->first();
                if ($lastWeekRow && $lastWeekRow->week_start) {
                    $lastSlots = TenantDB::table('timetable_slots')->whereNull('deleted_at')->where('room_id', $request->room_id)->where('week_start', $lastWeekRow->week_start)->get();
                }
            }
        }

        if ($lastSlots->isEmpty()) {
            return response()->json(['message' => 'Aucun emploi du temps la semaine passée à réutiliser. Aucun créneau n\'y figure.', 'count' => 0], 200);
        }

        // Si la semaine cible a déjà des créneaux, on les supprime et on remplace par ceux de la semaine passée
        $existsCount = TenantDB::table('timetable_slots')->whereNull('deleted_at')->where('room_id', $request->room_id)->where('week_start', $currentWeek)->count();
        $replaced = false;
        if ($existsCount > 0) {
            TimetableSlot::query()->where('room_id', $request->room_id)->where('week_start', $currentWeek)->delete();
            $replaced = true;
        }

        $created = 0;
        foreach ($lastSlots as $s) {
            // Vérifie conflit RG-03 pour cette semaine (après suppression, plus de conflit intra-semaine)
            $conflict = $this->findConflict($s->teacher_id, $s->day, substr($s->start_time, 0, 5), substr($s->end_time, 0, 5), $currentWeek);
            if ($conflict) {
                continue;
            }

            TenantDB::table('timetable_slots')->insert([
                'code' => 'sl-'.Str::random(8),
                'salle_id' => $request->salle_id,
                'room_id' => $s->room_id,
                'day' => $s->day,
                'start_time' => $s->start_time,
                'end_time' => $s->end_time,
                'subject_id' => $s->subject_id,
                'subject_name' => $s->subject_name,
                'teacher_id' => $s->teacher_id,
                'week_start' => $currentWeek,
                'school_year_id' => $request->school_year_id,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
            $created++;
        }

        if ($replaced) {
            return response()->json(['message' => "$created créneaux réutilisés (remplacement de $existsCount créneaux existants).", 'count' => $created, 'replaced' => $existsCount]);
        }

        return response()->json(['message' => "$created créneaux réutilisés de la semaine passée.", 'count' => $created]);
    }

    private function findConflict($teacherId, $day, $start, $end, $weekStart, $excludeId = null)
    {
        $s = (int) str_replace(':', '', $start);
        $e = (int) str_replace(':', '', $end);
        $q = TenantDB::table('timetable_slots')
            ->join('users', 'users.id', '=', 'timetable_slots.teacher_id')
            ->where('timetable_slots.teacher_id', $teacherId)
            ->where('timetable_slots.day', $day)
            ->whereNull('timetable_slots.deleted_at')
            ->whereNull('users.deleted_at')
            ->select('timetable_slots.*', 'users.name as teacher_name');
        if ($excludeId) {
            $q->where('timetable_slots.id', '!=', $excludeId);
        }
        $slots = $q->get();
        foreach ($slots as $sl) {
            $slWeek = $sl->week_start;
            if ($weekStart && $slWeek && $weekStart !== $slWeek) {
                continue;
            }
            if (! $weekStart && $slWeek) {
                continue;
            }
            $ss = (int) str_replace(':', '', substr($sl->start_time, 0, 5));
            $ee = (int) str_replace(':', '', substr($sl->end_time, 0, 5));
            $overlap = ! ($e <= $ss || $s >= $ee);
            if ($overlap) {
                return $sl;
            }
        }

        return null;
    }
}
