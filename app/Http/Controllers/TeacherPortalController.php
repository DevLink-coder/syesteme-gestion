<?php

namespace App\Http\Controllers;

use App\Models\Grade;
use App\Models\Inscription;
use App\Models\Student;
use App\Models\User;
use App\Support\TenantDB;
use App\Support\TenantRules;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class TeacherPortalController extends Controller
{
    public function dashboard(Request $request)
    {
        $teacher = $this->teacher($request);
        if (! $teacher) {
            return response()->json(['message' => 'Accès enseignant requis.'], 403);
        }

        $weekStart = now()->startOfWeek()->toDateString();
        $dayNames = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
        $todayName = $dayNames[now()->dayOfWeek];
        $dayOrder = array_flip(['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']);
        $slots = $this->slotsForWeek($teacher, $weekStart, $teacher->isAdmin())
            ->sortBy(fn ($slot) => sprintf('%02d-%s', $dayOrder[$slot['day']] ?? 7, $slot['startTime']))
            ->values();
        $todaySlots = $slots->where('day', $todayName)->values();
        $todayIndex = $dayOrder[$todayName] ?? 0;
        $upcomingSlots = $slots->filter(function ($slot) use ($dayOrder, $todayIndex, $todayName) {
            return ($dayOrder[$slot['day']] ?? 7) > $todayIndex
                || ($slot['day'] === $todayName && $slot['startTime'] >= now()->format('H:i'));
        })->take(3)->values();

        return response()->json([
            'teacher' => [
                'id' => (string) $teacher->id,
                'name' => $teacher->name,
                'code' => $teacher->code,
            ],
            'today' => $todayName,
            'date' => now()->toDateString(),
            'todaySlots' => $todaySlots,
            'upcomingSlots' => $upcomingSlots,
            'weekSlotsCount' => $slots->count(),
            'assignmentsCount' => TenantDB::table('teacher_subject')
                ->when(! $teacher->isAdmin(), fn ($query) => $query->where('user_id', $teacher->id))
                ->count(),
        ]);
    }

    public function timetable(Request $request)
    {
        $teacher = $this->teacher($request);
        if (! $teacher) {
            return response()->json(['message' => 'Accès enseignant requis.'], 403);
        }

        $validated = $request->validate([
            'week_start' => ['nullable', 'date'],
        ]);
        $weekStart = $validated['week_start'] ?? now()->startOfWeek()->toDateString();

        return response()->json([
            'weekStart' => $weekStart,
            'slots' => $this->slotsForWeek($teacher, $weekStart, $teacher->isAdmin()),
        ]);
    }

    public function evaluations(Request $request)
    {
        $teacher = $this->teacher($request);
        if (! $teacher) {
            return response()->json(['message' => 'Accès enseignant requis.'], 403);
        }

        if ($teacher->isAdmin()) {
            $subjectIds = TenantDB::table('subjects')->whereNull('deleted_at')->pluck('id', 'name');
            $evaluations = TenantDB::table('evaluations')
                ->leftJoin('salles', 'salles.id', '=', 'evaluations.salle_id')
                ->whereNull('evaluations.deleted_at')
                ->whereNull('salles.deleted_at')
                ->orderByDesc('evaluations.date')
                ->orderByDesc('evaluations.created_at')
                ->get([
                    'evaluations.id', 'evaluations.title', 'evaluations.room_id',
                    'evaluations.date', 'evaluations.subject', 'evaluations.status',
                    'salles.name as salle_name',
                ])
                ->map(function ($evaluation) use ($subjectIds) {
                    $subjects = collect(explode(',', (string) $evaluation->subject))
                        ->map(fn ($name) => trim($name))
                        ->filter()
                        ->map(fn ($name) => isset($subjectIds[$name]) ? [
                            'id' => (string) $subjectIds[$name],
                            'name' => $name,
                        ] : null)
                        ->filter()
                        ->values();

                    return [
                        'id' => (string) $evaluation->id,
                        'title' => $evaluation->title,
                        'roomId' => $evaluation->room_id,
                        'salleName' => $evaluation->salle_name,
                        'date' => $evaluation->date,
                        'subjects' => $subjects,
                        'status' => $evaluation->status,
                    ];
                });

            return response()->json(['data' => $evaluations]);
        }

        $assignments = TenantDB::table('teacher_subject')
            ->join('subjects', 'subjects.id', '=', 'teacher_subject.subject_id')
            ->where('teacher_subject.user_id', $teacher->id)
            ->whereNull('subjects.deleted_at')
            ->get(['teacher_subject.room_id', 'subjects.id as subject_id', 'subjects.name as subject_name']);
        $byRoom = $assignments->groupBy('room_id');
        if ($byRoom->isEmpty()) {
            return response()->json(['data' => []]);
        }

        $evaluations = TenantDB::table('evaluations')
            ->leftJoin('salles', 'salles.id', '=', 'evaluations.salle_id')
            ->whereIn('evaluations.room_id', $byRoom->keys())
            ->whereNull('evaluations.deleted_at')
            ->whereNull('salles.deleted_at')
            ->orderByDesc('evaluations.date')
            ->orderByDesc('evaluations.created_at')
            ->get([
                'evaluations.id', 'evaluations.title', 'evaluations.room_id',
                'evaluations.date', 'evaluations.subject', 'evaluations.status',
                'salles.name as salle_name',
            ])
            ->map(function ($evaluation) use ($byRoom) {
                $evaluationSubjects = collect(explode(',', (string) $evaluation->subject))
                    ->map(fn ($subject) => trim($subject))
                    ->filter();
                $availableSubjects = $byRoom->get($evaluation->room_id, collect())
                    ->filter(fn ($assignment) => $evaluationSubjects->contains($assignment->subject_name))
                    ->map(fn ($assignment) => [
                        'id' => (string) $assignment->subject_id,
                        'name' => $assignment->subject_name,
                    ])->values();

                if ($availableSubjects->isEmpty()) {
                    return null;
                }

                return [
                    'id' => (string) $evaluation->id,
                    'title' => $evaluation->title,
                    'roomId' => $evaluation->room_id,
                    'salleName' => $evaluation->salle_name,
                    'date' => $evaluation->date,
                    'subjects' => $availableSubjects,
                    'status' => $evaluation->status,
                ];
            })
            ->filter()
            ->values();

        return response()->json(['data' => $evaluations]);
    }

    public function evaluationGrades(Request $request, $evaluationId)
    {
        $teacher = $this->teacher($request);
        if (! $teacher) {
            return response()->json(['message' => 'Accès enseignant requis.'], 403);
        }

        $validated = $request->validate([
            'subject_id' => ['required', 'integer', TenantRules::exists('subjects')],
        ]);
        $evaluation = TenantDB::table('evaluations')
            ->join('salles', 'salles.id', '=', 'evaluations.salle_id')
            ->where('evaluations.id', $evaluationId)
            ->whereNull('evaluations.deleted_at')
            ->whereNull('salles.deleted_at')
            ->first([
                'evaluations.id', 'evaluations.title', 'evaluations.salle_id',
                'evaluations.room_id', 'evaluations.date', 'evaluations.subject',
                'salles.name as salle_name',
            ]);
        if (! $evaluation) {
            return response()->json(['message' => 'Évaluation introuvable.'], 404);
        }

        $assignment = $this->assignmentForEvaluation($teacher, $evaluation, (int) $validated['subject_id']);
        if (! $assignment) {
            return response()->json(['message' => 'Cette matière ne vous est pas assignée pour cette évaluation.'], 403);
        }

        $students = $this->studentsForRoom((int) $evaluation->salle_id);
        $grades = Grade::query()
            ->where('evaluation_id', $evaluationId)
            ->where('subject_id', $assignment->subject_id)
            ->whereIn('student_id', $students->pluck('id'))
            ->get()
            ->keyBy('student_id');

        return response()->json([
            'evaluation' => [
                'id' => (string) $evaluation->id,
                'title' => $evaluation->title,
                'roomId' => $evaluation->room_id,
                'salleName' => $evaluation->salle_name,
                'date' => $evaluation->date,
            ],
            'subject' => [
                'id' => (string) $assignment->subject_id,
                'name' => $assignment->subject_name,
                'coefficient' => (float) $assignment->coefficient,
            ],
            'students' => $students->map(function ($student) use ($grades, $assignment) {
                $grade = $grades->get($student->id);

                return [
                    'id' => (string) $student->id,
                    'code' => $student->code,
                    'name' => $student->name,
                    'note' => $grade ? (float) $grade->note : null,
                    'coefficient' => (float) ($grade?->coefficient ?? $assignment->coefficient),
                ];
            })->values(),
        ]);
    }

    public function storeGrade(Request $request, $evaluationId)
    {
        $teacher = $this->teacher($request);
        if (! $teacher) {
            return response()->json(['message' => 'Accès enseignant requis.'], 403);
        }

        $validated = $request->validate([
            'student_id' => ['required', 'integer', TenantRules::exists('students')],
            'subject_id' => ['required', 'integer', TenantRules::exists('subjects')],
            'note' => ['required', 'numeric', 'min:0', 'max:20'],
        ]);
        $evaluation = TenantDB::table('evaluations')
            ->join('salles', 'salles.id', '=', 'evaluations.salle_id')
            ->where('evaluations.id', $evaluationId)
            ->whereNull('evaluations.deleted_at')
            ->whereNull('salles.deleted_at')
            ->first(['evaluations.id', 'evaluations.salle_id', 'evaluations.room_id', 'evaluations.subject']);
        if (! $evaluation) {
            return response()->json(['message' => 'Évaluation introuvable.'], 404);
        }

        $assignment = $this->assignmentForEvaluation($teacher, $evaluation, (int) $validated['subject_id']);
        if (! $assignment) {
            return response()->json(['message' => 'Cette matière ne vous est pas assignée pour cette évaluation.'], 403);
        }

        $studentIsInRoom = Inscription::query()
            ->where('salle_id', $evaluation->salle_id)
            ->where('student_id', $validated['student_id'])
            ->whereIn('statut', ['Validée', 'En attente de paiement'])
            ->exists();
        if (! $studentIsInRoom) {
            return response()->json(['message' => 'Cet élève n’est pas inscrit dans cette salle.'], 403);
        }

        $grade = Grade::query()->updateOrCreate(
            [
                'evaluation_id' => $evaluationId,
                'student_id' => $validated['student_id'],
                'subject_id' => $assignment->subject_id,
            ],
            [
                'subject_name' => $assignment->subject_name,
                'note' => (float) $validated['note'],
                'coefficient' => (float) $assignment->coefficient,
                'graded_by' => $teacher->id,
                'synced_at' => now(),
            ],
        );

        return response()->json([
            'message' => 'Note enregistrée.',
            'grade' => [
                'id' => (string) $grade->id,
                'note' => (float) $grade->note,
                'coefficient' => (float) $grade->coefficient,
            ],
        ]);
    }

    public function attendanceSheet(Request $request, $slotId)
    {
        $teacher = $this->teacher($request);
        if (! $teacher) {
            return response()->json(['message' => 'Accès enseignant requis.'], 403);
        }

        $slot = TenantDB::table('timetable_slots')
            ->join('salles', 'salles.id', '=', 'timetable_slots.salle_id')
            ->where('timetable_slots.id', $slotId)
            ->when(! $teacher->isAdmin(), fn ($query) => $query->where('timetable_slots.teacher_id', $teacher->id))
            ->whereNull('timetable_slots.deleted_at')
            ->whereNull('salles.deleted_at')
            ->first([
                'timetable_slots.id', 'timetable_slots.salle_id', 'timetable_slots.room_id',
                'timetable_slots.day', 'timetable_slots.start_time', 'timetable_slots.end_time',
                'timetable_slots.subject_name', 'timetable_slots.school_year_id', 'salles.name as salle_name',
            ]);
        if (! $slot) {
            return response()->json(['message' => 'Créneau introuvable ou non assigné.'], 404);
        }

        $date = $request->query('date', now()->toDateString());
        validator(['date' => $date], ['date' => ['required', 'date']])->validate();
        $students = $this->studentsForRoom((int) $slot->salle_id);
        $attendanceByStudent = TenantDB::table('attendances')
            ->where('salle_id', $slot->salle_id)
            ->where('date', $date)
            ->whereNull('deleted_at')
            ->whereIn('student_id', $students->pluck('id'))
            ->get()
            ->keyBy('student_id');

        return response()->json([
            'slot' => [
                'id' => (string) $slot->id,
                'day' => $slot->day,
                'startTime' => substr($slot->start_time, 0, 5),
                'endTime' => substr($slot->end_time, 0, 5),
                'subject' => $slot->subject_name,
                'roomId' => $slot->room_id,
                'salleName' => $slot->salle_name,
                'schoolYearId' => (string) $slot->school_year_id,
            ],
            'date' => $date,
            'hasSaved' => $attendanceByStudent->isNotEmpty(),
            'students' => $students->map(function ($student) use ($attendanceByStudent) {
                $attendance = $attendanceByStudent->get($student->id);

                return [
                    'id' => (string) $student->id,
                    'code' => $student->code,
                    'name' => $student->name,
                    'present' => $attendance ? (bool) $attendance->present : true,
                ];
            })->values(),
        ]);
    }

    public function storeAttendance(Request $request, $slotId)
    {
        $teacher = $this->teacher($request);
        if (! $teacher) {
            return response()->json(['message' => 'Accès enseignant requis.'], 403);
        }

        $validated = $request->validate([
            'date' => ['required', 'date'],
            'attendances' => ['required', 'array', 'min:1'],
            'attendances.*.student_id' => ['required', 'integer', TenantRules::exists('students')],
            'attendances.*.present' => ['required', 'boolean'],
        ]);
        $slot = TenantDB::table('timetable_slots')
            ->where('id', $slotId)
            ->when(! $teacher->isAdmin(), fn ($query) => $query->where('teacher_id', $teacher->id))
            ->whereNull('deleted_at')
            ->first();
        if (! $slot) {
            return response()->json(['message' => 'Créneau introuvable ou non assigné.'], 404);
        }

        $eligibleIds = $this->studentsForRoom((int) $slot->salle_id)->pluck('id')->map(fn ($id) => (int) $id)->all();
        foreach ($validated['attendances'] as $attendance) {
            if (! in_array((int) $attendance['student_id'], $eligibleIds, true)) {
                throw ValidationException::withMessages([
                    'attendances' => ['Un élève transmis n’est pas inscrit dans cette salle.'],
                ]);
            }
        }

        DB::transaction(function () use ($validated, $slot, $teacher) {
            foreach ($validated['attendances'] as $attendance) {
                $existing = TenantDB::table('attendances')
                    ->where('student_id', $attendance['student_id'])
                    ->where('salle_id', $slot->salle_id)
                    ->where('date', $validated['date'])
                    ->first();
                $values = [
                    'timetable_slot_id' => $slot->id,
                    'room_id' => $slot->room_id,
                    'heure_appel' => now()->format('H:i'),
                    'present' => (bool) $attendance['present'],
                    'marked_by' => $teacher->id,
                    'school_year_id' => $slot->school_year_id,
                    'deleted_at' => null,
                    'updated_at' => now(),
                ];

                if ($existing) {
                    TenantDB::table('attendances')->where('id', $existing->id)->update($values);
                } else {
                    TenantDB::table('attendances')->insert($values + [
                        'code' => 'att-'.$attendance['student_id'].'-'.$slot->salle_id.'-'.$validated['date'],
                        'student_id' => $attendance['student_id'],
                        'salle_id' => $slot->salle_id,
                        'date' => $validated['date'],
                        'created_at' => now(),
                    ]);
                }
            }
        });

        return response()->json(['message' => 'Appel enregistré.']);
    }

    private function teacher(Request $request): ?User
    {
        $user = $request->user();
        if (! $user instanceof User || (! $user->isTeacher() && ! $user->isAdmin()) || $user->status !== 'active') {
            return null;
        }

        return $user;
    }

    private function slotsForWeek(User $teacher, string $weekStart, bool $allTeachers = false)
    {
        $query = TenantDB::table('timetable_slots')
            ->join('salles', 'salles.id', '=', 'timetable_slots.salle_id')
            ->leftJoin('school_years', 'school_years.id', '=', 'timetable_slots.school_year_id')
            ->whereNull('timetable_slots.deleted_at')
            ->whereNull('salles.deleted_at')
            ->whereNull('school_years.deleted_at')
            ->where(function ($query) use ($weekStart) {
                $query->whereNull('timetable_slots.week_start')
                    ->orWhereDate('timetable_slots.week_start', $weekStart);
            });
        if (! $allTeachers) {
            $query->where('timetable_slots.teacher_id', $teacher->id);
        }

        return $query
            ->orderBy('timetable_slots.start_time')
            ->get([
                'timetable_slots.id', 'timetable_slots.salle_id', 'timetable_slots.room_id',
                'timetable_slots.day', 'timetable_slots.start_time', 'timetable_slots.end_time',
                'timetable_slots.subject_name', 'timetable_slots.week_start',
                'salles.name as salle_name', 'school_years.label as school_year_label',
            ])
            ->map(fn ($slot) => [
                'id' => (string) $slot->id,
                'salleId' => (string) $slot->salle_id,
                'roomId' => $slot->room_id,
                'roomName' => $slot->salle_name,
                'day' => $slot->day,
                'startTime' => substr($slot->start_time, 0, 5),
                'endTime' => substr($slot->end_time, 0, 5),
                'subject' => $slot->subject_name,
                'schoolYearLabel' => $slot->school_year_label,
                'weekStart' => $slot->week_start,
            ]);
    }

    private function studentsForRoom(int $salleId)
    {
        $studentIds = Inscription::query()
            ->where('salle_id', $salleId)
            ->whereIn('statut', ['Validée', 'En attente de paiement'])
            ->pluck('student_id');

        return Student::query()
            ->whereIn('id', $studentIds)
            ->orderBy('name')
            ->get(['id', 'code', 'name']);
    }

    private function assignmentForEvaluation(User $teacher, object $evaluation, int $subjectId): ?object
    {
        if ($teacher->isAdmin()) {
            $subjectName = TenantDB::table('subjects')->whereNull('deleted_at')->where('id', $subjectId)->value('name');
            $evaluationSubjects = collect(explode(',', (string) $evaluation->subject))
                ->map(fn ($subject) => trim($subject));
            if (! $subjectName || ! $evaluationSubjects->contains($subjectName)) {
                return null;
            }

            return (object) [
                'subject_id' => $subjectId,
                'subject_name' => $subjectName,
                'coefficient' => TenantDB::table('salle_subject')
                    ->where('salle_id', $evaluation->salle_id)
                    ->where('subject_id', $subjectId)
                    ->value('coefficient') ?? 1,
            ];
        }

        $assignment = TenantDB::table('teacher_subject')
            ->join('subjects', 'subjects.id', '=', 'teacher_subject.subject_id')
            ->where('teacher_subject.user_id', $teacher->id)
            ->where('teacher_subject.room_id', $evaluation->room_id)
            ->where('subjects.id', $subjectId)
            ->whereNull('subjects.deleted_at')
            ->first([
                'subjects.id as subject_id',
                'subjects.name as subject_name',
                'teacher_subject.coefficient',
            ]);
        if (! $assignment) {
            return null;
        }

        $evaluationSubjects = collect(explode(',', (string) $evaluation->subject))
            ->map(fn ($subject) => trim($subject));

        return $evaluationSubjects->contains($assignment->subject_name) ? $assignment : null;
    }
}
