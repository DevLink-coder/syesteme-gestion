<?php

namespace App\Models;

use App\Models\Concerns\BelongsToCenter;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class Tarif extends Model
{
    use BelongsToCenter, SoftDeletes;

    protected $fillable = ['code', 'salle_id', 'school_year_id', 'frais_inscription', 'mensualite', 'nombre_mois'];

    public function salle(): BelongsTo
    {
        return $this->belongsTo(Salle::class);
    }

    public function schoolYear(): BelongsTo
    {
        return $this->belongsTo(SchoolYear::class);
    }
}
