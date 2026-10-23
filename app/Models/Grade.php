<?php

namespace App\Models;

use App\Models\Concerns\BelongsToCenter;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class Grade extends Model
{
    use BelongsToCenter, SoftDeletes;

    protected $fillable = ['evaluation_id', 'student_id', 'subject_id', 'subject_name', 'note', 'coefficient', 'graded_by', 'synced_at'];

    protected $casts = ['note' => 'decimal:2', 'coefficient' => 'decimal:2', 'synced_at' => 'datetime'];

    public function evaluation(): BelongsTo
    {
        return $this->belongsTo(Evaluation::class);
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    public function subject(): BelongsTo
    {
        return $this->belongsTo(Subject::class);
    }
}
