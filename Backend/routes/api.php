<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\JourneyController;
use App\Http\Controllers\Api\GeocodingController;
use App\Http\Controllers\Api\MapTileController;

Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth:sanctum');

Route::post('/journeys/plan', [JourneyController::class, 'plan']);
Route::get('/geocode/search', [GeocodingController::class, 'search']);
Route::get('/map/tiles/{z}/{x}/{y}', [MapTileController::class, 'tile']);
Route::get('/geocode/reverse', [GeocodingController::class, 'reverse']);
