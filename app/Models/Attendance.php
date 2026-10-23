<?php

namespace App\Models;

use App\Models\Concerns\BelongsToCenter;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class Attendance extends Model
{
    use BelongsToCenter, SoftDeletes;

    protected $fillable = ['code', 'student_id', 'salle_id', 'timetable_slot_id', 'room_id', 'date', 'heure_appel', 'present', 'whatsapp_status', 'synced_at', 'marked_by', 'school_year_id'];

    protected $casts = ['date' => 'date', 'present' => 'boolean', 'synced_at' => 'datetime'];

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    public function salle(): BelongsTo
    {
        return $this->belongsTo(Salle::class);
    }

    public function slot(): BelongsTo
    {
        return $this->belongsTo(TimetableSlot::class, 'timetable_slot_id');
    }
}
