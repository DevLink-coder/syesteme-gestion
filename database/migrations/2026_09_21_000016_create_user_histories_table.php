<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('user_histories', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete()->comment('EF-01 historique rôles/statuts');
            $table->enum('role', ['admin', 'teacher'])->nullable();
            $table->enum('status', ['active', 'suspended', 'expelled'])->nullable();
            $table->string('changed_by_name')->nullable();
            $table->foreignId('changed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->text('reason')->nullable();
            $table->timestamp('changed_at');
            $table->timestamps();

            $table->index(['user_id', 'changed_at']);
        });

        Schema::create('teacher_subject', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete()->comment('Enseignant');
            $table->foreignId('subject_id')->constrained('subjects')->cascadeOnDelete();
            $table->string('room_id')->comment('Salle où il enseigne la matière');
            $table->decimal('coefficient', 4, 2)->default(1);
            $table->timestamps();

            $table->unique(['user_id', 'subject_id', 'room_id']);
            $table->index('room_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('teacher_subject');
        Schema::dropIfExists('user_histories');
    }
};
