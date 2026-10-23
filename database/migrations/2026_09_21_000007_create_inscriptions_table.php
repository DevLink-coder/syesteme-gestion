<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('inscriptions', function (Blueprint $table) {
            $table->id();
            $table->string('code')->unique()->comment('Ex: ins-s01-2026');
            $table->foreignId('student_id')->constrained('students')->cascadeOnDelete();
            $table->foreignId('salle_id')->constrained('salles')->cascadeOnDelete();
            $table->foreignId('school_year_id')->constrained('school_years')->cascadeOnDelete();
            $table->foreignId('tarif_id')->constrained('tarifs')->cascadeOnDelete();
            $table->enum('statut', ['En attente de paiement', 'Validée', 'En pause'])->default('En attente de paiement')->comment('EF-20b, RG-09');
            $table->date('date_inscription')->comment('Pour prorata EF-18');
            $table->timestamp('validated_at')->nullable()->comment('Date validation paiement inscription');
            $table->timestamp('paused_at')->nullable();
            $table->timestamp('reactivated_at')->nullable();
            $table->text('pause_reason')->nullable();
            $table->timestamps();

            $table->index(['student_id', 'school_year_id']);
            $table->index(['salle_id', 'school_year_id']);
            $table->index('statut');
            $table->index('date_inscription');
            // Un élève ne peut avoir qu'une inscription par année scolaire (RG-06)
            $table->unique(['student_id', 'school_year_id'], 'inscription_student_year_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('inscriptions');
    }
};
