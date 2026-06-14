import { useEffect, useState } from "react";
import {
    MapContainer,
    TileLayer,
    Polyline,
    Popup,
    useMap,
    Marker,
    Tooltip,
    GeoJSON,
} from "react-leaflet";
import L from "leaflet";
import polyline from "@mapbox/polyline";
import "leaflet/dist/leaflet.css";

import LiveVehiclesLayer from "./LiveVehiclesLayer";
import UserLocationMarker from "./UserLocationMarker";
import hslZones from "../data/hslZones.json";
import api from "../api";
import TransitStopsLayer from "./TransitStopsLayer";
import { getRequiredTicketZone } from "../utils/ticketZones";
import RouteAlerts from "./RouteAlerts";

const ORANGE_BUS_ROUTES = [
    "20", "30", "40", "200", "400", "500", "510", "520", "530",
    "560", "570", "600",
];

const isTransitLeg = (leg) => {
    if (!leg) return false;

    return leg.mode !== "WALK" && leg.mode !== "BICYCLE";
};

const isOrangeBus = (routeName = "") =>
    ORANGE_BUS_ROUTES.some((route) => routeName.startsWith(route));

const normalizeColor = (color) => {
    if (!color) return null;
    const cleanColor = color.toString().replace("#", "").trim();
    if (cleanColor.length !== 6) return null;
    return `#${cleanColor}`;
};

const formatStopTime = (seconds) => {
    if (seconds === null || seconds === undefined) return "—";

    if (typeof seconds === "string" && seconds.includes("T")) {
        return new Date(seconds).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
        });
    }

    const totalSeconds = Number(seconds);
    if (Number.isNaN(totalSeconds)) return "—";

    const hours = Math.floor(totalSeconds / 3600) % 24;
    const minutes = Math.floor((totalSeconds % 3600) / 60);

    return `${hours.toString().padStart(2, "0")}:${minutes
        .toString()
        .padStart(2, "0")}`;
};

const getZoneName = (feature) => {
    return (
        feature.properties?.zone ||
        feature.properties?.Zone ||
        feature.properties?.ZONE ||
        feature.properties?.vyohyke ||
        feature.properties?.Vyohyke ||
        feature.properties?.VYOHYKE ||
        feature.properties?.name ||
        feature.properties?.Name ||
        ""
    )
        .toString()
        .replace("Vyöhyke ", "")
        .replace("Zone ", "")
        .trim()
        .toUpperCase();
};

const getZoneStyle = (feature) => {
    const zone = getZoneName(feature);

    return {
        color: "#64748b",
        weight: 2,
        opacity: 0.55,
        fillOpacity: 0.045,
        fillColor:
            zone === "A"
                ? "#60a5fa"
                : zone === "B"
                    ? "#34d399"
                    : zone === "C"
                        ? "#fbbf24"
                        : "#f87171",
    };
};

const getPolygonCenter = (geometry) => {
    if (!geometry?.coordinates) return null;

    let points = [];

    if (geometry.type === "Polygon") {
        points = geometry.coordinates[0];
    }

    if (geometry.type === "MultiPolygon") {
        const biggestPolygon = geometry.coordinates.reduce((biggest, polygon) => {
            return polygon[0].length > biggest[0].length ? polygon : biggest;
        }, geometry.coordinates[0]);

        points = biggestPolygon[0];
    }

    if (!points.length) return null;

    const total = points.reduce(
        (sum, point) => ({
            lon: sum.lon + Number(point[0]),
            lat: sum.lat + Number(point[1]),
        }),
        { lon: 0, lat: 0 }
    );

    return [total.lat / points.length, total.lon / points.length];
};

