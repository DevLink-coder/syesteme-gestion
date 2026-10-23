<?php

namespace Database\Seeders;

use App\Support\TenantDB;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class StudentSeeder extends Seeder
{
    public function run(): void
    {
        $students = [
            ['code' => 's01', 'name' => 'Awa Diallo', 'parent' => 'M. Diallo / Mme Diallo', 'tel' => '+237690000001', 'room' => 'troisieme', 'status' => 'validée', 'lang' => 'espagnol'],
            ['code' => 's02', 'name' => 'Yann Fotso', 'parent' => 'M. Fotso / Mme Fotso', 'tel' => '+237690000002', 'room' => 'troisieme', 'status' => 'validée', 'lang' => 'allemand'],
            ['code' => 's03', 'name' => 'Léa Kamdem', 'parent' => 'M. Kamdem / Mme Kamdem', 'tel' => '+237690000003', 'room' => 'secondeC', 'status' => 'validée', 'lang' => null],
            ['code' => 's04', 'name' => 'Hugo Mbarga', 'parent' => 'M. Mbarga / Mme Mbarga', 'tel' => '+237690000004', 'room' => 'secondeC', 'status' => 'en pause', 'lang' => null],
            ['code' => 's05', 'name' => 'Clara Ngo', 'parent' => 'M. Ngo / Mme Ngo', 'tel' => '+237690000005', 'room' => 'premiereC', 'status' => 'validée', 'lang' => null],
            ['code' => 's06', 'name' => 'Lucas Etoundi', 'parent' => 'M. Etoundi / Mme Etoundi', 'tel' => '+237690000006', 'room' => 'premiereC', 'status' => 'validée', 'lang' => null],
            ['code' => 's07', 'name' => 'Emma Nkomo', 'parent' => 'M. Nkomo / Mme Nkomo', 'tel' => '+237690000007', 'room' => 'premiereD', 'status' => 'validée', 'lang' => null],
            ['code' => 's08', 'name' => 'Noé Tchinda', 'parent' => 'M. Tchinda / Mme Tchinda', 'tel' => '+237690000008', 'room' => 'premiereD', 'status' => 'validée', 'lang' => null],
            ['code' => 's09', 'name' => 'Manon Biya', 'parent' => 'M. Biya / Mme Biya', 'tel' => '+237690000009', 'room' => 'terminaleC', 'status' => 'validée', 'lang' => null],
            ['code' => 's10', 'name' => 'Louis Onana', 'parent' => 'M. Onana / Mme Onana', 'tel' => '+237690000010', 'room' => 'terminaleC', 'status' => 'validée', 'lang' => null],
            ['code' => 's11', 'name' => 'Sarah Etoa', 'parent' => 'M. Etoa / Mme Etoa', 'tel' => '+237690000011', 'room' => 'terminaleD', 'status' => 'validée', 'lang' => null],
            ['code' => 's12', 'name' => 'Marc Essono', 'parent' => 'M. Essono / Mme Essono', 'tel' => '+237690000012', 'room' => 'terminaleD', 'status' => 'validée', 'lang' => null],
            // Élèves supplémentaires pour enrichir (création libre)
            ['code' => 's13', 'name' => 'Chloé Mballa', 'parent' => 'M. Mballa', 'tel' => '+237690000013', 'room' => 'troisieme', 'status' => 'validée', 'lang' => 'espagnol'],
            ['code' => 's14', 'name' => 'Paul Fouda', 'parent' => 'Mme Fouda', 'tel' => '+237690000014', 'room' => 'secondeC', 'status' => 'validée', 'lang' => null],
            ['code' => 's15', 'name' => 'Inès Obama', 'parent' => 'M. Obama', 'tel' => '+237690000015', 'room' => 'premiereC', 'status' => 'validée', 'lang' => null],
        ];

        foreach ($students as $s) {
            $token = Str::random(32);
            TenantDB::table('students')->updateOrInsert(
                ['code' => $s['code']],
                [
                    'name' => $s['name'],
                    'parent_name' => $s['parent'],
                    'parent_whatsapp' => $s['tel'],
                    'room_id' => $s['room'],
                    'enrollment_status' => $s['status'],
                    'language' => $s['lang'],
                    'parent_token' => $token,
                    'parent_token_expires_at' => now()->addMonths(3),
                    'created_at' => now(),
                    'updated_at' => now(),
                ]
            );
        }
    }
}
