<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('school_years', function (Blueprint $table) {
            $table->id();
            $table->string('code')->unique()->comment('Ex: 2026-2027'); // id métier
            $table->string('label'); // Ex: 2026—2027
            $table->date('start_date');
            $table->date('end_date');
            $table->boolean('is_active')->default(false)->comment('Une seule active à la fois');
            $table->boolean('is_archived')->default(false);
            $table->timestamps();

            $table->index('is_active');
            $table->index('is_archived');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('school_years');
    }
};
