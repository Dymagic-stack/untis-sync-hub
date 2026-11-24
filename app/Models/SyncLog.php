<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SyncLog extends Model
{
    protected $fillable = [
        'direction', 'source', 'status', 'students', 'classes', 'lessons',
        'absences', 'changes', 'message',
    ];

    public function changes()
    {
        return $this->hasMany(SyncChange::class);
    }
}
