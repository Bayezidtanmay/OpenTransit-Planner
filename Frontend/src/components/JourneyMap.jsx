import { useEffect, useState } from "react";
import {
    MapContainer,
    TileLayer,
    Polyline,
    Popup,
    useMap,
    Marker,
} from "react-leaflet";
import L from "leaflet";
import polyline from "@mapbox/polyline";
import "leaflet/dist/leaflet.css";
import LiveVehiclesLayer from "./LiveVehiclesLayer";
import UserLocationMarker from "./UserLocationMarker";

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

const isTransitLeg = (leg) => leg.mode !== "WALK" && leg.mode !== "BICYCLE";

const getTransitColorForMarker = (legs, index) => {
    const currentLeg = legs[index];

    if (currentLeg && isTransitLeg(currentLeg)) {
        return getLineColor(currentLeg.mode);
    }

    const nextTransitLeg = legs.slice(index + 1).find(isTransitLeg);
    if (nextTransitLeg) return getLineColor(nextTransitLeg.mode);

    const previousTransitLeg = [...legs]
        .slice(0, index)
        .reverse()
        .find(isTransitLeg);

    if (previousTransitLeg) return getLineColor(previousTransitLeg.mode);

    return "#2563eb";
};

const createStopIcon = (color, size = 18) =>
    L.divIcon({
        html: `
      <div style="
        width:${size}px;
        height:${size}px;
        border-radius:9999px;
        background:#ffffff;
        border:5px solid ${color};
        box-shadow:0 2px 6px rgba(15,23,42,0.35);
        box-sizing:border-box;
      "></div>
    `,
        className: "custom-hsl-stop-marker",
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
        popupAnchor: [0, -size / 2],
    });

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
    const [showUserLocation, setShowUserLocation] = useState(false);

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
            positions: polyline.decode(leg.legGeometry.points),
        }));

    const stopMarkers = [];
    const uniqueStops = new Set();

    const addStop = (name, lat, lon, color, size = 18) => {
        if (!name || !lat || !lon) return;

        const key = `${name}-${lat}-${lon}`;

        if (uniqueStops.has(key)) return;

        uniqueStops.add(key);

        stopMarkers.push({
            key,
            name,
            position: [lat, lon],
            color,
            size,
        });
    };

    legs.forEach((leg, index) => {
        const markerColor = getTransitColorForMarker(legs, index);

        addStop(leg.from.name, leg.from.lat, leg.from.lon, markerColor);

        if (isTransitLeg(leg) && Array.isArray(leg.intermediatePlaces)) {
            leg.intermediatePlaces.forEach((place) => {
                addStop(
                    place.stop?.name || place.name,
                    place.lat,
                    place.lon,
                    getLineColor(leg.mode)
                );
            });
        }

        addStop(leg.to.name, leg.to.lat, leg.to.lon, markerColor);
    });

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

                <div className="flex flex-wrap gap-2">
                    <button
                        onClick={() => setShowLiveVehicles((value) => !value)}
                        className={`mt-3 rounded-full px-4 py-2 text-sm font-semibold transition ${showLiveVehicles
                                ? "bg-green-100 text-green-700"
                                : "bg-slate-100 text-slate-700"
                            }`}
                    >
                        {showLiveVehicles ? "Hide live vehicles" : "Show live vehicles"}
                    </button>

                    <button
                        onClick={() => setShowUserLocation((value) => !value)}
                        className={`mt-3 rounded-full px-4 py-2 text-sm font-semibold transition ${showUserLocation
                                ? "bg-sky-100 text-sky-700"
                                : "bg-slate-100 text-slate-700"
                            }`}
                    >
                        {showUserLocation ? "Hide my location" : "Show my location"}
                    </button>
                </div>
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

                {stopMarkers.map((marker) => (
                    <Marker
                        key={marker.key}
                        position={marker.position}
                        icon={createStopIcon(marker.color, marker.size)}
                        zIndexOffset={2000}
                    >
                        <Popup>{marker.name}</Popup>
                    </Marker>
                ))}

                <Marker
                    position={start}
                    icon={createStopIcon(startColor, 20)}
                    zIndexOffset={3000}
                >
                    <Popup>Start: {legs[0].from.name}</Popup>
                </Marker>

                <Marker
                    position={end}
                    icon={createStopIcon(endColor, 20)}
                    zIndexOffset={3000}
                >
                    <Popup>Destination: {lastLeg.to.name}</Popup>
                </Marker>

                <LiveVehiclesLayer
                    enabled={showLiveVehicles}
                    routeLines={routeLines}
                    selectedLegs={legs.filter((leg) => leg.route)}
                />

                <UserLocationMarker enabled={showUserLocation} />
            </MapContainer>
        </div>
    );
}

export default JourneyMap;