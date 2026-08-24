<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

Route::get('create', [App\Http\Controllers\Department::class, 'create']);