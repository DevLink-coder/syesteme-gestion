<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Laravel a déjà une table notifications pour les Notifiable, on crée notification_logs pour métier
        Schema::create('notification_logs', function (Blueprint $table) {
            $table->id();
            $table->string('code')->unique();
            $table->foreignId('student_id')->nullable()->constrained('students')->nullOnDelete()->comment('Élève concerné EF-28');
            $table->string('recipient_name')->nullable();
            $table->string('recipient_whatsapp')->nullable();
            $table->string('recipient_phone')->nullable();
            $table->enum('channel', ['sms', 'whatsapp'])->comment('EF-29, interchangeable');
            $table->enum('provider', ['twilio', '360dialog', 'africas_talking', 'manual'])->default('manual');
            $table->enum('type', ['absence', 'rappel_paiement', 'bulletin_disponible', 'autre'])->comment('EF-28');
            $table->text('content');
            $table->enum('status', ['en_attente', 'envoyé', 'échec', 'livré'])->default('en_attente');
            $table->integer('attempts')->default(0)->comment('EF 9.3 retry');
            $table->text('provider_response')->nullable();
            $table->timestamp('sent_at')->nullable();
            $table->timestamp('delivered_at')->nullable();
            $table->foreignId('school_year_id')->nullable()->constrained('school_years')->nullOnDelete();
            $table->timestamps();

            $table->index(['student_id', 'type']);
            $table->index('channel');
            $table->index('status');
            $table->index('school_year_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('notification_logs');
    }
};
