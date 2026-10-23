<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('audit_logs', function (Blueprint $table) {
            $table->id();
            $table->string('code')->unique()->comment('Ex: audit-15');
            $table->foreignId('author_id')->nullable()->constrained('users')->nullOnDelete()->comment('EF-30');
            $table->string('author_name')->comment('Dénormalisé');
            $table->timestamp('happened_at')->comment('Date de l\'action');
            $table->enum('type', ['modification_note', 'modification_paiement', 'changement_statut'])->comment('EF-30');
            $table->string('entity')->comment('Ex: Paiement — Yannick Kouadio');
            $table->string('school_year_code')->comment('Année cloisonnée EF-31');
            $table->foreignId('school_year_id')->nullable()->constrained('school_years')->nullOnDelete();
            $table->text('old_value')->nullable()->comment('Valeur avant');
            $table->text('new_value')->nullable()->comment('Valeur après');
            $table->text('details')->nullable();
            $table->string('auditable_type')->nullable()->comment('Polymorphique: Payment, Grade, User...');
            $table->unsignedBigInteger('auditable_id')->nullable();
            $table->timestamps();

            $table->index(['author_id', 'happened_at']);
            $table->index('type');
            $table->index('school_year_code');
            $table->index(['auditable_type', 'auditable_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('audit_logs');
    }
};
