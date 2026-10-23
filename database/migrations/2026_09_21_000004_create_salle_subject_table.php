<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('salle_subject', function (Blueprint $table) {
            $table->id();
            $table->foreignId('salle_id')->constrained('salles')->cascadeOnDelete();
            $table->foreignId('subject_id')->constrained('subjects')->cascadeOnDelete();
            $table->decimal('coefficient', 4, 2)->default(1)->comment('EF-08, EF-09');
            $table->boolean('is_optional')->default(false)->comment('Espagnol/Allemand en Troisième');
            $table->timestamps();

            $table->unique(['salle_id', 'subject_id']);
            $table->index('coefficient');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('salle_subject');
    }
};
