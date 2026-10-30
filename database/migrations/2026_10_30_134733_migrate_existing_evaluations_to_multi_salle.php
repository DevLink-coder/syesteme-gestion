<?php

use App\Models\Evaluation;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Migrate existing evaluations to the new multi-salle structure
        // For each evaluation with a salle_id, create a record in evaluation_salle
        DB::table('evaluations')
            ->whereNotNull('salle_id')
            ->orderBy('id')
            ->chunk(100, function ($evaluations) {
                foreach ($evaluations as $evaluation) {
                    DB::table('evaluation_salle')->insert([
                        'evaluation_id' => $evaluation->id,
                        'salle_id' => $evaluation->salle_id,
                        'created_at' => $evaluation->created_at,
                        'updated_at' => $evaluation->updated_at,
                    ]);
                }
            });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Remove all evaluation_salle records
        DB::table('evaluation_salle')->truncate();
    }
};
