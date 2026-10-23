<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('students')->orderBy('id')->get(['id', 'center_id', 'code', 'parent_whatsapp'])
            ->each(function (object $student): void {
                do {
                    $code = (string) random_int(100_000_000, 999_999_999);
                } while (DB::table('students')->where('center_id', $student->center_id)
                    ->where('code', $code)->exists());

                $digits = preg_replace('/\D+/', '', (string) $student->parent_whatsapp) ?? '';
                if (str_starts_with($digits, '237') && strlen($digits) === 12) {
                    $digits = substr($digits, 3);
                }

                $updates = ['code' => $code];
                if (preg_match('/^6\d{8}$/', $digits)) {
                    $updates['parent_whatsapp'] = '+237'.$digits;
                }

                DB::table('students')->where('id', $student->id)->update($updates);
            });

        DB::table('users')->whereNotNull('telephone')->orderBy('id')
            ->get(['id', 'center_id', 'telephone'])
            ->each(function (object $user): void {
                $digits = preg_replace('/\D+/', '', (string) $user->telephone) ?? '';
                if (str_starts_with($digits, '237') && strlen($digits) === 12) {
                    $digits = substr($digits, 3);
                }

                if (preg_match('/^6\d{8}$/', $digits)) {
                    DB::table('users')->where('id', $user->id)
                        ->update(['telephone' => '+237'.$digits]);
                }
            });
    }

    public function down(): void
    {
        // Random public codes and canonical phone values cannot be safely reversed.
    }
};
