<?php

namespace App\Http\Controllers;

use App\Models\Attendance;
use App\Models\Inscription;
use App\Models\Salle;
use App\Models\Student;
use App\Models\TimetableSlot;
use App\Support\TenantDB;
use App\Support\TenantRules;
use Illuminate\Http\Request;

class AttendanceController extends Controller
{
    public function index(Request $request)
    {
        $date = $request->query('date', now()->toDateString());
        $schoolYearId = $request->query('school_year_id');

        $query = Salle::query()
            ->with(['schoolYear'])
            ->where('status', 'active');

        if ($schoolYearId) {
            $query->where('school_year_id', $schoolYearId);
        }

        $salles = $query->get();

        $attendanceData = $salles->map(function ($salle) use ($date) {
            $attendances = Attendance::query()
                ->where('salle_id', $salle->id)
                ->where('date', $date)
                ->get();

            $inscriptions = Inscription::query()
                ->where('salle_id', $salle->id)
                ->whereIn('statut', ['Validée', 'En attente de paiement'])
                ->count();

            $presentCount = $attendances->where('present', true)->count();
            $absentCount = $attendances->where('present', false)->count();
            $notCalledCount = $inscriptions - $attendances->count();

            $statut = 'Non fait';
            $heure = '—';

            if ($attendances->count() > 0) {
                $statut = 'Fait';
                $heure = $attendances->first()->heure_appel ?: '—';
            }

            return [
                'id' => (string) $salle->id,
                'name' => $salle->name,
                'roomId' => $salle->room_id,
                'schoolYearId' => (string) $salle->school_year_id,
                'statut' => $statut,
                'heure' => $heure,
                'presents' => $presentCount,
                'absents' => $absentCount,
                'notCalled' => $notCalledCount,
                'totalStudents' => $inscriptions,
                'lastDate' => $attendances->max('date') ?? $date,
            ];
        });

        return response()->json([
            'data' => $attendanceData,
            'salles' => $attendanceData,
        ]);
    }

    public function show(Request $request, $salleId)
    {
        $date = $request->query('date', now()->toDateString());

        $salle = Salle::with(['schoolYear'])->findOrFail($salleId);

        // Récupérer les inscriptions validées pour cette salle
        $inscriptions = Inscription::query()
            ->where('salle_id', $salleId)
            ->whereIn('statut', ['Validée', 'En attente de paiement'])
            ->get();

        // Récupérer les étudiants via les inscriptions
        $studentIds = $inscriptions->pluck('student_id')->toArray();
        $students = Student::query()
            ->whereIn('id', $studentIds)
            ->get();

        $attendances = Attendance::query()
            ->where('salle_id', $salleId)
            ->where('date', $date)
            ->get()
            ->keyBy('student_id');

        $studentData = $students->map(function ($student) use ($attendances) {
            $attendance = $attendances->get($student->id);

            return [
                'id' => (string) $student->id,
                'name' => $student->name,
                'parentName' => $student->parent_name,
                'parentWhatsApp' => $student->parent_whatsapp,
                'present' => $attendance ? $attendance->present : null,
                'heureAppel' => $attendance ? $attendance->heure_appel : null,
                'whatsappStatus' => $attendance ? $attendance->whatsapp_status : null,
            ];
        });

        $slots = TimetableSlot::query()
            ->where('salle_id', $salleId)
            ->where('school_year_id', $salle->school_year_id)
            ->orderBy('day')
            ->orderBy('start_time')
            ->get();

        return response()->json([
            'salle' => [
                'id' => (string) $salle->id,
                'name' => $salle->name,
                'roomId' => $salle->room_id,
                'schoolYearId' => (string) $salle->school_year_id,
                'schoolYearLabel' => $salle->schoolYear?->label,
            ],
            'students' => $studentData,
            'slots' => $slots,
            'date' => $date,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'salle_id' => ['required', TenantRules::exists('salles')],
            'date' => ['required', 'date'],
            'attendances' => ['required', 'array'],
            'attendances.*.student_id' => ['required', TenantRules::exists('students')],
            'attendances.*.present' => ['required', 'boolean'],
            'attendances.*.heure_appel' => ['nullable', 'date_format:H:i'],
            'marked_by' => ['nullable', TenantRules::exists('users')],
        ]);

        $salle = Salle::findOrFail($validated['salle_id']);
        $schoolYearId = $salle->school_year_id;

        $created = [];
        foreach ($validated['attendances'] as $att) {
            $existing = Attendance::withTrashed()
                ->where('student_id', $att['student_id'])
                ->where('salle_id', $validated['salle_id'])
                ->where('date', $validated['date'])
                ->first();

            if ($existing) {
                if ($existing->trashed()) {
                    $existing->restore();
                }
                $existing->update([
                    'present' => $att['present'],
                    'heure_appel' => $att['heure_appel'] ?? now()->format('H:i'),
                    'marked_by' => $validated['marked_by'] ?? auth()->id(),
                ]);
                $created[] = $existing;
            } else {
                $attendance = Attendance::create([
                    'code' => 'att-'.$att['student_id'].'-'.$validated['salle_id'].'-'.$validated['date'],
                    'student_id' => $att['student_id'],
                    'salle_id' => $validated['salle_id'],
                    'room_id' => $salle->room_id,
                    'date' => $validated['date'],
                    'heure_appel' => $att['heure_appel'] ?? now()->format('H:i'),
                    'present' => $att['present'],
                    'marked_by' => $validated['marked_by'] ?? auth()->id(),
                    'school_year_id' => $schoolYearId,
                ]);
                $created[] = $attendance;
            }
        }

        return response()->json([
            'message' => 'Appel enregistré avec succès.',
            'attendances' => $created,
        ], 201);
    }

