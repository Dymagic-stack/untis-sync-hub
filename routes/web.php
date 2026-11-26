<?php

use Illuminate\Support\Facades\Route;

Route::view('/', 'app');
Route::view('/app', 'app');
Route::redirect('/api/sync-hub', '/');

Route::view('/swagger', 'swagger');
