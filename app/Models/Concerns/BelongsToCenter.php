<?php

namespace App\Models\Concerns;

use App\Support\TenantContext;
use App\Support\TenantScope;

trait BelongsToCenter
{
    public static function bootBelongsToCenter(): void
    {
        static::addGlobalScope(new TenantScope);

        static::creating(function ($model): void {
            if (! $model->getAttribute('center_id') && $centerId = TenantContext::id()) {
                $model->setAttribute('center_id', $centerId);
            }
        });
    }
}
