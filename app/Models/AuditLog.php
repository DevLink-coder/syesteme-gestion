<?php

namespace App\Models;

use App\Models\Concerns\BelongsToCenter;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AuditLog extends Model
{
    use BelongsToCenter;

    protected $fillable = ['code', 'author_id', 'author_name', 'happened_at', 'type', 'entity', 'school_year_code', 'school_year_id', 'old_value', 'new_value', 'details', 'auditable_type', 'auditable_id'];

    protected $casts = ['happened_at' => 'datetime'];

    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'author_id');
    }
}
