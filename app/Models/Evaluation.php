<?php

namespace App\Models;

use App\Models\Concerns\BelongsToCenter;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Evaluation extends Model
{
    use BelongsToCenter, SoftDeletes;

    protected $fillable = ['code', 'title', 'salle_id', 'room_id', 'subject', 'date', 'status', 'school_year_id', 'created_by'];

    protected $casts = ['date' => 'date'];

    public function salle(): BelongsTo
    {
        return $this->belongsTo(Salle::class);
    }

    public function salles(): BelongsToMany
    {
        return $this->belongsToMany(Salle::class, 'evaluation_salle')->withTimestamps();
    }

    public function grades(): HasMany
    {
        return $this->hasMany(Grade::class);
    }
}
