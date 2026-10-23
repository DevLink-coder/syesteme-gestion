<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('code')->unique()->nullable()->after('id')->comment('Ex: admin-001, t-01 (mock)');
            $table->enum('role', ['admin', 'teacher'])->default('teacher')->after('email')->comment('EF-01');
            $table->enum('status', ['active', 'suspended', 'expelled'])->default('active')->after('role')->comment('EF-03, RG-02');
            $table->string('telephone')->nullable()->after('status')->comment('+237 6XX');
            $table->string('avatar')->nullable()->after('telephone');
            $table->boolean('is_admin')->default(false)->after('status')->comment('RG-01 admin unique');
            $table->boolean('is_teacher')->default(true)->after('is_admin')->comment('EF-01 capacité enseignant');
            $table->timestamp('suspended_at')->nullable()->after('status');
            $table->timestamp('expelled_at')->nullable()->after('suspended_at');
            $table->text('status_reason')->nullable()->after('expelled_at');
            $table->softDeletes()->after('remember_token');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['code', 'role', 'status', 'telephone', 'avatar', 'is_admin', 'is_teacher', 'suspended_at', 'expelled_at', 'status_reason', 'deleted_at']);
        });
    }
};
