<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tarifs', function (Blueprint $table) {
            $table->id();
            $table->string('code')->unique()->comment('Ex: tarif-troisieme-2026');
            $table->foreignId('salle_id')->constrained('salles')->cascadeOnDelete();
            $table->foreignId('school_year_id')->constrained('school_years')->cascadeOnDelete();
            $table->unsignedInteger('frais_inscription')->comment('FCFA, EF-14');
            $table->unsignedInteger('mensualite')->comment('FCFA, EF-14');
            $table->timestamps();

            $table->unique(['salle_id', 'school_year_id'], 'tarif_salle_year_unique');
            $table->index('school_year_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tarifs');
    }
};
