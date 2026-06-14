import { useEffect, useState } from "react";
import api from "./api";
import LocationAutocomplete from "./components/LocationAutocomplete";
import JourneyMap from "./components/JourneyMap";
import RouteOptionCard from "./components/RouteOptionCard";
import SavedPlaces from "./components/SavedPlaces";
import WeatherCard from "./components/WeatherCard";
import JourneyHistory from "./components/JourneyHistory";

const SAVED_PLACES_KEY = "opentransit_saved_places";
const JOURNEY_HISTORY_KEY = "opentransit_journey_history";

function App() {
  const [fromPlace, setFromPlace] = useState(null);
  const [toPlace, setToPlace] = useState(null);

  const [timeMode, setTimeMode] = useState("now");
  const [selectedDateTime, setSelectedDateTime] = useState("");

  const [savedPlaces, setSavedPlaces] = useState(() => {
    const storedPlaces = localStorage.getItem(SAVED_PLACES_KEY);

    if (!storedPlaces) return [];

    try {
      return JSON.parse(storedPlaces);
    } catch {
      return [];
    }
  });

  const [journeyHistory, setJourneyHistory] = useState(() => {
    const storedHistory = localStorage.getItem(JOURNEY_HISTORY_KEY);

    if (!storedHistory) return [];

    try {
      return JSON.parse(storedHistory);
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

  useEffect(() => {
    localStorage.setItem(JOURNEY_HISTORY_KEY, JSON.stringify(journeyHistory));
  }, [journeyHistory]);

  const buildJourneyPayload = (afterCursor = null) => {
    const journeyPayload = {
      fromLat: fromPlace.lat,
      fromLon: fromPlace.lon,
      toLat: toPlace.lat,
      toLon: toPlace.lon,
    };

    if (afterCursor) {
      journeyPayload.after = afterCursor;
    }

    if (timeMode !== "now" && selectedDateTime) {
      journeyPayload.dateTime = new Date(selectedDateTime).toISOString();
      journeyPayload.arriveBy = timeMode === "arrive";
    }

    return journeyPayload;
  };

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

    setRoutes([]);
    setPageInfo(null);
    setSelectedRouteIndex(null);
    setMapOpened(false);
  };

  const saveJourneyHistory = (from, to) => {
    if (!from || !to) return;

    const newItem = {
      id: `${Date.now()}`,
      fromPlace: from,
      toPlace: to,
      searchedAt: new Date().toISOString(),
      timeMode,
      selectedDateTime,
    };

    setJourneyHistory((previousHistory) => {
      const filteredHistory = previousHistory.filter((item) => {
        const sameFrom =
          item.fromPlace?.label === from.label ||
          item.fromPlace?.name === from.name;

        const sameTo =
          item.toPlace?.label === to.label ||
          item.toPlace?.name === to.name;

        return !(sameFrom && sameTo);
      });

      return [newItem, ...filteredHistory].slice(0, 6);
    });
  };

  const useJourneyHistory = (item) => {
    setFromPlace(item.fromPlace);
    setToPlace(item.toPlace);
    setTimeMode(item.timeMode || "now");
    setSelectedDateTime(item.selectedDateTime || "");
    setRoutes([]);
    setPageInfo(null);
    setSelectedRouteIndex(null);
    setMapOpened(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const removeJourneyHistory = (id) => {
    setJourneyHistory((previousHistory) =>
      previousHistory.filter((item) => item.id !== id)
    );
  };

  const clearJourneyHistory = () => {
    setJourneyHistory([]);
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

    if (timeMode !== "now" && !selectedDateTime) {
      alert("Please select date and time.");
      return;
    }

    setLoading(true);
    setRoutes([]);
    setPageInfo(null);
    setSelectedRouteIndex(null);
    setMapOpened(false);

    try {
      const response = await api.post("/journeys/plan", buildJourneyPayload());

      const planConnection = response.data?.data?.planConnection;

      if (!planConnection) {
        console.error("Journey API response:", response.data);
        alert("Journey search failed. Check backend/GraphQL response.");
        return;
      }

      const journeyRoutes = planConnection.edges || [];

      setRoutes(journeyRoutes);
      setPageInfo(planConnection.pageInfo || null);
      saveJourneyHistory(fromPlace, toPlace);
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
      const response = await api.post(
        "/journeys/plan",
        buildJourneyPayload(pageInfo.endCursor)
      );

      const planConnection = response.data?.data?.planConnection;

      if (!planConnection) {
        console.error("Journey API response:", response.data);
        alert("Loading more journeys failed. Check backend/GraphQL response.");
        return;
      }

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

          <JourneyHistory
            history={journeyHistory}
            onUseHistory={useJourneyHistory}
            onRemoveHistory={removeJourneyHistory}
            onClearHistory={clearJourneyHistory}
          />

          <WeatherCard fromPlace={fromPlace} toPlace={toPlace} />

          <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="mb-3 text-sm font-bold text-slate-700">
              Journey time
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setTimeMode("now")}
                className={`rounded-full px-4 py-2 text-sm font-bold transition ${timeMode === "now"
                    ? "bg-blue-700 text-white"
                    : "bg-white text-slate-700 hover:bg-slate-100"
                  }`}
              >
                Leave now
              </button>

              <button
                type="button"
                onClick={() => setTimeMode("leave")}
                className={`rounded-full px-4 py-2 text-sm font-bold transition ${timeMode === "leave"
                    ? "bg-blue-700 text-white"
                    : "bg-white text-slate-700 hover:bg-slate-100"
                  }`}
              >
                Leave at
              </button>

              <button
                type="button"
                onClick={() => setTimeMode("arrive")}
                className={`rounded-full px-4 py-2 text-sm font-bold transition ${timeMode === "arrive"
                    ? "bg-blue-700 text-white"
                    : "bg-white text-slate-700 hover:bg-slate-100"
                  }`}
              >
                Arrive by
              </button>
            </div>

            {timeMode !== "now" && (
              <div className="mt-4">
                <label className="mb-2 block text-sm font-semibold text-slate-600">
                  {timeMode === "leave"
                    ? "Choose departure time"
                    : "Choose arrival time"}
                </label>

                <input
                  type="datetime-local"
                  value={selectedDateTime}
                  onChange={(event) => setSelectedDateTime(event.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 font-semibold text-slate-800 outline-none focus:border-blue-500"
                />
              </div>
            )}
          </div>

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