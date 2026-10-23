<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use App\Support\TenantContext;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Carbon;
use Laravel\Sanctum\HasApiTokens;

/**
 * @property int $id
 * @property string $name
 * @property string $email
 * @property Carbon|null $email_verified_at
 * @property string $password
 * @property string|null $code
 * @property string $role
 * @property string|null $status
 * @property string|null $telephone
 * @property bool $is_admin
 * @property bool $is_teacher
 * @property int|null $center_id
 * @property bool $must_change_password
 * @property string|null $remember_token
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable(['name', 'email', 'password', 'code', 'role', 'status', 'telephone', 'is_admin', 'is_teacher', 'center_id', 'must_change_password'])]
#[Hidden(['password', 'remember_token'])]
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, Notifiable, SoftDeletes;

    protected static function booted(): void
    {
        static::creating(function (User $user): void {
            if ($user->role !== 'superadmin' && ! $user->center_id && $centerId = TenantContext::id()) {
                $user->center_id = $centerId;
            }
        });
    }

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'is_admin' => 'boolean',
            'is_teacher' => 'boolean',
        ];
    }

    public function isAdmin(): bool
    {
        if ($this->role === 'superadmin') {
            return TenantContext::id() !== null;
        }

        return $this->role === 'admin' || (bool) $this->is_admin;
    }

    public function isSuperAdmin(): bool
    {
        return $this->role === 'superadmin';
    }

    public function isTeacher(): bool
    {
        return $this->isAdmin() || (bool) $this->is_teacher || $this->role === 'teacher';
    }

    public function isActiveTeacher(): bool
    {
        return $this->isTeacher() && $this->status === 'active';
    }
}
