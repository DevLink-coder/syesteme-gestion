<?php

namespace Database\Seeders;

use App\Support\TenantDB;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class SubjectSeeder extends Seeder
{
    public function run(): void
    {
        $subjects = [
            'Mathématiques', 'Français', 'Anglais', 'Physique', 'Chimie', 'SVT',
            'Histoire-Géo', 'EPS', 'Informatique', 'Espagnol', 'Allemand',
            'Physique-Chimie-Technologie', 'Français/Philosophie', 'ECM',
        ];

        foreach ($subjects as $name) {
            TenantDB::table('subjects')->updateOrInsert(
                ['name' => $name],
                [
                    'slug' => Str::slug($name),
                    'description' => "Matière $name - GEC",
                    'created_at' => now(),
                    'updated_at' => now(),
                ]
            );
        }
    }
}
