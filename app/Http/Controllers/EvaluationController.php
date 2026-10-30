<?php

namespace App\Http\Controllers;

use App\Models\Evaluation;
use App\Models\Grade;
use App\Models\Inscription;
use App\Models\Salle;
use App\Models\Student;
use App\Support\TenantDB;
use App\Support\TenantRules;
use Illuminate\Http\Request;

class EvaluationController extends Controller
{
    public function index(Request $request)
    {
        $schoolYearId = $request->query('school_year_id');

        $query = Evaluation::query()
            ->with(['salle', 'grades.student'])
            ->orderBy('date', 'desc')
            ->orderBy('created_at', 'desc');

        if ($schoolYearId) {
            $query->where('school_year_id', $schoolYearId);
        }

        $evaluations = $query->get();

        $data = $evaluations->map(function ($evaluation) {
            $nbMatieres = $evaluation->subject
                ? count(explode(',', $evaluation->subject))
                : 0;
            $nbEleves = $evaluation->grades->count();
            $isPending = $nbEleves === 0;

            return [
                'id' => (string) $evaluation->id,
                'title' => $evaluation->title,
                'salleId' => (string) $evaluation->salle_id,
                'roomId' => $evaluation->room_id,
                'salleName' => $evaluation->salle?->name,
                'date' => $evaluation->date?->format('Y-m-d'),
                'subject' => $evaluation->subject,
                'status' => $evaluation->status,
                'nbMatieres' => $nbMatieres,
                'nbEleves' => $nbEleves,
                'isPending' => $isPending,
                'schoolYearId' => (string) $evaluation->school_year_id,
            ];
        });

        return response()->json([
            'data' => $data,
            'evaluations' => $data,
        ]);
    }

    public function show(Request $request, $id)
    {
        $evaluation = Evaluation::with(['salle', 'grades.student', 'grades.subject'])
            ->findOrFail($id);

        // Group grades by student and calculate averages
        $studentsData = collect();
        if ($evaluation->grades->isNotEmpty()) {
            $studentsData = $evaluation->grades->groupBy('student_id')->map(function ($grades) use ($evaluation) {
                $student = $grades->first()->student;
                if (! $student) {
                    return null;
                }
                $rows = $grades->map(function ($grade) use ($evaluation) {
                    return [
                        'subject' => $grade->subject_name ?: $grade->subject?->name ?: $evaluation->subject ?: 'Matière',
                        'note' => (float) $grade->note,
                        'coefficient' => (float) ($grade->coefficient ?: 1),
                    ];
                })->values();
                $coefficientTotal = $rows->sum('coefficient');
                $weightedTotal = $rows->sum(fn ($row) => $row['note'] * $row['coefficient']);

                return [
                    'id' => (string) $student->id,
                    'name' => $student->name,
                    'salleName' => $evaluation->salle?->name,
                    'rows' => $rows,
                    'totalCoefficient' => $coefficientTotal,
                    'weightedTotal' => $weightedTotal,
                    'average' => $coefficientTotal > 0 ? round($weightedTotal / $coefficientTotal, 2) : null,
                ];
            })->filter()->sortBy('name')->values();
        }

        $gradesData = $evaluation->grades->map(function ($grade) {
            return [
                'id' => (string) $grade->id,
                'studentId' => (string) $grade->student_id,
                'studentName' => $grade->student?->name,
                'subjectId' => $grade->subject_id ? (string) $grade->subject_id : null,
                'subjectName' => $grade->subject_name,
                'note' => (float) $grade->note,
                'coefficient' => (float) $grade->coefficient,
                'gradedBy' => $grade->graded_by,
                'syncedAt' => $grade->synced_at?->format('Y-m-d H:i:s'),
            ];
        });

        return response()->json([
            'evaluation' => [
                'id' => (string) $evaluation->id,
                'title' => $evaluation->title,
                'salleId' => (string) $evaluation->salle_id,
                'roomId' => $evaluation->room_id,
                'salleName' => $evaluation->salle?->name,
                'date' => $evaluation->date?->format('Y-m-d'),
                'subject' => $evaluation->subject,
                'status' => $evaluation->status,
                'schoolYearId' => (string) $evaluation->school_year_id,
            ],
            'students' => $studentsData,
            'grades' => $gradesData,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'salle_id' => ['required', TenantRules::exists('salles')],
            'date' => ['required', 'date'],
            'subjects' => ['required', 'array', 'min:1'],
            'subjects.*' => [
                'required',
                'string',
                'distinct',
                function ($attribute, $value, $fail) use ($request) {
                    $isAssignedToSalle = TenantDB::table('salle_subject')
                        ->join('subjects', 'subjects.id', '=', 'salle_subject.subject_id')
                        ->where('salle_subject.salle_id', $request->input('salle_id'))
                        ->whereNull('subjects.deleted_at')
                        ->where('subjects.name', $value)
                        ->exists();

                    if (! $isAssignedToSalle) {
                        $fail('Une matière sélectionnée n’est pas associée à cette salle.');
                    }
                },
            ],
            'school_year_id' => ['required', TenantRules::exists('school_years')],
        ]);

        $salle = Salle::findOrFail($validated['salle_id']);

        $evaluation = Evaluation::create([
            'code' => 'eval-'.$validated['salle_id'].'-'.$validated['date'].'-'.now()->timestamp,
            'title' => trim($validated['title']),
            'salle_id' => $validated['salle_id'],
            'room_id' => $salle->room_id,
            'date' => $validated['date'],
            'subject' => implode(', ', $validated['subjects']),
            'status' => 'en attente',
            'school_year_id' => $validated['school_year_id'],
            'created_by' => auth()->id(),
        ]);

        return response()->json([
            'message' => 'Évaluation créée avec succès',
            'evaluation' => [
                'id' => (string) $evaluation->id,
                'title' => $evaluation->title,
                'salleId' => (string) $evaluation->salle_id,
                'roomId' => $evaluation->room_id,
                'date' => $evaluation->date?->format('Y-m-d'),
                'subject' => $evaluation->subject,
                'status' => $evaluation->status,
            ],
        ], 201);
    }

