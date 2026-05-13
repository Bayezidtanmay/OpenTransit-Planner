import { useEffect, useState } from "react";
import {
    MapContainer,
    TileLayer,
    Polyline,
    Popup,
    useMap,
    Marker,
    Tooltip,
} from "react-leaflet";
import L from "leaflet";
import polyline from "@mapbox/polyline";
import "leaflet/dist/leaflet.css";

import LiveVehiclesLayer from "./LiveVehiclesLayer";
import UserLocationMarker from "./UserLocationMarker";

const ORANGE_BUS_ROUTES = [
    "20", "30", "40", "200", "400", "500", "510", "520", "530",
    "540", "550", "560", "570", "600",
];

const isTransitLeg = (leg) => leg.mode !== "WALK" && leg.mode !== "BICYCLE";

const isOrangeBus = (routeName = "") =>
    ORANGE_BUS_ROUTES.some((route) => routeName.startsWith(route));

const normalizeColor = (color) => {
    if (!color) return null;
    const cleanColor = color.toString().replace("#", "").trim();
    if (cleanColor.length !== 6) return null;
    return `#${cleanColor}`;
};

const getRouteColor = (leg) => {
    const apiRouteColor = normalizeColor(leg.route?.color);
    const routeName = leg.route?.shortName || "";

    if (leg.mode !== "WALK" && leg.mode !== "BICYCLE" && apiRouteColor) {
        return apiRouteColor;
    }

    if (leg.mode === "BUS") return isOrangeBus(routeName) ? "#f97316" : "#007ac9";
    if (leg.mode === "TRAM") return "#00985f";
    if (leg.mode === "RAIL") return "#8c4799";
    if (leg.mode === "SUBWAY") return "#ff6319";
    if (leg.mode === "FERRY") return "#00b9e4";
    if (leg.mode === "WALK") return "#64748b";

    return "#334155";
};

const getTransitColorForMarker = (legs, index) => {
    const currentLeg = legs[index];

    if (currentLeg && isTransitLeg(currentLeg)) return getRouteColor(currentLeg);

    const nextTransitLeg = legs.slice(index + 1).find(isTransitLeg);
    if (nextTransitLeg) return getRouteColor(nextTransitLeg);

    const previousTransitLeg = [...legs].slice(0, index).reverse().find(isTransitLeg);
    if (previousTransitLeg) return getRouteColor(previousTransitLeg);

    return "#007ac9";
};

const createStopIcon = (color, size = 16, isTransfer = false) =>
    L.divIcon({
        html: `
      <div style="
        width:${size}px;
        height:${size}px;
        border-radius:9999px;
        background:#ffffff;
        border:${isTransfer ? 5 : 4}px solid ${color};
        box-shadow:0 2px 8px rgba(15,23,42,0.35);
        box-sizing:border-box;
      "></div>
    `,
        className: "custom-hsl-stop-marker",
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
    });

const getTransferBadgeIcon = (text) =>
    L.divIcon({
        html: `
      <div style="
        background:white;
        color:#0f172a;
        border:3px solid #007ac9;
        border-radius:9999px;
        padding:6px 14px;
        font-size:14px;
        font-weight:800;
        box-shadow:0 2px 8px rgba(15,23,42,0.25);
        white-space:nowrap;
      ">
        ${text}
      </div>
    `,
        className: "transfer-badge-marker",
        iconSize: [120, 38],
        iconAnchor: [60, 44],
    });

