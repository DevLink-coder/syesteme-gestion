<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('salles', function (Blueprint $table) {
            $table->id();
            $table->string('code')->unique()->comment('Ex: salle-troisieme-2026');
            $table->string('room_id')->comment('Enum: troisieme, secondeC, premiereC, premiereD, terminaleC, terminaleD');
            $table->string('name'); // Ex: Troisième
            $table->foreignId('school_year_id')->constrained('school_years')->cascadeOnDelete();
            $table->foreignId('principal_teacher_id')->nullable()->constrained('users')->nullOnDelete()->comment('Enseignant principal');
            $table->enum('status', ['active', 'archivée'])->default('active');
            $table->timestamp('archived_at')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index('room_id');
            $table->index('status');
            $table->index(['school_year_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('salles');
    }
};
