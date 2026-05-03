import { useState } from "react";
import api from "./api";

function App() {
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(false);

  const searchJourney = async () => {
    setLoading(true);

    try {
      const response = await api.post("/journeys/plan", {
        fromLat: 60.1699,
        fromLon: 24.9384,
        toLat: 60.2055,
        toLon: 24.6559,
      });

      setRoutes(response.data.data.planConnection.edges);
    } catch (error) {
      console.error(error);
      alert("Journey search failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="max-w-5xl mx-auto">
        <div className="bg-white rounded-2xl shadow p-6 mb-6">
          <h1 className="text-3xl font-bold text-slate-900">
            OpenTransit Planner
          </h1>
          <p className="text-slate-600 mt-2">
            Helsinki open journey planner powered by Digitransit.
          </p>

          <button
            onClick={searchJourney}
            className="mt-5 bg-blue-700 text-white px-5 py-3 rounded-xl font-semibold hover:bg-blue-800"
          >
            {loading ? "Searching..." : "Search sample journey"}
          </button>
        </div>

        <div className="space-y-4">
          {routes.map((route, index) => (
            <div key={index} className="bg-white rounded-2xl shadow p-5">
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
                    <div className="font-semibold">
                      {leg.mode}
                      {leg.route?.shortName ? ` — ${leg.route.shortName}` : ""}
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
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default App;
