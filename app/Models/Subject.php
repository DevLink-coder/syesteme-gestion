<?php

namespace App\Models;

use App\Models\Concerns\BelongsToCenter;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Subject extends Model
{
    use BelongsToCenter, SoftDeletes;

    protected $fillable = ['name', 'slug', 'description'];

    public function salles(): BelongsToMany
    {
        return $this->belongsToMany(Salle::class, 'salle_subject')->withPivot(['coefficient', 'is_optional'])->withTimestamps();
    }
}
