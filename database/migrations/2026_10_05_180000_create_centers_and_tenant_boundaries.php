<?php

use App\Support\TenantDB;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('centers', function (Blueprint $table) {
            $table->id();
            $table->string('name', 180);
            $table->string('slug', 200)->unique();
            $table->string('director_name', 180);
            $table->string('status', 20)->default('active');
            $table->timestamp('archived_at')->nullable();
            $table->unsignedBigInteger('created_by')->nullable();
            $table->timestamps();
            $table->index(['status', 'archived_at']);
        });

        Schema::create('platform_audit_logs', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('actor_id')->nullable();
            $table->unsignedBigInteger('center_id')->nullable();
            $table->string('actor_name')->nullable();
            $table->string('action', 80);
            $table->string('method', 10)->nullable();
            $table->string('path', 512)->nullable();
            $table->unsignedSmallInteger('status_code')->nullable();
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamp('created_at')->useCurrent();
            $table->index(['center_id', 'created_at']);
            $table->index(['actor_id', 'created_at']);
        });

        Schema::create('platform_settings', function (Blueprint $table) {
            $table->string('key', 80)->primary();
            $table->text('value')->nullable();
            $table->unsignedBigInteger('updated_by')->nullable();
            $table->timestamps();
            $table->foreign('updated_by')->references('id')->on('users')->nullOnDelete();
        });

        Schema::table('centers', function (Blueprint $table) {
            $table->foreign('created_by')->references('id')->on('users')->nullOnDelete();
        });
        Schema::table('platform_audit_logs', function (Blueprint $table) {
            $table->foreign('actor_id')->references('id')->on('users')->nullOnDelete();
            $table->foreign('center_id')->references('id')->on('centers')->nullOnDelete();
        });

        foreach (TenantDB::registeredTables() as $tableName) {
            Schema::table($tableName, function (Blueprint $table) {
                $table->foreignId('center_id')->nullable()->constrained('centers')->restrictOnDelete();
                $table->index('center_id');
            });
        }

        $hasLegacyData = collect(TenantDB::registeredTables())->contains(
            fn (string $tableName) => $tableName === 'users'
                ? DB::table('users')->where('role', '!=', 'superadmin')->exists()
                : DB::table($tableName)->exists(),
        );

        if ($hasLegacyData) {
            $now = now();
            $legacyCenterId = DB::table('centers')->insertGetId([
                'name' => config('app.name', 'Centre scolaire'),
                'slug' => 'centre-historique-'.Str::lower(Str::random(8)),
                'director_name' => 'Direction',
                'status' => 'active',
                'created_at' => $now,
                'updated_at' => $now,
            ]);

            foreach (TenantDB::registeredTables() as $tableName) {
                $legacyRows = DB::table($tableName)->whereNull('center_id');
                if ($tableName === 'users') {
                    $legacyRows->where('role', '!=', 'superadmin');
                }
                $legacyRows->update(['center_id' => $legacyCenterId]);
            }
        }

        foreach (['users', 'salles', 'students', 'tarifs', 'inscriptions', 'payments', 'timetable_slots', 'attendances', 'evaluations', 'audit_logs', 'notification_logs'] as $tableName) {
            Schema::table($tableName, function (Blueprint $table) {
                $table->dropUnique(['code']);
                $table->unique(['center_id', 'code']);
            });
        }

        Schema::table('application_notifications', function (Blueprint $table) {
            $table->dropUnique(['dedupe_key']);
            $table->unique(['center_id', 'dedupe_key']);
        });

        if (DB::getDriverName() === 'pgsql') {
            DB::statement('ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "users_role_check"');
        }

        Schema::table('users', function (Blueprint $table) {
            $table->boolean('must_change_password')->default(false);
            $table->string('role', 20)->default('teacher')->change();
        });

        Schema::table('school_years', function (Blueprint $table) {
            $table->dropUnique(['code']);
            $table->unique(['center_id', 'code']);
        });

        Schema::table('subjects', function (Blueprint $table) {
            $table->dropUnique(['name']);
            $table->dropUnique(['slug']);
            $table->unique(['center_id', 'name']);
            $table->unique(['center_id', 'slug']);
        });
    }

    public function down(): void
    {
        Schema::table('application_notifications', function (Blueprint $table) {
            $table->dropUnique(['center_id', 'dedupe_key']);
        });
        foreach (['users', 'salles', 'students', 'tarifs', 'inscriptions', 'payments', 'timetable_slots', 'attendances', 'evaluations', 'audit_logs', 'notification_logs'] as $tableName) {
            Schema::table($tableName, function (Blueprint $table) {
                $table->dropUnique(['center_id', 'code']);
            });
        }
        Schema::table('subjects', function (Blueprint $table) {
            $table->dropUnique(['center_id', 'name']);
            $table->dropUnique(['center_id', 'slug']);
        });
        Schema::table('school_years', function (Blueprint $table) {
            $table->dropUnique(['center_id', 'code']);
        });

        foreach (TenantDB::registeredTables() as $tableName) {
            Schema::table($tableName, function (Blueprint $table) {
                $table->dropConstrainedForeignId('center_id');
            });
        }

        Schema::table('application_notifications', function (Blueprint $table) {
            $table->unique('dedupe_key');
        });
        foreach (['users', 'salles', 'students', 'tarifs', 'inscriptions', 'payments', 'timetable_slots', 'attendances', 'evaluations', 'audit_logs', 'notification_logs'] as $tableName) {
            Schema::table($tableName, function (Blueprint $table) {
                $table->unique('code');
            });
        }
        Schema::table('school_years', function (Blueprint $table) {
            $table->unique('code');
        });
        Schema::table('subjects', function (Blueprint $table) {
            $table->unique('name');
            $table->unique('slug');
        });

        Schema::dropIfExists('platform_audit_logs');
        Schema::dropIfExists('platform_settings');
        Schema::dropIfExists('centers');
    }
};
