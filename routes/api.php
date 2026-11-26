<?php

use App\Http\Controllers\Api\SyncHubController;
use Illuminate\Support\Facades\Route;

Route::prefix('sync-hub')->controller(SyncHubController::class)->group(function () {
    Route::post('admin/login', 'adminLogin');
    Route::get('admin/me', 'adminMe');
    Route::post('admin/logout', 'adminLogout');
    Route::post('reminders', 'sendReminder');
    Route::get('dashboard', 'dashboard');
    Route::get('timetable', 'timetable');
    Route::get('students', 'students');
    Route::get('classes', 'classes');
    Route::get('subjects', 'subjects');
    Route::get('rooms', 'rooms');
    Route::get('absences', 'absences');
    Route::post('absences', 'createAbsence');
    Route::put('absences/{id}', 'updateAbsence');
    Route::delete('absences/{id}', 'deleteAbsence');
    Route::post('lessons', 'createLesson');
    Route::put('lessons/{id}', 'updateLesson');
    Route::delete('lessons/{id}', 'deleteLesson');
    Route::post('sync', 'sync');
    Route::get('sync/status', 'status');
    Route::get('sync/logs', 'logs');
    Route::get('sync/changes', 'changes');
    Route::get('moodle/absences', 'moodleAbsences');
    Route::post('moodle/absences', 'createMoodleAbsence');
    Route::get('comparison', 'systemComparison');
    Route::get('seating/{className}', 'seating');
    Route::put('seating/{className}', 'updateSeating');
    Route::put('students/{id}/photo', 'updateStudentPhoto');
});
