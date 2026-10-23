<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('evaluations', function (Blueprint $table) {
            $table->id();
            $table->string('code')->unique()->comment('Ex: ev-troisieme');
            $table->foreignId('salle_id')->nullable()->constrained('salles')->nullOnDelete()->comment('Null si multi-salles EF-24');
            $table->string('room_id')->comment('Dénormalisé');
            $table->string('subject')->comment('Ex: Toutes les matières');
            $table->date('date');
            $table->enum('status', ['en attente', 'notée', 'bulletins générés'])->default('en attente');
            $table->foreignId('school_year_id')->constrained('school_years')->cascadeOnDelete();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['salle_id', 'date']);
            $table->index('room_id');
            $table->index('status');
            $table->index('school_year_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('evaluations');
    }
};