    public function grades(Request $request, $evaluationId)
    {
        $evaluation = Evaluation::with(['salle', 'grades.student', 'grades.subject'])
            ->findOrFail($evaluationId);

        // Récupérer les élèves inscrits dans cette salle
        $studentIds = Inscription::query()
            ->where('salle_id', $evaluation->salle_id)
            ->whereIn('statut', ['Validée', 'En attente de paiement'])
            ->pluck('student_id')
            ->toArray();

        $students = Student::whereIn('id', $studentIds)->get();

        $gradesData = $evaluation->grades->keyBy('student_id');

        $studentData = $students->map(function ($student) use ($gradesData, $evaluation) {
            $grade = $gradesData->get($student->id);

            return [
                'id' => (string) $student->id,
                'name' => $student->name,
                'note' => $grade ? (float) $grade->note : null,
                'coefficient' => $grade ? (float) $grade->coefficient : null,
                'subjectName' => $grade ? $grade->subject_name : $evaluation->subject,
                'subjectId' => $grade ? (string) $grade->subject_id : null,
            ];
        });

        return response()->json([
            'evaluation' => [
                'id' => (string) $evaluation->id,
                'title' => $evaluation->title,
                'salleId' => (string) $evaluation->salle_id,
                'salleName' => $evaluation->salle?->name,
                'date' => $evaluation->date?->format('Y-m-d'),
                'subject' => $evaluation->subject,
                'status' => $evaluation->status,
            ],
            'students' => $studentData,
        ]);
    }

    public function storeGrade(Request $request, $evaluationId)
    {
        $validated = $request->validate([
            'student_id' => ['required', TenantRules::exists('students')],
            'subject_id' => ['nullable', TenantRules::exists('subjects')],
            'subject_name' => ['nullable', 'string'],
            'note' => ['required', 'numeric', 'min:0', 'max:20'],
            'coefficient' => ['nullable', 'numeric', 'min:0', 'max:10'],
        ]);

        $evaluation = Evaluation::findOrFail($evaluationId);

        // Use evaluation subject if subject_name is not provided
        $subjectName = $validated['subject_name'] ?? $evaluation->subject;

        $grade = Grade::updateOrCreate(
            [
                'evaluation_id' => $evaluationId,
                'student_id' => $validated['student_id'],
                'subject_id' => $validated['subject_id'] ?? null,
            ],
            [
                'subject_name' => $subjectName,
                'note' => (float) $validated['note'],
                'coefficient' => (float) ($validated['coefficient'] ?? 1),
                'graded_by' => auth()->id(),
                'synced_at' => now(),
            ]
        );

        // Mettre à jour le statut de l'évaluation si toutes les notes sont saisies
        $totalStudents = Inscription::query()
            ->where('salle_id', $evaluation->salle_id)
            ->whereIn('statut', ['Validée', 'En attente de paiement'])
            ->count();
        $gradedStudents = $evaluation->grades()->count();

        if ($gradedStudents >= $totalStudents) {
            $evaluation->update(['status' => 'notée']);
        }

        return response()->json([
            'message' => 'Note enregistrée avec succès',
            'grade' => [
                'id' => (string) $grade->id,
                'note' => (float) $grade->note,
                'coefficient' => (float) $grade->coefficient,
            ],
        ]);
    }
}
