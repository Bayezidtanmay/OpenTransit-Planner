<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

class JourneyController extends Controller
{
    public function plan(Request $request)
    {
        $validated = $request->validate([
            'fromLat' => 'required|numeric',
            'fromLon' => 'required|numeric',
            'toLat' => 'required|numeric',
            'toLon' => 'required|numeric',
        ]);

        $query = <<<'GRAPHQL'
        query PlanJourney($fromLat: CoordinateValue!, $fromLon: CoordinateValue!, $toLat: CoordinateValue!, $toLon: CoordinateValue!) {
          planConnection(
            origin: { location: { coordinate: { latitude: $fromLat, longitude: $fromLon } } }
            destination: { location: { coordinate: { latitude: $toLat, longitude: $toLon } } }
            first: 3
          ) {
            edges {
              node {
                start
                end
                duration
                legs {
                  mode
                  start {
                    scheduledTime
                    estimated {
                      time
                    }
                  }
                  end {
                    scheduledTime
                    estimated {
                      time
                    }
                  }
                  from {
                    name
                    lat
                    lon
                  }
                  to {
                    name
                    lat
                    lon
                  }
                  distance
                  duration
                  route {
                    shortName
                    longName
                    mode
                  }
                  legGeometry {
                    points
                  }
                }
              }
            }
          }
        }
        GRAPHQL;

        $response = Http::withHeaders([
            'Content-Type' => 'application/json',
            'digitransit-subscription-key' => env('DIGITRANSIT_API_KEY'),
        ])->post(env('DIGITRANSIT_ROUTING_URL'), [
            'query' => $query,
            'variables' => [
                'fromLat' => (float) $validated['fromLat'],
                'fromLon' => (float) $validated['fromLon'],
                'toLat' => (float) $validated['toLat'],
                'toLon' => (float) $validated['toLon'],
            ],
        ]);

        if ($response->failed()) {
            return response()->json([
                'message' => 'Failed to fetch journey plan',
                'error' => $response->json(),
            ], $response->status());
        }

        return response()->json($response->json());
    }
}
