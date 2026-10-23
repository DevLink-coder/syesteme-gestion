<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('timetable_slots', function (Blueprint $table) {
            $table->id();
            $table->string('code')->unique()->comment('Ex: sl-01');
            $table->foreignId('salle_id')->constrained('salles')->cascadeOnDelete();
            $table->string('room_id')->comment('Dénormalisé: troisieme, secondeC...');
            $table->enum('day', ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']);
            $table->time('start_time');
            $table->time('end_time');
            $table->foreignId('subject_id')->constrained('subjects')->cascadeOnDelete();
            $table->string('subject_name')->comment('Dénormalisé pour historique');
            $table->foreignId('teacher_id')->constrained('users')->cascadeOnDelete()->comment('Enseignant assigné, RG-03');
            $table->date('week_start')->nullable()->comment('Lundi ISO de la semaine, null = récurrent');
            $table->foreignId('school_year_id')->constrained('school_years')->cascadeOnDelete()->comment('RG-06 cloisonnement');
            $table->timestamps();

            $table->index(['salle_id', 'day', 'start_time']);
            $table->index(['teacher_id', 'day', 'start_time']);
            $table->index('week_start');
            $table->index('school_year_id');
            // RG-03: un enseignant ne peut pas avoir deux créneaux qui se chevauchent - contrainte applicative, index pour détection
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('timetable_slots');
    }
};