    public function teacherIndex(Request $request)
    {
        $validated = $request->validate([
            'date' => ['nullable', 'date'],
        ]);
        $date = $validated['date'] ?? now()->toDateString();

        $attendanceByTeacher = TenantDB::table('teacher_attendances')
            ->where('date', $date)
            ->get()
            ->keyBy('teacher_id');

        $teachers = TenantDB::table('users')
            ->select('id', 'name', 'email')
            ->whereNull('deleted_at')
            ->where(function ($query) {
                $query->where('is_teacher', true)->orWhere('role', 'teacher');
            })
            ->orderBy('name')
            ->get()
            ->map(function ($teacher) use ($attendanceByTeacher) {
                $attendance = $attendanceByTeacher->get($teacher->id);

                return [
                    'id' => (string) $teacher->id,
                    'name' => $teacher->name,
                    'email' => $teacher->email,
                    'present' => $attendance === null ? null : (bool) $attendance->present,
                    'markedAt' => $attendance?->updated_at,
                ];
            })
            ->values();

        return response()->json(['date' => $date, 'teachers' => $teachers]);
    }

    public function storeTeacherAttendance(Request $request)
    {
        $validated = $request->validate([
            'teacher_id' => ['required', TenantRules::exists('users')],
            'date' => ['required', 'date'],
            'present' => ['required', 'boolean'],
        ]);

        $teacher = TenantDB::table('users')
            ->where('id', $validated['teacher_id'])
            ->whereNull('deleted_at')
            ->where(function ($query) {
                $query->where('is_teacher', true)->orWhere('role', 'teacher');
            })
            ->first();

        if (! $teacher) {
            return response()->json([
                'message' => 'Cet utilisateur n’est pas un enseignant de ce centre.',
            ], 422);
        }

        $attendance = TenantDB::table('teacher_attendances')
            ->where('teacher_id', $teacher->id)
            ->where('date', $validated['date'])
            ->first();
        $now = now();
        $values = [
            'present' => $validated['present'],
            'marked_by' => $request->user()->id,
            'updated_at' => $now,
        ];

        if ($attendance) {
            TenantDB::table('teacher_attendances')
                ->where('teacher_id', $teacher->id)
                ->where('date', $validated['date'])
                ->update($values);
        } else {
            TenantDB::table('teacher_attendances')->insert([
                ...$values,
                'teacher_id' => $teacher->id,
                'date' => $validated['date'],
                'created_at' => $now,
            ]);
        }

        return response()->json([
            'message' => 'Présence de l’enseignant enregistrée.',
            'teacher' => [
                'id' => (string) $teacher->id,
                'name' => $teacher->name,
                'email' => $teacher->email,
                'present' => (bool) $validated['present'],
                'markedAt' => $now->toDateTimeString(),
            ],
        ]);
    }
}
