import { useEffect, useState } from "react";
import api from "./api";
import LocationAutocomplete from "./components/LocationAutocomplete";
import JourneyMap from "./components/JourneyMap";
import RouteOptionCard from "./components/RouteOptionCard";
import SavedPlaces from "./components/SavedPlaces";
import WeatherCard from "./components/WeatherCard";

const SAVED_PLACES_KEY = "opentransit_saved_places";

function App() {
  const [fromPlace, setFromPlace] = useState(null);
  const [toPlace, setToPlace] = useState(null);
  const [savedPlaces, setSavedPlaces] = useState(() => {
    const storedPlaces = localStorage.getItem(SAVED_PLACES_KEY);

    if (!storedPlaces) return [];

    try {
      return JSON.parse(storedPlaces);
    } catch {
      return [];
    }
  });
  const [routes, setRoutes] = useState([]);
  const [pageInfo, setPageInfo] = useState(null);
  const [selectedRouteIndex, setSelectedRouteIndex] = useState(null);
  const [mapOpened, setMapOpened] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    localStorage.setItem(SAVED_PLACES_KEY, JSON.stringify(savedPlaces));
  }, [savedPlaces]);

  const savePlace = (label, place) => {
    if (!place) return;

    const newPlace = {
      id: `${label.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}`,
      label,
      place,
    };

    setSavedPlaces((previousPlaces) => [newPlace, ...previousPlaces]);
  };

  const removePlace = (id) => {
    setSavedPlaces((previousPlaces) =>
      previousPlaces.filter((place) => place.id !== id)
    );
  };

  const useSavedPlace = (place, target) => {
    if (target === "from") {
      setFromPlace(place);
    } else {
      setToPlace(place);
    }
  };

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
    setSelectedRouteIndex(null);
    setMapOpened(false);

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

  const openRouteMap = (index) => {
    setSelectedRouteIndex(index);
    setMapOpened(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const backToRouteOptions = () => {
    setMapOpened(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const selectedRoute =
    selectedRouteIndex !== null ? routes[selectedRouteIndex] : null;

  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 rounded-2xl bg-white p-6 shadow">
          <h1 className="text-3xl font-bold text-slate-900">
            OpenTransit Planner
          </h1>

          <p className="mt-2 text-slate-600">
            Helsinki open journey planner powered by Digitransit.
          </p>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div>
              <LocationAutocomplete
                label="From"
                placeholder="Search starting point"
                value={fromPlace}
                onSelect={setFromPlace}
                markerColor="green"
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
              placeholder="Search destination"
              value={toPlace}
              onSelect={setToPlace}
              markerColor="red"
            />
          </div>

          <SavedPlaces
            savedPlaces={savedPlaces}
            fromPlace={fromPlace}
            toPlace={toPlace}
            onSavePlace={savePlace}
            onRemovePlace={removePlace}
            onUsePlace={useSavedPlace}
          />

          <WeatherCard place={toPlace} />

          <button
            onClick={searchJourney}
            disabled={loading}
            className="mt-6 rounded-xl bg-blue-700 px-6 py-3 font-semibold text-white hover:bg-blue-800 disabled:bg-slate-400"
          >
            {loading ? "Searching routes..." : "Search journey"}
          </button>
        </div>

        {!mapOpened && (
          <div className="mx-auto max-w-4xl space-y-4">
            {routes.map((route, index) => (
              <RouteOptionCard
                key={index}
                route={route}
                index={index}
                selected={selectedRouteIndex === index}
                onSelect={() => openRouteMap(index)}
                onClose={() => setSelectedRouteIndex(null)}
              />
            ))}

            {!loading && routes.length === 0 && (
              <div className="rounded-2xl bg-white p-6 text-slate-500 shadow">
                Search a journey to see route options.
              </div>
            )}

            {pageInfo?.hasNextPage && routes.length > 0 && (
              <button
                onClick={loadMoreJourneys}
                disabled={loadingMore}
                className="w-full rounded-2xl border border-blue-200 bg-white py-4 font-semibold text-blue-700 shadow hover:bg-blue-50 disabled:bg-slate-100 disabled:text-slate-400"
              >
                {loadingMore ? "Loading more journeys..." : "Load more journeys"}
              </button>
            )}
          </div>
        )}

        {mapOpened && selectedRoute && (
          <div className="space-y-4">
            <button
              onClick={backToRouteOptions}
              className="rounded-full bg-white px-5 py-3 font-semibold text-blue-700 shadow transition hover:bg-blue-50"
            >
              ← Back to route options
            </button>

            <JourneyMap selectedRoute={selectedRoute} />
          </div>
        )}
      </div>
    </div>
  );
}

export default App;