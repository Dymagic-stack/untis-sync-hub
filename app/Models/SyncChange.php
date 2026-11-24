<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SyncChange extends Model
{
    protected $fillable = [
        'sync_log_id', 'entity_type', 'entity_id', 'change_type', 'before', 'after',
    ];

    protected $casts = [
        'before' => 'array',
        'after' => 'array',
    ];

    public function log()
    {
        return $this->belongsTo(SyncLog::class, 'sync_log_id');
    }
}
