<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

class GeocodingController extends Controller
{
    public function search(Request $request)
    {
        $validated = $request->validate([
            'text' => 'required|string|min:2',
        ]);

        $response = Http::withHeaders([
            'digitransit-subscription-key' => env('DIGITRANSIT_API_KEY'),
        ])->get('https://api.digitransit.fi/geocoding/v1/search', [
            'text' => $validated['text'],
            'size' => 6,
            'boundary.country' => 'FIN',
        ]);

        if ($response->failed()) {
            return response()->json([
                'message' => 'Failed to fetch location suggestions',
                'error' => $response->json(),
            ], $response->status());
        }

        return response()->json($response->json());
    }

    public function reverse(Request $request)
    {
        $validated = $request->validate([
            'lat' => 'required|numeric',
            'lon' => 'required|numeric',
        ]);

        $response = Http::get(
            'https://api.digitransit.fi/geocoding/v1/reverse',
            [
                'point.lat' => $validated['lat'],
                'point.lon' => $validated['lon'],
                'size' => 1,
            ]
        );

        return response()->json($response->json());
    }
}
