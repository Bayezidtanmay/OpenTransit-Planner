import { useState } from "react";
import api from "./api";
import LocationAutocomplete from "./components/LocationAutocomplete";
import JourneyMap from "./components/JourneyMap";

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
              <button
                key={index}
                onClick={() => setSelectedRouteIndex(index)}
                className={`w-full text-left rounded-2xl shadow p-5 border transition ${selectedRouteIndex === index
                    ? "bg-blue-50 border-blue-600"
                    : "bg-white border-transparent"
                  }`}
              >
                <h2 className="text-xl font-bold text-slate-900">
                  Route option {index + 1}
                </h2>

                <p className="text-slate-600 mt-1">
                  Duration: {Math.round(route.node.duration / 60)} minutes
                </p>

                <div className="mt-4 space-y-3">
                  {route.node.legs.map((leg, legIndex) => (
                    <div
                      key={legIndex}
                      className="border rounded-xl p-4 bg-slate-50"
                    >
                      <div className="font-semibold text-slate-900">
                        {leg.mode}
                        {leg.route?.shortName
                          ? ` — ${leg.route.shortName}`
                          : ""}
                      </div>

                      <div className="text-sm text-slate-600 mt-1">
                        {leg.from.name} → {leg.to.name}
                      </div>

                      <div className="text-sm text-slate-500 mt-1">
                        {Math.round(leg.duration / 60)} min ·{" "}
                        {Math.round(leg.distance)} m
                      </div>
                    </div>
                  ))}
                </div>
              </button>
            ))}

            {!loading && routes.length === 0 && (
              <div className="bg-white rounded-2xl shadow p-6 text-slate-500">
                Search a journey to see route options.
              </div>
            )}
          </div>

          <JourneyMap selectedRoute={routes[selectedRouteIndex]} />
        </div>
      </div>
    </div>
  );
}

export default App;