const getZoneLabelIcon = (zone) =>
    L.divIcon({
        html: `
      <div style="
        width:48px;
        height:48px;
        border-radius:9999px;
        background:#007AC9;
        color:white;
        border:1px solid rgba(15,23,42,0.08);
        display:flex;
        align-items:center;
        justify-content:center;
        font-size:24px;
        font-weight:900;
        backdrop-filter: blur(2px);
        box-shadow:none;
      ">
        ${zone}
      </div>
    `,
        className: "hsl-zone-label",
        iconSize: [58, 58],
        iconAnchor: [29, 29],
    });

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

    const previousTransitLeg = [...legs]
        .slice(0, index)
        .reverse()
        .find(isTransitLeg);

    if (previousTransitLeg) return getRouteColor(previousTransitLeg);

    return "#007ac9";
};

const createStopIcon = (color, size = 16, isTransfer = false, mode = "") => {
    const isBus = mode === "BUS";

    return L.divIcon({
        html: isBus
            ? `
        <div style="
          width:${size + 12}px;
          height:${size + 12}px;
          border-radius:9999px;
          background:white;
          border:4px solid ${color};
          display:flex;
          align-items:center;
          justify-content:center;
          box-shadow:0 4px 12px rgba(15,23,42,0.28);
          box-sizing:border-box;
        ">
          <div style="
            width:${size - 2}px;
            height:${size - 2}px;
            border-radius:9999px;
            background:${color};
            border:2px solid white;
          "></div>
        </div>
      `
            : `
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
        iconSize: isBus ? [size + 12, size + 12] : [size, size],
        iconAnchor: isBus
            ? [(size + 12) / 2, (size + 12) / 2]
            : [size / 2, size / 2],
    });
};

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

function ServiceTimetable({ leg }) {
    const currentTripStops = leg?.trip?.stoptimes || [];
    const color = getRouteColor(leg);
    const routeName = leg?.route?.shortName || "Route";
    const stopId = leg?.from?.stop?.gtfsId;

    const [dailyDepartures, setDailyDepartures] = useState([]);
    const [scheduleLoading, setScheduleLoading] = useState(false);
    const [scheduleError, setScheduleError] = useState("");

    useEffect(() => {
        const fetchDailySchedule = async () => {
            if (!stopId || !routeName) {
                setDailyDepartures([]);
                return;
            }

            try {
                setScheduleLoading(true);
                setScheduleError("");

                const response = await api.get("/journeys/stop-schedule", {
                    params: {
                        stopId,
                        routeShortName: routeName,
                    },
                });

                setDailyDepartures(response.data.departures || []);
            } catch (error) {
                console.error("Stop schedule failed:", error);
                setScheduleError("Could not load daily departures.");
            } finally {
                setScheduleLoading(false);
            }
        };

        fetchDailySchedule();
    }, [stopId, routeName]);

    if (!currentTripStops.length) {
        return (
            <div className="bg-slate-50 p-4 lg:h-[720px] lg:overflow-y-auto text-sm text-slate-500">
                No timetable data available for this service.
            </div>
        );
    }

    const firstStop = currentTripStops[0];
    const lastStop = currentTripStops[currentTripStops.length - 1];

    const serviceStartTime =
        firstStop.realtimeDeparture ??
        firstStop.scheduledDeparture ??
        firstStop.realtimeArrival ??
        firstStop.scheduledArrival;

    const serviceEndTime =
        lastStop.realtimeArrival ??
        lastStop.scheduledArrival ??
        lastStop.realtimeDeparture ??
        lastStop.scheduledDeparture;

    return (
        <div className="border-t bg-slate-50 px-4 py-4">
            <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                    <h3 className="text-base font-bold text-slate-900">
                        Timetable for {routeName}
                    </h3>
                    <p className="text-sm text-slate-500">
                        Daily departures from {leg?.from?.name || "selected stop"}.
                    </p>
                </div>

                <div
                    className="rounded-lg px-3 py-1 text-sm font-black text-white"
                    style={{ backgroundColor: color }}
                >
                    {routeName}
                </div>
            </div>

            <div className="mb-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                    <div>
                        <div className="text-xs font-bold uppercase text-slate-400">
                            This trip starts
                        </div>
                        <div className="mt-1 text-lg font-black text-slate-900">
                            {formatStopTime(serviceStartTime)}
                        </div>
                        <div className="text-sm font-semibold text-slate-600">
                            {firstStop.stop?.name || "Unknown stop"}
                        </div>
                    </div>

                    <div className="text-xl font-black text-slate-300">→</div>

                    <div className="text-right">
                        <div className="text-xs font-bold uppercase text-slate-400">
                            This trip ends
                        </div>
                        <div className="mt-1 text-lg font-black text-slate-900">
                            {formatStopTime(serviceEndTime)}
                        </div>
                        <div className="text-sm font-semibold text-slate-600">
                            {lastStop.stop?.name || "Unknown stop"}
                        </div>
                    </div>
                </div>
            </div>

            <div className="mb-4 rounded-2xl border border-slate-200 bg-white">
                <div className="border-b border-slate-100 px-4 py-3">
                    <h4 className="font-bold text-slate-900">
                        All departures today
                    </h4>
                    <p className="text-sm text-slate-500">
                        From {leg?.from?.name || "this stop"}.
                    </p>
                </div>

                <div className="max-h-40 overflow-y-auto">
                    {scheduleLoading && (
                        <div className="px-4 py-4 text-sm text-slate-500">
                            Loading daily departures...
                        </div>
                    )}

                    {scheduleError && (
                        <div className="px-4 py-4 text-sm text-red-600">
                            {scheduleError}
                        </div>
                    )}

                    {!scheduleLoading &&
                        !scheduleError &&
                        dailyDepartures.length === 0 && (
                            <div className="px-4 py-4 text-sm text-slate-500">
                                No daily departures found for this route from this stop.
                            </div>
                        )}

                    {!scheduleLoading &&
                        dailyDepartures.map((departure, index) => {
                            const departureTime =
                                departure.realtimeDeparture ??
                                departure.scheduledDeparture;

                            return (
                                <div
                                    key={`${departure.trip?.gtfsId}-${index}`}
                                    className="grid grid-cols-[70px_1fr_auto] items-center gap-3 border-b border-slate-100 px-4 py-3 last:border-b-0"
                                >
                                    <div className="font-black text-slate-900">
                                        {formatStopTime(departureTime)}
                                    </div>

                                    <div>
                                        <div className="font-semibold text-slate-800">
                                            {departure.headsign || "Unknown destination"}
                                        </div>

                                        <div className="mt-0.5 text-xs font-semibold text-slate-400">
                                            {departure.trip?.route?.longName ||
                                                `Route ${routeName}`}
                                        </div>
                                    </div>

                                    <div
                                        className="rounded-md px-2 py-1 text-xs font-black text-white"
                                        style={{ backgroundColor: color }}
                                    >
                                        {routeName}
                                    </div>
                                </div>
                            );
                        })}
                </div>
            </div>

            <div className="max-h-40 overflow-y-auto rounded-xl border border-slate-200 bg-white">
                {currentTripStops.map((item, index) => {
                    const departure =
                        item.realtimeDeparture ??
                        item.scheduledDeparture ??
                        item.realtimeArrival ??
                        item.scheduledArrival;

                    return (
                        <div
                            key={`${item.stop?.gtfsId || item.stop?.name}-${index}`}
                            className="grid grid-cols-[70px_1fr_auto] items-center gap-3 border-b border-slate-100 px-4 py-3 last:border-b-0"
                        >
                            <div className="font-bold text-slate-900">
                                {formatStopTime(departure)}
                            </div>

                            <div>
                                <div className="font-semibold text-slate-800">
                                    {item.stop?.name || "Unknown stop"}
                                </div>

                                {item.stop?.code && (
                                    <div className="mt-0.5 text-xs font-semibold text-slate-400">
                                        Stop {item.stop.code}
                                    </div>
                                )}
                            </div>

                            <div
                                className="h-3 w-3 rounded-full border-2 border-white shadow"
                                style={{ backgroundColor: color }}
                            />
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function JourneyMap({ selectedRoute }) {
    const [showLiveVehicles, setShowLiveVehicles] = useState(false);
    const [showUserLocation, setShowUserLocation] = useState(false);
    const [selectedServiceLeg, setSelectedServiceLeg] = useState(null);
    const [showTicketModal, setShowTicketModal] = useState(false);
    const [selectedStopTripRoute, setSelectedStopTripRoute] = useState(null);

    if (!selectedRoute) {
        return (
            <div className="bg-white rounded-2xl shadow p-6 text-slate-500">
                Select a route option to see it on the map.
            </div>
        );
    }

    const legs = selectedRoute.node.legs;
    const ticketZone = getRequiredTicketZone(legs);

    const zoneLabels = [
        ...hslZones.features
            .map((feature) => ({
                zone: getZoneName(feature),
                position: getPolygonCenter(feature.geometry),
            }))
            .filter((label) => label.zone && label.position),

        {
            zone: "D",
            position: [60.16, 24.38],
        },
    ];

    const routeLines = legs
        .filter((leg) => leg.legGeometry?.points)
        .map((leg) => ({
            mode: leg.mode,
            routeName: leg.route?.shortName,
            positions: polyline.decode(leg.legGeometry.points),
            color: getRouteColor(leg),
            leg,
        }));

    const selectedServiceRouteLine = selectedServiceLeg?.trip?.pattern
        ?.patternGeometry?.points
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
        selectedStopTripRoute
            ? []
            : selectedServiceRouteLine.length > 0
                ? selectedServiceRouteLine
                : routeLines;

    const isServiceRouteMode = selectedServiceRouteLine.length > 0;

    const stopMarkers = [];
    const transferBadges = [];
    const uniqueStops = new Set();

    const addStop = (name, lat, lon, color, size = 16, isTransfer = false) => {
        if (!name || !lat || !lon) return;

        const key = `${name}-${lat}-${lon}`;

        if (uniqueStops.has(key)) {
            const existingStop = stopMarkers.find((marker) => marker.key === key);

            if (existingStop && isTransfer) {
                existingStop.size = size;
                existingStop.isTransfer = true;
                existingStop.color = color;
            }

            return;
        }

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

        if (currentLeg.mode === "WALK" && isTransitLeg(legs[i - 1]) && isTransitLeg(nextLeg)) {
            const walkDistance = Math.round(Number(currentLeg.distance || 0));

            addStop(
                currentLeg.from.name,
                currentLeg.from.lat,
                currentLeg.from.lon,
                getRouteColor(nextLeg),
                22,
                true
            );

            transferBadges.push({
                key: `walk-${i}`,
                position: [currentLeg.from.lat, currentLeg.from.lon],
                text: `Walk: ${walkDistance} m`,
            });

            continue;
        }

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

    const showStopTripRoute = async ({ tripId, routeShortName }) => {
        try {
            const response = await api.get("/journeys/trip-route", {
                params: { tripId },
            });

            const trip = response.data;

            if (!trip?.pattern?.patternGeometry?.points) {
                alert("Route geometry is not available for this departure.");
                return;
            }

            setSelectedStopTripRoute({
                routeShortName: routeShortName || trip.route?.shortName,
                routeColor: trip.route?.color
                    ? `#${trip.route.color.replace("#", "")}`
                    : "#007ac9",
                positions: polyline.decode(trip.pattern.patternGeometry.points),
            });
        } catch (error) {
            console.error("Trip route failed:", error);
            alert("Failed to load this route.");
        }
    };


    return (
        <div className="bg-white rounded-2xl shadow overflow-hidden">
            <div className="p-4 border-b">
                <h2 className="text-xl font-bold text-slate-900">
                    Selected Route Map
                </h2>

                <p className="text-sm text-slate-500">
                    {isServiceRouteMode
                        ? `Showing full service route ${selectedServiceLeg.route?.shortName}.`
                        : "The map updates when you choose a different route option."}
                </p>

                <div className="mt-3 flex flex-wrap gap-3">
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

                            {selectedStopTripRoute && (
                                <button
                                    onClick={() => setSelectedStopTripRoute(null)}
                                    className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                                >
                                    Back to journey route
                                </button>
                            )}
                        </>
                    )}
                </div>

                {!isServiceRouteMode && <RouteAlerts legs={legs} />}
                {!isServiceRouteMode && (
                    <div className="mt-4 flex items-center justify-between gap-4 rounded-2xl bg-blue-700 px-5 py-4 text-white">
                        <div>
                            <div className="text-sm font-semibold opacity-90">
                                Ticket required:
                            </div>

                            <div className="text-3xl font-black">
                                {ticketZone}
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={() => setShowTicketModal(true)}
                            className="rounded-full bg-white px-6 py-3 font-bold text-blue-700 transition hover:bg-blue-50"
                        >
                            Buy a ticket
                        </button>
                    </div>
                )}
            </div>

            <div
                className={
                    isServiceRouteMode
                        ? "grid lg:grid-cols-[420px_1fr]"
                        : "block"
                }
            >
                {isServiceRouteMode && (
                    <ServiceTimetable leg={selectedServiceLeg} />
                )}

                <MapContainer
                    center={start}
                    zoom={12}
                    scrollWheelZoom={true}
                    className={isServiceRouteMode ? "h-[720px] w-full" : "h-[620px] w-full"}
                >
                    <TileLayer
                        attribution="Map tiles &copy; HSL / Digitransit / OpenStreetMap contributors"
                        url="http://127.0.0.1:8000/api/map/tiles/{z}/{x}/{y}"
                        tileSize={512}
                        zoomOffset={-1}
                    />

                    <GeoJSON data={hslZones} style={getZoneStyle} interactive={false} />

                    {zoneLabels.map((label, index) => (
                        <Marker
                            key={`zone-${label.zone}-${index}`}
                            position={label.position}
                            icon={getZoneLabelIcon(label.zone)}
                            interactive={false}
                            zIndexOffset={500}
                        />
                    ))}

                    <TransitStopsLayer onSelectTripRoute={showStopTripRoute} />

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

                    {selectedStopTripRoute && (
                        <Polyline
                            positions={selectedStopTripRoute.positions}
                            pathOptions={{
                                color: selectedStopTripRoute.routeColor,
                                weight: 9,
                                opacity: 0.95,
                                lineCap: "round",
                                lineJoin: "round",
                            }}
                        />
                    )}

                    {!isServiceRouteMode && !selectedStopTripRoute &&
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

                    {!isServiceRouteMode && !selectedStopTripRoute &&
                        stopMarkers.map((marker) => (
                            <Marker
                                key={marker.key}
                                position={marker.position}
                                icon={createStopIcon(
                                    marker.color,
                                    marker.size,
                                    marker.isTransfer
                                )}
                                zIndexOffset={marker.isTransfer ? 2600 : 2000}
                            >
                                <Tooltip direction="top" offset={[0, -10]} opacity={1}>
                                    {marker.name}
                                </Tooltip>

                                <Popup>{marker.name}</Popup>
                            </Marker>
                        ))}

                    {!isServiceRouteMode && !selectedStopTripRoute &&
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
            {showTicketModal && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 px-4">
                    <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
                        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-100 text-3xl">
                            🎫
                        </div>

                        <h3 className="text-2xl font-black text-slate-900">
                            Ticket purchase unavailable
                        </h3>

                        <p className="mt-2 text-slate-600">
                            This is a view-only demo feature. Online ticket purchasing is not connected in this app.
                        </p>

                        <div className="mt-5 rounded-2xl bg-blue-50 p-4">
                            <div className="text-sm font-semibold text-blue-700">
                                Ticket required:
                            </div>

                            <div className="text-3xl font-black text-blue-700">
                                {ticketZone}
                            </div>
                        </div>

                        <button
                            onClick={() => setShowTicketModal(false)}
                            className="mt-6 w-full rounded-2xl bg-blue-700 px-5 py-3 font-bold text-white hover:bg-blue-800"
                        >
                            Got it
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default JourneyMap;