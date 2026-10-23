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
        Schema::create('admin_promotions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('promoter_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('promoted_user_id')->constrained('users')->onDelete('cascade');
            $table->timestamp('promoted_at');
            $table->timestamps();

            $table->unique(['promoter_id', 'promoted_user_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('admin_promotions');
    }
};
