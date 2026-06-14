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
      'after' => 'nullable|string',
    ]);

    $query = <<<'GRAPHQL'
        query PlanJourney($fromLat: CoordinateValue!, $fromLon: CoordinateValue!, $toLat: CoordinateValue!, $toLon: CoordinateValue!, $after: String) {
          planConnection(
            origin: { location: { coordinate: { latitude: $fromLat, longitude: $fromLon } } }
            destination: { location: { coordinate: { latitude: $toLat, longitude: $toLon } } }
            first: 20
            after: $after
          ) {
            pageInfo {
              hasNextPage
              endCursor
            }
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
                    stop {
                      gtfsId
                      name
                      code
                    }
                  }
                  to {
                    name
                    lat
                    lon
                    stop {
                      gtfsId
                      name
                      code
                    }
                  }
                  intermediatePlaces {
                    name
                    lat
                    lon
                    stop {
                      gtfsId
                      name
                      code
                    }
                  }
                  distance
                  duration
                  route {
                    gtfsId
                    shortName
                    longName
                    mode
                    color
                    textColor
                  }
                  trip {
                    gtfsId
                    stoptimes {
                      scheduledArrival
                      scheduledDeparture
                      realtimeArrival
                      realtimeDeparture
                      stop {
                        gtfsId
                        name
                        code
                        lat
                        lon
                      }
                    }
                    pattern {
                      code
                      directionId
                      patternGeometry {
                        points
                      }
                    }
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
        'after' => $validated['after'] ?? null,
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

  public function stopSchedule(Request $request)
  {
    $validated = $request->validate([
      'stopId' => 'required|string',
      'routeShortName' => 'required|string',
    ]);

    $query = <<<'GRAPHQL'
        query StopSchedule($stopId: String!) {
          stop(id: $stopId) {
            name
            stoptimesWithoutPatterns(numberOfDepartures: 80) {
              serviceDay
              scheduledDeparture
              realtimeDeparture
              headsign
              trip {
                gtfsId
                route {
                  shortName
                  longName
                  mode
                  color
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
        'stopId' => $validated['stopId'],
      ],
    ]);

    if ($response->failed()) {
      return response()->json([
        'message' => 'Failed to fetch stop schedule',
        'error' => $response->json(),
      ], $response->status());
    }

    $data = $response->json();

    $filtered = collect(
      $data['data']['stop']['stoptimesWithoutPatterns'] ?? []
    )->filter(function ($item) use ($validated) {
      return ($item['trip']['route']['shortName'] ?? null)
        === $validated['routeShortName'];
    })->values();

    return response()->json([
      'stop' => $data['data']['stop']['name'] ?? null,
      'routeShortName' => $validated['routeShortName'],
      'departures' => $filtered,
    ]);
  }

  public function mapStops(Request $request)
  {
    $validated = $request->validate([
      'lat' => 'required|numeric',
      'lon' => 'required|numeric',
      'radius' => 'nullable|numeric',
    ]);

    $query = <<<'GRAPHQL'
        query MapStops($lat: Float!, $lon: Float!, $radius: Int!) {
          stopsByRadius(lat: $lat, lon: $lon, radius: $radius) {
            edges {
              node {
                stop {
                  gtfsId
                  name
                  code
                  lat
                  lon
                  vehicleMode
                  routes {
                    gtfsId
                    shortName
                    longName
                    mode
                    color
                  }
                }
                distance
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
        'lat' => (float) $validated['lat'],
        'lon' => (float) $validated['lon'],
        'radius' => (int) ($validated['radius'] ?? 1200),
      ],
    ]);

    if ($response->failed()) {
      return response()->json([
        'message' => 'Failed to fetch map stops',
        'error' => $response->json(),
      ], $response->status());
    }

    $data = $response->json();

    $stops = collect($data['data']['stopsByRadius']['edges'] ?? [])
      ->map(function ($edge) {
        return $edge['node']['stop'] ?? null;
      })
      ->filter()
      ->unique('gtfsId')
      ->values();

    return response()->json([
      'stops' => $stops,
    ]);
  }

  public function alerts(Request $request)
  {
    $validated = $request->validate([
      'routeIds' => 'nullable|string',
    ]);

    $routeIds = collect(explode(',', $validated['routeIds'] ?? ''))
      ->map(fn($id) => trim($id))
      ->filter()
      ->values();

    $query = <<<'GRAPHQL'
    query Alerts {
      alerts(feeds: ["HSL"]) {
        alertHeaderText
        alertDescriptionText
        alertUrl
        alertSeverityLevel
        alertEffect
        effectiveStartDate
        effectiveEndDate
        entities {
          __typename
          ... on Route {
            gtfsId
          }
          ... on Stop {
            gtfsId
          }
        }
      }
    }
    GRAPHQL;

    $response = Http::withHeaders([
      'Content-Type' => 'application/json',
      'Accept-Language' => 'en',
      'digitransit-subscription-key' => env('DIGITRANSIT_API_KEY'),
    ])->post(env('DIGITRANSIT_ROUTING_URL'), [
      'query' => $query,
    ]);

    if ($response->failed()) {
      return response()->json([
        'message' => 'Failed to fetch route alerts',
        'error' => $response->json(),
      ], $response->status());
    }

    $alerts = collect($response->json('data.alerts') ?? []);

    if ($routeIds->isNotEmpty()) {
      $alerts = $alerts->filter(function ($alert) use ($routeIds) {
        $alertRouteIds = collect($alert['entities'] ?? [])
          ->filter(fn($entity) => ($entity['__typename'] ?? null) === 'Route')
          ->pluck('gtfsId');

        return $alertRouteIds->intersect($routeIds)->isNotEmpty();
      });
    }

    return response()->json([
      'alerts' => $alerts->values(),
    ]);
  }

  public function stopBoard(Request $request)
  {
    $validated = $request->validate([
      'stopId' => 'required|string',
    ]);

    $query = <<<'GRAPHQL'
    query StopBoard($stopId: String!) {
      stop(id: $stopId) {
        gtfsId
        name
        code
        stoptimesWithoutPatterns(numberOfDepartures: 12) {
          serviceDay
          scheduledDeparture
          realtimeDeparture
          headsign
          trip {
            gtfsId
            route {
              gtfsId
              shortName
              longName
              mode
              color
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
        'stopId' => $validated['stopId'],
      ],
    ]);

    if ($response->failed()) {
      return response()->json([
        'message' => 'Failed to fetch stop board',
        'error' => $response->json(),
      ], $response->status());
    }

    return response()->json($response->json('data.stop'));
  }

  public function tripRoute(Request $request)
  {
    $validated = $request->validate([
      'tripId' => 'required|string',
    ]);

    $query = <<<'GRAPHQL'
    query TripRoute($tripId: String!) {
      trip(id: $tripId) {
        gtfsId
        route {
          gtfsId
          shortName
          longName
          mode
          color
          textColor
        }
        stoptimes {
          scheduledArrival
          scheduledDeparture
          realtimeArrival
          realtimeDeparture
          stop {
            gtfsId
            name
            code
            lat
            lon
          }
        }
        pattern {
          code
          directionId
          patternGeometry {
            points
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
        'tripId' => $validated['tripId'],
      ],
    ]);

    if ($response->failed()) {
      return response()->json([
        'message' => 'Failed to fetch trip route',
        'error' => $response->json(),
      ], $response->status());
    }

    return response()->json($response->json('data.trip'));
  }
}
