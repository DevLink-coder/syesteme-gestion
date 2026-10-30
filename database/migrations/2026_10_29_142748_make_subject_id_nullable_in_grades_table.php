<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('grades', function (Blueprint $table) {
            // Drop the unique constraint first
            $table->dropUnique('grade_eval_student_subject_unique');

            // Make subject_id nullable
            $table->foreignId('subject_id')->nullable()->change();

            // Recreate the unique constraint (MySQL treats NULL as distinct in unique constraints)
            $table->unique(['evaluation_id', 'student_id', 'subject_id'], 'grade_eval_student_subject_unique');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('grades', function (Blueprint $table) {
            // Delete any records with null subject_id before making it not nullable
            DB::table('grades')->whereNull('subject_id')->delete();

            // Drop the unique constraint
            $table->dropUnique('grade_eval_student_subject_unique');

            // Make subject_id not nullable again
            $table->foreignId('subject_id')->constrained('subjects')->cascadeOnDelete()->change();

            // Recreate the original unique constraint
            $table->unique(['evaluation_id', 'student_id', 'subject_id'], 'grade_eval_student_subject_unique');
        });
    }
};
