<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('grades', function (Blueprint $table) {
            $table->id();
            $table->foreignId('evaluation_id')->constrained('evaluations')->cascadeOnDelete()->comment('EF-24');
            $table->foreignId('student_id')->constrained('students')->cascadeOnDelete();
            $table->foreignId('subject_id')->constrained('subjects')->cascadeOnDelete();
            $table->string('subject_name')->comment('Dénormalisé');
            $table->decimal('note', 4, 2)->comment('0 à 20, EF-25');
            $table->decimal('coefficient', 4, 2)->comment('EF-26');
            $table->decimal('produit', 6, 2)->storedAs('note * coefficient')->comment('Pour moyenne pondérée');
            $table->foreignId('graded_by')->nullable()->constrained('users')->nullOnDelete()->comment('Enseignant EF-25, offline EF-23');
            $table->timestamp('synced_at')->nullable()->comment('PWA hors-ligne');
            $table->timestamps();

            $table->unique(['evaluation_id', 'student_id', 'subject_id'], 'grade_eval_student_subject_unique');
            $table->index(['evaluation_id', 'student_id']);
            $table->index('subject_id');
            $table->index('note');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('grades');
    }
};
