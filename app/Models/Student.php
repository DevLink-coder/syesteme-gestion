<?php

namespace App\Models;

use App\Models\Concerns\BelongsToCenter;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * @property int $id
 * @property string $code
 * @property string $name
 * @property string|null $parent_name
 * @property string|null $parent_whatsapp
 * @property string|null $parent_email
 * @property string|null $room_id
 * @property string $enrollment_status
 * @property string|null $language
 */
class Student extends Model
{
    use BelongsToCenter, SoftDeletes;

    protected $fillable = ['code', 'name', 'parent_name', 'parent_whatsapp', 'parent_email', 'room_id', 'enrollment_status', 'language', 'parent_token', 'parent_token_expires_at'];

    protected $casts = ['parent_token_expires_at' => 'datetime'];

    public function inscriptions(): HasMany
    {
        return $this->hasMany(Inscription::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class);
    }

    public function attendances(): HasMany
    {
        return $this->hasMany(Attendance::class);
    }

    public function grades(): HasMany
    {
        return $this->hasMany(Grade::class);
    }
}
