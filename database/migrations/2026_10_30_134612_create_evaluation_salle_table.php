<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('evaluation_salle', function (Blueprint $table) {
            $table->foreignId('evaluation_id')->constrained('evaluations')->cascadeOnDelete();
            $table->foreignId('salle_id')->constrained('salles')->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['evaluation_id', 'salle_id']);
            $table->index('evaluation_id');
            $table->index('salle_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('evaluation_salle');
    }
};
