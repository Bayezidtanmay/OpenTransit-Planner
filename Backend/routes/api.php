<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\JourneyController;
use App\Http\Controllers\Api\GeocodingController;

Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth:sanctum');

Route::post('/journeys/plan', [JourneyController::class, 'plan']);
Route::get('/geocode/search', [GeocodingController::class, 'search']);
