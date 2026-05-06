import { useState } from "react";
import api from "./api";
import LocationAutocomplete from "./components/LocationAutocomplete";
import JourneyMap from "./components/JourneyMap";
import RouteOptionCard from "./components/RouteOptionCard";

function App() {
  const [fromPlace, setFromPlace] = useState(null);
  const [toPlace, setToPlace] = useState(null);
  const [routes, setRoutes] = useState([]);
  const [selectedRouteIndex, setSelectedRouteIndex] = useState(0);
  const [loading, setLoading] = useState(false);

  const searchJourney = async () => {
    if (!fromPlace || !toPlace) {
      alert("Please select both From and To locations from suggestions.");
      return;
    }

    setLoading(true);
    setRoutes([]);

    try {
      const response = await api.post("/journeys/plan", {
        fromLat: fromPlace.lat,
        fromLon: fromPlace.lon,
        toLat: toPlace.lat,
        toLon: toPlace.lon,
      });

      const journeyRoutes = response.data.data.planConnection.edges || [];

      setRoutes(journeyRoutes);
      setSelectedRouteIndex(0);
    } catch (error) {
      console.error(error);
      alert("Journey search failed");
    } finally {
      setLoading(false);
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
            <LocationAutocomplete
              label="From"
              placeholder="Search starting point, e.g. Helsinki"
              value={fromPlace}
              onSelect={setFromPlace}
            />

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
