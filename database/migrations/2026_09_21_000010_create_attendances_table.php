<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('attendances', function (Blueprint $table) {
            $table->id();
            $table->string('code')->unique()->comment('Ex: att-1');
            $table->foreignId('student_id')->constrained('students')->cascadeOnDelete();
            $table->foreignId('salle_id')->constrained('salles')->cascadeOnDelete();
            $table->foreignId('timetable_slot_id')->nullable()->constrained('timetable_slots')->nullOnDelete()->comment('Créneau concerné EF-21');
            $table->string('room_id')->comment('Dénormalisé');
            $table->date('date')->comment('Date de l\'appel');
            $table->time('heure_appel')->nullable()->comment('HH:MM');
            $table->boolean('present')->comment('EF-21');
            $table->enum('whatsapp_status', ['Envoyé', 'Échec', 'En attente'])->nullable()->comment('EF-22');
            $table->timestamp('synced_at')->nullable()->comment('PWA hors-ligne EF-23');
            $table->foreignId('marked_by')->nullable()->constrained('users')->nullOnDelete()->comment('Enseignant ayant fait l\'appel');
            $table->foreignId('school_year_id')->constrained('school_years')->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['student_id', 'timetable_slot_id', 'date'], 'attendance_student_slot_date_unique');
            $table->index(['salle_id', 'date']);
            $table->index(['room_id', 'date']);
            $table->index('present');
            $table->index('school_year_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('attendances');
    }
};
