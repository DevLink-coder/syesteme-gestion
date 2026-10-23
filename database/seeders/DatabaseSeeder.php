<?php

namespace Database\Seeders;

use App\Support\TenantContext;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call(SuperAdminSeeder::class);

        $centerId = DB::table('centers')->value('id');
        if (! $centerId) {
            return;
        }

        TenantContext::run((int) $centerId, function (): void {
            $this->call([
                SchoolYearSeeder::class,
                SubjectSeeder::class,
                UserSeeder::class,
                SalleSeeder::class,
                SalleSubjectSeeder::class,
                TeacherSubjectSeeder::class,
            ]);
        });
    }
}
