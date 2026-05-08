import { useEffect, useState } from "react";
import {
    MapContainer,
    TileLayer,
    Polyline,
    Popup,
    useMap,
    CircleMarker,
} from "react-leaflet";
import polyline from "@mapbox/polyline";
import "leaflet/dist/leaflet.css";
import LiveVehiclesLayer from "./LiveVehiclesLayer";

const getLineColor = (mode) => {
    const colors = {
        WALK: "#64748b",
        BUS: "#2563eb",
        RAIL: "#9333ea",
        TRAM: "#16a34a",
        SUBWAY: "#ea580c",
        BICYCLE: "#059669",
        FERRY: "#0891b2",
    };

    return colors[mode] || "#334155";
};

const getTransitColorForMarker = (legs, index) => {
    const currentLeg = legs[index];

    if (currentLeg?.mode !== "WALK" && currentLeg?.mode !== "BICYCLE") {
        return getLineColor(currentLeg.mode);
    }

    const nextTransitLeg = legs
        .slice(index + 1)
        .find((leg) => leg.mode !== "WALK" && leg.mode !== "BICYCLE");

    if (nextTransitLeg) {
        return getLineColor(nextTransitLeg.mode);
    }

    const previousTransitLeg = [...legs]
        .slice(0, index)
        .reverse()
        .find((leg) => leg.mode !== "WALK" && leg.mode !== "BICYCLE");

    if (previousTransitLeg) {
        return getLineColor(previousTransitLeg.mode);
    }

    return "#2563eb";
};

function FitRouteBounds({ routeLines }) {
    const map = useMap();

    useEffect(() => {
        const allPoints = routeLines.flatMap((line) => line.positions);

        if (allPoints.length > 0) {
            map.fitBounds(allPoints, {
                padding: [40, 40],
            });
        }
    }, [routeLines, map]);

    return null;
}

function JourneyMap({ selectedRoute }) {
    const [showLiveVehicles, setShowLiveVehicles] = useState(false);

    if (!selectedRoute) {
        return (
            <div className="bg-white rounded-2xl shadow p-6 text-slate-500">
                Select a route option to see it on the map.
            </div>
        );
    }

    const legs = selectedRoute.node.legs;

    const routeLines = legs
        .filter((leg) => leg.legGeometry?.points)
        .map((leg) => ({
            mode: leg.mode,
            routeName: leg.route?.shortName,
            positions: polyline.decode(leg.legGeometry.points),
        }));

    const start = [legs[0].from.lat, legs[0].from.lon];
    const lastLeg = legs[legs.length - 1];
    const end = [lastLeg.to.lat, lastLeg.to.lon];

    const startColor = getTransitColorForMarker(legs, 0);
    const endColor = getTransitColorForMarker(legs, legs.length - 1);

    return (
        <div className="bg-white rounded-2xl shadow overflow-hidden">
            <div className="p-4 border-b">
                <h2 className="text-xl font-bold text-slate-900">
                    Selected Route Map
                </h2>

                <p className="text-sm text-slate-500">
                    The map updates when you choose a different route option.
                </p>

                <button
                    onClick={() => setShowLiveVehicles((value) => !value)}
                    className={`mt-3 rounded-full px-4 py-2 text-sm font-semibold transition ${showLiveVehicles
                            ? "bg-green-100 text-green-700"
                            : "bg-slate-100 text-slate-700"
                        }`}
                >
                    {showLiveVehicles ? "Hide live vehicles" : "Show live vehicles"}
                </button>
            </div>

            <MapContainer
                center={start}
                zoom={12}
                scrollWheelZoom={true}
                className="h-[620px] w-full"
            >
                <TileLayer
                    attribution="Map tiles &copy; HSL / Digitransit / OpenStreetMap contributors"
                    url="http://127.0.0.1:8000/api/map/tiles/{z}/{x}/{y}"
                    tileSize={512}
                    zoomOffset={-1}
                />

                <FitRouteBounds routeLines={routeLines} />

                <LiveVehiclesLayer
                    enabled={showLiveVehicles}
                    routeLines={routeLines}
                    selectedLegs={legs.filter((leg) => leg.route)}
                />

                {routeLines.map((line, index) => (
                    <Polyline
                        key={index}
                        positions={line.positions}
                        pathOptions={{
                            color: getLineColor(line.mode),
                            weight: line.mode === "WALK" ? 4 : 7,
                            opacity: line.mode === "WALK" ? 0.65 : 0.95,
                            dashArray: line.mode === "WALK" ? "8 8" : null,
                        }}
                    />
                ))}

                {legs.map((leg, index) => {
                    const markerColor = getTransitColorForMarker(legs, index);

                    return (
                        <CircleMarker
                            key={`stop-${index}`}
                            center={[leg.from.lat, leg.from.lon]}
                            radius={7}
                            pathOptions={{
                                color: markerColor,
                                fillColor: "#ffffff",
                                fillOpacity: 1,
                                weight: 5,
                                opacity: 1,
                            }}
                        >
                            <Popup>
                                {leg.mode}
                                {leg.route?.shortName ? ` ${leg.route.shortName}` : ""}:{" "}
                                {leg.from.name}
                            </Popup>
                        </CircleMarker>
                    );
                })}

                <CircleMarker
                    center={start}
                    radius={9}
                    pathOptions={{
                        color: startColor,
                        fillColor: "#ffffff",
                        fillOpacity: 1,
                        weight: 5,
                        opacity: 1,
                    }}
                >
                    <Popup>Start: {legs[0].from.name}</Popup>
                </CircleMarker>

                <CircleMarker
                    center={end}
                    radius={9}
                    pathOptions={{
                        color: endColor,
                        fillColor: "#ffffff",
                        fillOpacity: 1,
                        weight: 5,
                        opacity: 1,
                    }}
                >
                    <Popup>Destination: {lastLeg.to.name}</Popup>
                </CircleMarker>
            </MapContainer>
        </div>
    );
}

export default JourneyMap;