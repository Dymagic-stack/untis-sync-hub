<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MoodleAbsence extends Model
{
    protected $fillable = [
        'external_id', 'student_name', 'class_name', 'date', 'reason',
        'status', 'synced_to_webuntis',
    ];

    protected $casts = [
        'date' => 'date:Y-m-d',
        'synced_to_webuntis' => 'boolean',
    ];
}
