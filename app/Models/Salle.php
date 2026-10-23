<?php

namespace App\Models;

use App\Models\Concerns\BelongsToCenter;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * @property int $id
 * @property string $code
 * @property string $room_id
 * @property string $name
 * @property int $school_year_id
 * @property int|null $principal_teacher_id
 * @property string $status
 * @property SchoolYear $schoolYear
 */
class Salle extends Model
{
    use BelongsToCenter, SoftDeletes;

    protected $fillable = ['code', 'room_id', 'name', 'school_year_id', 'principal_teacher_id', 'status'];

    protected $casts = ['archived_at' => 'datetime'];

    public function schoolYear(): BelongsTo
    {
        return $this->belongsTo(SchoolYear::class);
    }

    public function principal(): BelongsTo
    {
        return $this->belongsTo(User::class, 'principal_teacher_id');
    }

    public function subjects(): BelongsToMany
    {
        return $this->belongsToMany(Subject::class, 'salle_subject')->withPivot(['coefficient', 'is_optional'])->withTimestamps();
    }

    public function tarifs(): HasMany
    {
        return $this->hasMany(Tarif::class);
    }

    public function inscriptions(): HasMany
    {
        return $this->hasMany(Inscription::class);
    }

    public function timetableSlots(): HasMany
    {
        return $this->hasMany(TimetableSlot::class);
    }
}
