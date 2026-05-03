<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\Http;

class MapTileController extends Controller
{
    public function tile($z, $x, $y)
    {
        $apiKey = env('DIGITRANSIT_API_KEY');

        $url = "https://cdn.digitransit.fi/map/v3/hsl-map/{$z}/{$x}/{$y}@2x.png";

        $response = Http::get($url, [
            'digitransit-subscription-key' => $apiKey,
        ]);

        if ($response->failed()) {
            return response('Map tile not found', $response->status());
        }

        return response($response->body(), 200)
            ->header('Content-Type', 'image/png')
            ->header('Cache-Control', 'public, max-age=86400');
    }
}
