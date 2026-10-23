<?php

namespace App\Models;

use App\Models\Concerns\BelongsToCenter;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property string $code
 * @property int $student_id
 * @property int $salle_id
 * @property int $school_year_id
 * @property int $tarif_id
 * @property string $statut
 * @property Carbon $date_inscription
 * @property int|null $nombre_mois
 */
class Inscription extends Model
{
    use BelongsToCenter, SoftDeletes;

    protected $fillable = ['code', 'student_id', 'salle_id', 'school_year_id', 'tarif_id', 'statut', 'date_inscription', 'nombre_mois', 'validated_at', 'paused_at', 'reactivated_at', 'pause_reason'];

    protected $casts = ['date_inscription' => 'date', 'validated_at' => 'datetime', 'paused_at' => 'datetime', 'reactivated_at' => 'datetime'];

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    public function salle(): BelongsTo
    {
        return $this->belongsTo(Salle::class);
    }

    public function schoolYear(): BelongsTo
    {
        return $this->belongsTo(SchoolYear::class);
    }

    public function tarif(): BelongsTo
    {
        return $this->belongsTo(Tarif::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class);
    }
}
