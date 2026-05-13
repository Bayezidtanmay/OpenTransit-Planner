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

    if (nextTransitLeg) {
        return getRouteColor(nextTransitLeg);
    }

    const previousTransitLeg = [...legs]
        .slice(0, index)
        .reverse()
        .find(isTransitLeg);

    if (previousTransitLeg) {
        return getRouteColor(previousTransitLeg);
    }

    return "#007ac9";
};

const getMinutesBetween = (startTime, endTime) => {
    const start = new Date(startTime).getTime();
    const end = new Date(endTime).getTime();

    if (Number.isNaN(start) || Number.isNaN(end)) return null;

    return Math.max(0, Math.round((end - start) / 60000));
};

const isSameStopTransfer = (walkLeg) => {
    if (!walkLeg) return false;

    const distance = Number(walkLeg.distance || 0);

    return distance <= 35;
};

const isSamePlace = (firstPlace, secondPlace) => {
    if (!firstPlace || !secondPlace) return false;

    const firstName = firstPlace.name?.trim().toLowerCase();
    const secondName = secondPlace.name?.trim().toLowerCase();

    const sameName = firstName && secondName && firstName === secondName;

    const latDiff = Math.abs(Number(firstPlace.lat) - Number(secondPlace.lat));
    const lonDiff = Math.abs(Number(firstPlace.lon) - Number(secondPlace.lon));

    const veryClose = latDiff < 0.00025 && lonDiff < 0.00025;

    return sameName || veryClose;
};

const createStopIcon = (color, size = 18, badge = null) => {
    const badgeHtml = badge
        ? `
      <div style="
        position:absolute;
        left:50%;
        top:-34px;
        transform:translateX(-50%);
        white-space:nowrap;
        background:${badge.type === "walk" ? "#111827" : "#ffffff"};
        color:${badge.type === "walk" ? "#ffffff" : "#111827"};
        border:2px solid ${color};
        border-radius:9999px;
        padding:4px 9px;
        font-size:12px;
        font-weight:800;
        box-shadow:0 3px 8px rgba(15,23,42,0.28);
      ">
        ${badge.label}
      </div>
    `
        : "";

    return L.divIcon({
        html: `
      <div style="
        position:relative;
        width:${size}px;
        height:${size}px;
      ">
        ${badgeHtml}
        <div style="
          width:${size}px;
          height:${size}px;
          border-radius:9999px;
          background:#ffffff;
          border:${badge ? 6 : 5}px solid ${color};
          box-shadow:0 2px 6px rgba(15,23,42,0.35);
          box-sizing:border-box;
        "></div>
      </div>
    `,
        className: "custom-hsl-stop-marker",
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
        popupAnchor: [0, -size / 2],
    });
};

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

const getMiddlePoint = (positions) => {
    if (!positions || positions.length === 0) return null;

    const middleIndex = Math.floor(positions.length / 2);

    return positions[middleIndex];
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
            routeName: leg.route?.shortName,
            leg,
            positions: polyline.decode(leg.legGeometry.points),
        }));

    const routeLabels = routeLines
        .filter((line) => isTransitLeg(line.leg) && line.routeName)
        .map((line, index) => ({
            key: `route-label-${index}-${line.routeName}`,
            position: getMiddlePoint(line.positions),
            leg: line.leg,
        }))
        .filter((label) => label.position);

    const transferMarkers = new Map();

    legs.forEach((leg, index) => {
        if (leg.mode !== "WALK") return;

        const previousLeg = legs[index - 1];
        const nextLeg = legs[index + 1];

        if (!previousLeg || !nextLeg) return;
        if (!isTransitLeg(previousLeg) || !isTransitLeg(nextLeg)) return;

        const transferColor = getRouteColor(nextLeg);
        const transferKey = `${leg.from.name}-${leg.from.lat}-${leg.from.lon}`;

        if (isSameStopTransfer(leg)) {
            const waitMinutes = getMinutesBetween(
                previousLeg.end.scheduledTime,
                nextLeg.start.scheduledTime
            );

            transferMarkers.set(transferKey, {
                name: leg.from.name,
                position: [leg.from.lat, leg.from.lon],
                color: transferColor,
                size: 28,
                badge: {
                    type: "wait",
                    label: `Wait: ${waitMinutes ?? 0} min`,
                },
            });

            return;
        }

        transferMarkers.set(transferKey, {
            name: `${leg.from.name} → ${leg.to.name}`,
            position: [leg.from.lat, leg.from.lon],
            color: transferColor,
            size: 26,
            badge: {
                type: "walk",
                label: `Walk: ${Math.round(Number(leg.distance || 0))} m`,
            },
        });
    });

    legs.forEach((leg, index) => {
        const nextLeg = legs[index + 1];

        if (!nextLeg) return;
        if (!isTransitLeg(leg) || !isTransitLeg(nextLeg)) return;
        if (!isSamePlace(leg.to, nextLeg.from)) return;

        const waitMinutes = getMinutesBetween(
            leg.end.scheduledTime,
            nextLeg.start.scheduledTime
        );

        const transferColor = getRouteColor(nextLeg);
        const transferKey = `${nextLeg.from.name}-${nextLeg.from.lat}-${nextLeg.from.lon}`;

        transferMarkers.set(transferKey, {
            name: nextLeg.from.name,
            position: [nextLeg.from.lat, nextLeg.from.lon],
            color: transferColor,
            size: 28,
            badge: {
                type: "wait",
                label: `Wait: ${waitMinutes ?? 0} min`,
            },
        });
    });

    const stopMarkers = [];
    const uniqueStops = new Set();

    const addStop = (name, lat, lon, color, size = 18) => {
        if (!name || !lat || !lon) return;

        const key = `${name}-${lat}-${lon}`;

        if (uniqueStops.has(key)) return;

        uniqueStops.add(key);

        const transferMarker = transferMarkers.get(key);

        stopMarkers.push({
            key,
            name,
            position: [lat, lon],
            color: transferMarker?.color || color,
            size: transferMarker?.size || size,
            badge: transferMarker?.badge || null,
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

                {routeLabels.map((label) => (
                    <Marker
                        key={label.key}
                        position={label.position}
                        icon={getRouteLabelIcon(label.leg)}
                        zIndexOffset={4500}
                    >
                        <Popup>
                            {label.leg.route?.shortName} — {label.leg.route?.longName}
                        </Popup>
                    </Marker>
                ))}

                {stopMarkers.map((marker) => (
                    <Marker
                        key={marker.key}
                        position={marker.position}
                        icon={createStopIcon(marker.color, marker.size, marker.badge)}
                        zIndexOffset={marker.badge ? 4000 : 2000}
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