<?php

namespace Database\Seeders;

use App\Support\TenantDB;
use Illuminate\Database\Seeder;

class SalleSubjectSeeder extends Seeder
{
    public function run(): void
    {
        $map = [
            'troisieme' => [
                ['Mathématiques', 4, false], ['Français', 4, false], ['Anglais', 3, false],
                ['Physique-Chimie-Technologie', 2, false], ['SVT', 2, false], ['ECM', 2, false],
                ['EPS', 1, false], ['Espagnol', 2, true], ['Allemand', 2, true],
            ],
            'secondeC' => [
                ['Mathématiques', 4, false], ['Physique-Chimie-Technologie', 3, false], ['SVT', 2, false],
                ['Français', 3, false], ['Anglais', 2, false], ['Histoire-Géo', 2, false],
                ['Informatique', 1, false], ['EPS', 1, false],
            ],
            'premiereC' => [
                ['Mathématiques', 6, false], ['Physique', 5, false], ['Chimie', 4, false],
                ['SVT', 2, false], ['Français/Philosophie', 2, false], ['Anglais', 2, false],
                ['Histoire-Géo', 2, false], ['Informatique', 2, false], ['EPS', 1, false],
            ],
            'premiereD' => [
                ['Mathématiques', 4, false], ['SVT', 5, false], ['Physique', 4, false],
                ['Chimie', 4, false], ['Français/Philosophie', 2, false], ['Anglais', 2, false],
                ['Histoire-Géo', 2, false], ['Informatique', 2, false], ['EPS', 1, false],
            ],
            'terminaleC' => [
                ['Mathématiques', 6, false], ['Physique', 5, false], ['Chimie', 4, false],
                ['SVT', 2, false], ['Français/Philosophie', 2, false], ['Anglais', 2, false],
                ['Histoire-Géo', 2, false], ['Informatique', 2, false], ['EPS', 1, false],
            ],
            'terminaleD' => [
                ['Mathématiques', 4, false], ['SVT', 5, false], ['Physique', 4, false],
                ['Chimie', 4, false], ['Français/Philosophie', 2, false], ['Anglais', 2, false],
                ['Histoire-Géo', 2, false], ['Informatique', 2, false], ['EPS', 1, false],
            ],
        ];

        foreach ($map as $roomId => $subjects) {
            $salles = TenantDB::table('salles')->where('room_id', $roomId)->get();
            foreach ($salles as $salle) {
                foreach ($subjects as [$name, $coef, $opt]) {
                    $subjectId = TenantDB::table('subjects')->where('name', $name)->value('id');
                    if (! $subjectId) {
                        continue;
                    }
                    TenantDB::table('salle_subject')->updateOrInsert(
                        ['salle_id' => $salle->id, 'subject_id' => $subjectId],
                        ['coefficient' => $coef, 'is_optional' => $opt, 'created_at' => now(), 'updated_at' => now()]
                    );
                }
            }
        }
    }
}
