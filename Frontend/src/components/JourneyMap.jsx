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

const isTransitLeg = (leg) => leg.mode !== "WALK" && leg.mode !== "BICYCLE";

const normalizeColor = (color) => {
    if (!color) return null;

    const cleanColor = color.toString().replace("#", "").trim();

    if (cleanColor.length !== 6) return null;

    return `#${cleanColor}`;
};

const getRouteColor = (leg) => {
    const mode = leg.mode;
    const route = leg.route?.shortName?.toUpperCase() || "";
    const apiRouteColor = normalizeColor(leg.route?.color);

    if (mode !== "WALK" && mode !== "BICYCLE" && apiRouteColor) {
        return apiRouteColor;
    }

    if (mode === "SUBWAY") return "#ff6319";
    if (mode === "TRAM") return "#00985f";
    if (mode === "RAIL") return "#8c4799";
    if (mode === "FERRY") return "#00b9e4";
    if (mode === "BICYCLE") return "#059669";
    if (mode === "WALK") return "#64748b";

    const orangeBusRoutes = [
        "20",
        "30",
        "40",
        "50",
        "200",
        "300",
        "400",
        "500",
        "510",
        "520",
        "530",
        "540",
        "550",
        "560",
        "570",
        "600",
    ];

    if (mode === "BUS" && orangeBusRoutes.includes(route)) {
        return "#ff5a1f";
    }

    if (mode === "BUS") return "#007ac9";

    return "#334155";
};

const getTransitColorForMarker = (legs, index) => {
    const currentLeg = legs[index];

    if (currentLeg && isTransitLeg(currentLeg)) {
        return getRouteColor(currentLeg);
    }

    const nextTransitLeg = legs.slice(index + 1).find(isTransitLeg);
    if (nextTransitLeg) return getRouteColor(nextTransitLeg);

    const previousTransitLeg = [...legs]
        .slice(0, index)
        .reverse()
        .find(isTransitLeg);

    if (previousTransitLeg) return getRouteColor(previousTransitLeg);

    return "#007ac9";
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
            color: getRouteColor(leg),
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
                    getRouteColor(leg)
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
                            color: line.color,
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