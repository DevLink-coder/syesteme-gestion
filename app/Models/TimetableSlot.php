<?php

namespace App\Models;

use App\Models\Concerns\BelongsToCenter;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class TimetableSlot extends Model
{
    use BelongsToCenter, SoftDeletes;

    protected $fillable = ['code', 'salle_id', 'room_id', 'day', 'start_time', 'end_time', 'subject_id', 'subject_name', 'teacher_id', 'week_start', 'school_year_id'];

    protected $casts = ['week_start' => 'date', 'start_time' => 'datetime:H:i', 'end_time' => 'datetime:H:i'];

    public function salle(): BelongsTo
    {
        return $this->belongsTo(Salle::class);
    }

    public function subject(): BelongsTo
    {
        return $this->belongsTo(Subject::class);
    }

    public function teacher(): BelongsTo
    {
        return $this->belongsTo(User::class, 'teacher_id');
    }

    public function schoolYear(): BelongsTo
    {
        return $this->belongsTo(SchoolYear::class);
    }
}
