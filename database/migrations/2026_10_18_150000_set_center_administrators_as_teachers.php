<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('users')
            ->where('role', 'admin')
            ->where('is_teacher', false)
            ->update(['is_teacher' => true]);
    }

    public function down(): void
    {
        // Keep the teacher capability when rolling back; administrators can teach independently of this migration.
    }
};
