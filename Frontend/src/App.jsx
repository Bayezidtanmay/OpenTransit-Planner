import { useState } from "react";
import api from "./api";
import LocationAutocomplete from "./components/LocationAutocomplete";
import JourneyMap from "./components/JourneyMap";
import RouteOptionCard from "./components/RouteOptionCard";

function App() {
  const [fromPlace, setFromPlace] = useState(null);
  const [toPlace, setToPlace] = useState(null);
  const [routes, setRoutes] = useState([]);
  const [pageInfo, setPageInfo] = useState(null);
  const [selectedRouteIndex, setSelectedRouteIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [locating, setLocating] = useState(false);

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }

    setLocating(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;

        try {
          const response = await api.get("/geocode/reverse", {
            params: { lat, lon },
          });

          const place = response.data.features?.[0];

          setFromPlace({
            label: place?.properties?.label || "Current location",
            name: place?.properties?.name || "Current location",
            lat,
            lon,
          });
        } catch (error) {
          console.error(error);

          setFromPlace({
            label: "Current location",
            name: "Current location",
            lat,
            lon,
          });
        } finally {
          setLocating(false);
        }
      },
      (error) => {
        console.error(error);
        setLocating(false);
        alert("Unable to get your current location.");
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000,
      }
    );
  };

  const searchJourney = async () => {
    if (!fromPlace || !toPlace) {
      alert("Please select both From and To locations from suggestions.");
      return;
    }

    setLoading(true);
    setRoutes([]);
    setPageInfo(null);
    setSelectedRouteIndex(0);

    try {
      const response = await api.post("/journeys/plan", {
        fromLat: fromPlace.lat,
        fromLon: fromPlace.lon,
        toLat: toPlace.lat,
        toLon: toPlace.lon,
      });

      const planConnection = response.data.data.planConnection;
      const journeyRoutes = planConnection.edges || [];

      setRoutes(journeyRoutes);
      setPageInfo(planConnection.pageInfo || null);
    } catch (error) {
      console.error(error);
      alert("Journey search failed");
    } finally {
      setLoading(false);
    }
  };

  const loadMoreJourneys = async () => {
    if (!fromPlace || !toPlace || !pageInfo?.endCursor) return;

    setLoadingMore(true);

    try {
      const response = await api.post("/journeys/plan", {
        fromLat: fromPlace.lat,
        fromLon: fromPlace.lon,
        toLat: toPlace.lat,
        toLon: toPlace.lon,
        after: pageInfo.endCursor,
      });

      const planConnection = response.data.data.planConnection;
      const newRoutes = planConnection.edges || [];

      setRoutes((previousRoutes) => [...previousRoutes, ...newRoutes]);
      setPageInfo(planConnection.pageInfo || null);
    } catch (error) {
      console.error(error);
      alert("Loading more journeys failed");
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-2xl shadow p-6 mb-6">
          <h1 className="text-3xl font-bold text-slate-900">
            OpenTransit Planner
          </h1>

          <p className="text-slate-600 mt-2">
            Helsinki open journey planner powered by Digitransit.
          </p>

          <div className="grid md:grid-cols-2 gap-4 mt-6">
            <div>
              <LocationAutocomplete
                label="From"
                placeholder="Search starting point, e.g. Helsinki"
                value={fromPlace}
                onSelect={setFromPlace}
              />

              <button
                type="button"
                onClick={useCurrentLocation}
                disabled={locating}
                className="mt-2 text-sm font-semibold text-blue-700 hover:text-blue-800 disabled:text-slate-400"
              >
                {locating ? "Finding your location..." : "Use current location"}
              </button>
            </div>

            <LocationAutocomplete
              label="To"
              placeholder="Search destination, e.g. Leppävaara"
              value={toPlace}
              onSelect={setToPlace}
            />
          </div>

          <button
            onClick={searchJourney}
            disabled={loading}
            className="mt-6 bg-blue-700 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-800 disabled:bg-slate-400"
          >
            {loading ? "Searching routes..." : "Search journey"}
          </button>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            {routes.map((route, index) => (
              <RouteOptionCard
                key={index}
                route={route}
                index={index}
                selected={selectedRouteIndex === index}
                onSelect={() => setSelectedRouteIndex(index)}
              />
            ))}

            {!loading && routes.length === 0 && (
              <div className="bg-white rounded-2xl shadow p-6 text-slate-500">
                Search a journey to see route options.
              </div>
            )}

            {pageInfo?.hasNextPage && routes.length > 0 && (
              <button
                onClick={loadMoreJourneys}
                disabled={loadingMore}
                className="w-full bg-white border border-blue-200 text-blue-700 rounded-2xl py-4 font-semibold shadow hover:bg-blue-50 disabled:bg-slate-100 disabled:text-slate-400"
              >
                {loadingMore ? "Loading more journeys..." : "Load more journeys"}
              </button>
            )}
          </div>

          <div className="lg:sticky lg:top-6 self-start">
            <JourneyMap selectedRoute={routes[selectedRouteIndex]} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
