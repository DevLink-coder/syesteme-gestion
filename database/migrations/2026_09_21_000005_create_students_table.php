<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('students', function (Blueprint $table) {
            $table->id();
            $table->string('code')->unique()->comment('Ex: s01, s02 (mock)');
            $table->string('name');
            $table->string('parent_name');
            $table->string('parent_whatsapp')->comment('+237 6XX XX XX XX');
            $table->string('parent_email')->nullable();
            $table->string('room_id')->nullable()->comment('Dernière salle fréquentée, dénormalisé pour stats rapides');
            $table->enum('enrollment_status', ['validée', 'en pause'])->default('validée')->comment('Statut courant, voir inscriptions pour historique');
            $table->string('language')->nullable()->comment('espagnol / allemand pour Troisième, null sinon');
            $table->string('parent_token')->nullable()->unique()->comment('Token sécurisé EF-32 pour accès parent');
            $table->timestamp('parent_token_expires_at')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index('room_id');
            $table->index('enrollment_status');
            $table->index('language');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('students');
    }
};
