<?php

namespace App\Support;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Scope;

class TenantScope implements Scope
{
    public function apply(Builder $builder, Model $model): void
    {
        if ($centerId = TenantContext::id()) {
            $builder->where($model->qualifyColumn('center_id'), $centerId);
        }
    }
}
