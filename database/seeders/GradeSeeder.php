<?php

namespace Database\Seeders;

use App\Support\TenantDB;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class GradeSeeder extends Seeder
{
    public function run(): void
    {
        // Données mock evaluations.ts
        $grades = [
            'ev-troisieme' => [
                's01' => ['Mathématiques' => [14, 4], 'Français' => [13, 4], 'Anglais' => [15, 3], 'Physique-Chimie-Technologie' => [12, 2], 'SVT' => [13, 2], 'ECM' => [14, 2], 'EPS' => [16, 1], 'Espagnol' => [15, 2]],
                's02' => ['Mathématiques' => [12, 4], 'Français' => [11, 4], 'Anglais' => [13, 3], 'Physique-Chimie-Technologie' => [11, 2], 'SVT' => [12, 2], 'ECM' => [12, 2], 'EPS' => [14, 1], 'Allemand' => [13, 2]],
            ],
            'ev-secondeC' => [
                's03' => ['Mathématiques' => [14, 4], 'Physique-Chimie-Technologie' => [12, 3], 'SVT' => [13, 2], 'Français' => [15, 3], 'Anglais' => [14, 2], 'Histoire-Géo' => [13, 2], 'Informatique' => [12, 1], 'EPS' => [14, 1]],
                's04' => ['Mathématiques' => [11, 4], 'Physique-Chimie-Technologie' => [10, 3], 'SVT' => [12, 2], 'Français' => [12, 3], 'Anglais' => [13, 2], 'Histoire-Géo' => [11, 2], 'Informatique' => [10, 1], 'EPS' => [13, 1]],
            ],
            'ev-premiereC' => [
                's05' => ['Mathématiques' => [17, 6], 'Physique' => [16, 5], 'Chimie' => [15, 4], 'SVT' => [14, 2], 'Français/Philosophie' => [13, 2], 'Anglais' => [12, 2], 'Histoire-Géo' => [11, 2], 'Informatique' => [10, 2], 'EPS' => [14, 1]],
            ],
        ];

        $teacherId = TenantDB::table('users')->where('code', 't-01')->value('id');

        foreach ($grades as $evalCode => $students) {
            $evalId = TenantDB::table('evaluations')->where('code', $evalCode)->value('id');
            if (! $evalId) {
                continue;
            }
            foreach ($students as $studentCode => $matieres) {
                $studentId = TenantDB::table('students')->where('code', $studentCode)->value('id');
                if (! $studentId) {
                    continue;
                }
                foreach ($matieres as $matiere => $coefArr) {
                    [$note, $coef] = $coefArr;
                    $subjectId = TenantDB::table('subjects')->where('name', $matiere)->value('id');
                    if (! $subjectId) {
                        // Crée la matière si manquante
                        $subjectId = TenantDB::table('subjects')->insertGetId(['name' => $matiere, 'slug' => Str::slug($matiere), 'created_at' => now(), 'updated_at' => now()]);
                    }
                    TenantDB::table('grades')->updateOrInsert(
                        ['evaluation_id' => $evalId, 'student_id' => $studentId, 'subject_id' => $subjectId],
                        [
                            'subject_name' => $matiere,
                            'note' => $note,
                            'coefficient' => $coef,
                            'graded_by' => $teacherId,
                            'created_at' => now(),
                            'updated_at' => now(),
                        ]
                    );
                }
            }
        }
    }
}