const getRouteLabelIcon = (leg) => {
    const color = getRouteColor(leg);
    const routeName = leg.route?.shortName || "";

    return L.divIcon({
        html: `
      <div style="
        display:flex;
        align-items:center;
        justify-content:center;
        background:${color};
        color:white;
        border:3px solid white;
        border-radius:8px;
        padding:5px 12px;
        font-size:15px;
        font-weight:900;
        line-height:1;
        box-shadow:0 3px 10px rgba(15,23,42,0.35);
        white-space:nowrap;
        min-width:44px;
        cursor:pointer;
      ">
        ${routeName}
      </div>
    `,
        className: "route-number-marker",
        iconSize: [60, 34],
        iconAnchor: [30, 17],
        popupAnchor: [0, -18],
    });
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
    const [showUserLocation, setShowUserLocation] = useState(false);
    const [selectedServiceLeg, setSelectedServiceLeg] = useState(null);

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
            color: getRouteColor(leg),
            leg,
        }));

    const selectedServiceRouteLine = selectedServiceLeg?.trip?.pattern?.patternGeometry?.points
        ? [
            {
                mode: selectedServiceLeg.mode,
                routeName: selectedServiceLeg.route?.shortName,
                positions: polyline.decode(
                    selectedServiceLeg.trip.pattern.patternGeometry.points
                ),
                color: getRouteColor(selectedServiceLeg),
                leg: selectedServiceLeg,
            },
        ]
        : [];

    const mapLines =
        selectedServiceRouteLine.length > 0 ? selectedServiceRouteLine : routeLines;

    const stopMarkers = [];
    const transferBadges = [];
    const uniqueStops = new Set();

    const addStop = (name, lat, lon, color, size = 16, isTransfer = false) => {
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
            isTransfer,
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

    for (let i = 0; i < legs.length - 1; i++) {
        const currentLeg = legs[i];
        const nextLeg = legs[i + 1];

        if (!isTransitLeg(currentLeg) || !isTransitLeg(nextLeg)) continue;

        const sameStop = currentLeg.to.name === nextLeg.from.name;

        if (sameStop) {
            const waitMinutes = Math.round(
                (new Date(nextLeg.start.scheduledTime).getTime() -
                    new Date(currentLeg.end.scheduledTime).getTime()) /
                60000
            );

            addStop(
                currentLeg.to.name,
                currentLeg.to.lat,
                currentLeg.to.lon,
                getRouteColor(nextLeg),
                22,
                true
            );

            transferBadges.push({
                key: `wait-${i}`,
                position: [currentLeg.to.lat, currentLeg.to.lon],
                text: `Wait: ${waitMinutes} min`,
            });
        }
    }

    const routeLabels = routeLines
        .filter((line) => isTransitLeg(line.leg))
        .map((line, index) => {
            const middleIndex = Math.floor(line.positions.length / 2);

            return {
                key: `route-label-${index}`,
                position: line.positions[middleIndex],
                leg: line.leg,
            };
        });

    const start = [legs[0].from.lat, legs[0].from.lon];
    const isServiceRouteMode = selectedServiceRouteLine.length > 0;

    return (
        <div className="bg-white rounded-2xl shadow overflow-hidden">
            <div className="p-4 border-b">
                <h2 className="text-xl font-bold text-slate-900">Selected Route Map</h2>

                <p className="text-sm text-slate-500">
                    {isServiceRouteMode
                        ? `Showing full service route ${selectedServiceLeg.route?.shortName}.`
                        : "The map updates when you choose a different route option."}
                </p>

                <div className="mt-3 flex flex-wrap gap-3">
                    {isServiceRouteMode && (
                        <button
                            onClick={() => setSelectedServiceLeg(null)}
                            className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                        >
                            Back to journey route
                        </button>
                    )}

                    {!isServiceRouteMode && (
                        <>
                            <button
                                onClick={() => setShowLiveVehicles((value) => !value)}
                                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${showLiveVehicles
                                    ? "bg-green-100 text-green-700"
                                    : "bg-slate-100 text-slate-700"
                                    }`}
                            >
                                {showLiveVehicles ? "Hide live vehicles" : "Show live vehicles"}
                            </button>

                            <button
                                onClick={() => setShowUserLocation((value) => !value)}
                                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${showUserLocation
                                    ? "bg-blue-100 text-blue-700"
                                    : "bg-slate-100 text-slate-700"
                                    }`}
                            >
                                {showUserLocation ? "Hide my location" : "Show my location"}
                            </button>
                        </>
                    )}
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

                <FitRouteBounds routeLines={mapLines} />

                {mapLines.map((line, index) => (
                    <Polyline
                        key={`${line.routeName}-${index}`}
                        positions={line.positions}
                        pathOptions={{
                            color: line.color,
                            weight: isServiceRouteMode ? 8 : line.mode === "WALK" ? 4 : 7,
                            opacity: line.mode === "WALK" ? 0.65 : 0.95,
                            dashArray: line.mode === "WALK" ? "8 8" : null,
                            lineCap: "round",
                            lineJoin: "round",
                        }}
                    />
                ))}

                {!isServiceRouteMode &&
                    routeLabels.map((label) => (
                        <Marker
                            key={label.key}
                            position={label.position}
                            icon={getRouteLabelIcon(label.leg)}
                            zIndexOffset={2500}
                            eventHandlers={{
                                click: () => setSelectedServiceLeg(label.leg),
                            }}
                        >
                            <Popup>
                                Click badge to show full service route{" "}
                                {label.leg.route?.shortName}
                            </Popup>
                        </Marker>
                    ))}

                {!isServiceRouteMode &&
                    stopMarkers.map((marker) => (
                        <Marker
                            key={marker.key}
                            position={marker.position}
                            icon={createStopIcon(marker.color, marker.size, marker.isTransfer)}
                            zIndexOffset={marker.isTransfer ? 2600 : 2000}
                        >
                            <Tooltip direction="top" offset={[0, -10]} opacity={1}>
                                {marker.name}
                            </Tooltip>

                            <Popup>{marker.name}</Popup>
                        </Marker>
                    ))}

                {!isServiceRouteMode &&
                    transferBadges.map((badge) => (
                        <Marker
                            key={badge.key}
                            position={badge.position}
                            icon={getTransferBadgeIcon(badge.text)}
                            interactive={false}
                            zIndexOffset={3000}
                        />
                    ))}

                {!isServiceRouteMode && (
                    <>
                        <LiveVehiclesLayer
                            enabled={showLiveVehicles}
                            routeLines={routeLines}
                            selectedLegs={legs.filter((leg) => leg.route)}
                        />

                        <UserLocationMarker enabled={showUserLocation} />
                    </>
                )}
            </MapContainer>
        </div>
    );
}

export default JourneyMap;