<?php

namespace App\Models;

use App\Models\Concerns\BelongsToCenter;
use Illuminate\Database\Eloquent\Model;

class PendingEmail extends Model
{
    use BelongsToCenter;
}
