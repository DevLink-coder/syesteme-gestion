<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payments', function (Blueprint $table) {
            $table->id();
            $table->string('code')->unique()->comment('Ex: p-001-s01');
            $table->foreignId('student_id')->constrained('students')->cascadeOnDelete();
            $table->foreignId('inscription_id')->constrained('inscriptions')->cascadeOnDelete()->comment('Paiement rattaché à une inscription précise (année cloisonnée RG-06)');
            $table->enum('type', ['inscription', 'mensualité'])->comment('EF-14, EF-18');
            $table->unsignedInteger('amount')->comment('Montant versé FCFA');
            $table->unsignedInteger('expected_amount')->comment('Montant dû pour la période (pour calculer prorata)');
            $table->unsignedInteger('solde_du')->default(0)->comment('Dette restante après paiement');
            $table->enum('status', ['payé', 'partiel', 'impayé'])->default('payé')->comment('EF-18, RG-08');
            $table->date('due_date')->nullable()->comment('Date d\'échéance (mensualité)');
            $table->date('paid_at')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete()->comment('Auteur EF-30');
            $table->timestamps();

            $table->index(['student_id', 'type']);
            $table->index(['inscription_id', 'type']);
            $table->index('status');
            $table->index('due_date');
            $table->index('paid_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payments');
    }
};
