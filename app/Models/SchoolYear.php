<?php

namespace App\Models;

use App\Models\Concerns\BelongsToCenter;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property string $code
 * @property string $label
 * @property Carbon|null $start_date
 * @property Carbon|null $end_date
 * @property bool $is_active
 * @property bool $is_archived
 */
class SchoolYear extends Model
{
    use BelongsToCenter, SoftDeletes;

    protected $fillable = ['code', 'label', 'start_date', 'end_date', 'is_active', 'is_archived'];

    protected $casts = ['start_date' => 'date', 'end_date' => 'date', 'is_active' => 'boolean', 'is_archived' => 'boolean'];

    public function salles(): HasMany
    {
        return $this->hasMany(Salle::class);
    }

    public function tarifs(): HasMany
    {
        return $this->hasMany(Tarif::class);
    }

    public function inscriptions(): HasMany
    {
        return $this->hasMany(Inscription::class);
    }

    public function evaluations(): HasMany
    {
        return $this->hasMany(Evaluation::class);
    }
}
