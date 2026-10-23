<?php

namespace App\Models;

use App\Models\Concerns\BelongsToCenter;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class Payment extends Model
{
    use BelongsToCenter, SoftDeletes;

    protected $fillable = ['code', 'student_id', 'inscription_id', 'type', 'amount', 'expected_amount', 'solde_du', 'status', 'due_date', 'paid_at', 'created_by'];

    protected $casts = ['due_date' => 'date', 'paid_at' => 'date'];

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    public function inscription(): BelongsTo
    {
        return $this->belongsTo(Inscription::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
