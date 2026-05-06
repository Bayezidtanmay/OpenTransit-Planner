import { useEffect, useMemo, useRef, useState } from "react";
import { Marker, Popup } from "react-leaflet";
import mqtt from "mqtt";
import L from "leaflet";

const normalize = (value) => value?.toString().trim().toUpperCase();

const secondsToHHMM = (seconds) => {
    if (seconds === null || seconds === undefined) return null;

    const normalizedSeconds = Number(seconds) % 86400;
    const hours = Math.floor(normalizedSeconds / 3600);
    const minutes = Math.floor((normalizedSeconds % 3600) / 60);

    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
};

const createVehicleIcon = (label, color) =>
    L.divIcon({
        html: `
      <div style="
        background:${color};
        min-width:34px;
        height:30px;
        padding:0 8px;
        border-radius:999px;
        display:flex;
        align-items:center;
        justify-content:center;
        color:white;
        font-size:13px;
        font-weight:700;
        border:2px solid white;
        box-shadow:0 3px 8px rgba(15,23,42,0.35);
      ">${label}</div>
    `,
        className: "",
        iconSize: [40, 30],
        iconAnchor: [20, 15],
        popupAnchor: [0, -15],
    });

const getVehicleMode = (vehicle) => {
    const route = vehicle.route || "";

    if (/^[A-Z]$/.test(route)) return "RAIL";
    return "BUS";
};

const getVehicleIcon = (vehicle) => {
    const colors = {
        BUS: "#2563eb",
        TRAM: "#16a34a",
        RAIL: "#9333ea",
        SUBWAY: "#ea580c",
        DEFAULT: "#475569",
    };

    return createVehicleIcon(
        vehicle.route || "Live",
        colors[vehicle.mode] || colors.DEFAULT
    );
};

const getDistance = (lat1, lon1, lat2, lon2) =>
    Math.abs(lat1 - lat2) + Math.abs(lon1 - lon2);

const directionMatches = (legDirection, vehicleDirection) => {
    if (legDirection === null || vehicleDirection === null) return true;

    return (
        Number(vehicleDirection) === Number(legDirection) ||
        Number(vehicleDirection) === Number(legDirection) + 1
    );
};

function LiveVehiclesLayer({ enabled, routeLines, selectedLegs = [] }) {
    const [vehicles, setVehicles] = useState({});
    const bufferRef = useRef({});

    const activeTransitLegs = useMemo(() => {
        return selectedLegs
            .filter((leg) => leg.route?.shortName && leg.trip)
            .map((leg) => {
                const firstStopDeparture =
                    leg.trip?.stoptimes?.[0]?.scheduledDeparture ?? null;

                return {
                    route: normalize(leg.route.shortName),
                    directionId:
                        leg.trip?.pattern?.directionId !== undefined
                            ? Number(leg.trip.pattern.directionId)
                            : null,
                    tripStartTime: secondsToHHMM(firstStopDeparture),
                    fromLat: leg.from.lat,
                    fromLon: leg.from.lon,
                    toLat: leg.to.lat,
                    toLon: leg.to.lon,
                    fromName: leg.from.name,
                    toName: leg.to.name,
                };
            });
    }, [selectedLegs]);

    const visibleVehicles = useMemo(() => {
        const allVehicles = Object.values(vehicles);
        const selected = [];

        activeTransitLegs.forEach((leg) => {
            const candidates = allVehicles
                .filter((vehicle) => normalize(vehicle.route) === leg.route)
                .filter((vehicle) => directionMatches(leg.directionId, vehicle.direction))
                .filter((vehicle) => {
                    if (!leg.tripStartTime || !vehicle.startTime) return true;
                    return vehicle.startTime === leg.tripStartTime;
                })
                .map((vehicle) => ({
                    ...vehicle,
                    boardingDistance: getDistance(
                        vehicle.lat,
                        vehicle.lon,
                        leg.fromLat,
                        leg.fromLon
                    ),
                }))
                .sort((a, b) => a.boardingDistance - b.boardingDistance);

            if (candidates[0]) selected.push(candidates[0]);
        });

        return Array.from(new Map(selected.map((v) => [v.id, v])).values());
    }, [vehicles, activeTransitLegs]);

    useEffect(() => {
        if (!enabled) {
            setVehicles({});
            bufferRef.current = {};
            return;
        }

        const client = mqtt.connect("wss://mqtt.hsl.fi:443", {
            reconnectPeriod: 5000,
            connectTimeout: 10000,
            clientId: `opentransit_${Math.random().toString(16).slice(2)}`,
        });

        client.on("connect", () => {
            console.log("Connected to HSL HFP MQTT");

            client.subscribe("/hfp/v2/journey/ongoing/vp/#", (error) => {
                if (error) {
                    console.error("HSL subscription failed:", error);
                } else {
                    console.log("Subscribed to HSL HFP vehicle positions");
                }
            });
        });

        client.on("message", (topic, message) => {
            try {
                const payload = JSON.parse(message.toString());
                const vehicle = payload.VP;

                if (!vehicle?.lat || !vehicle?.long || !vehicle?.desi) return;

                const route = normalize(vehicle.desi);
                const vehicleStartTime = vehicle.start;

                const exactTripExists = activeTransitLegs.some((leg) => {
                    const sameRoute = leg.route === route;
                    const sameDirection = directionMatches(
                        leg.directionId,
                        vehicle.dir !== undefined ? Number(vehicle.dir) : null
                    );
                    const sameStartTime =
                        !leg.tripStartTime ||
                        !vehicleStartTime ||
                        leg.tripStartTime === vehicleStartTime;

                    return sameRoute && sameDirection && sameStartTime;
                });

                if (!exactTripExists) return;

                const lat = vehicle.lat;
                const lon = vehicle.long;

                if (lat < 59.7 || lat > 60.7 || lon < 23.5 || lon > 25.8) return;

                const id = `${vehicle.oper}-${vehicle.veh}`;

                bufferRef.current[id] = {
                    id,
                    route: vehicle.desi,
                    direction: vehicle.dir !== undefined ? Number(vehicle.dir) : null,
                    startTime: vehicle.start,
                    mode: getVehicleMode({ route: vehicle.desi }),
                    lat,
                    lon,
                    speed: vehicle.spd,
                    heading: vehicle.hdg,
                    timestamp: vehicle.tst,
                };
            } catch (error) {
                console.error("HSL vehicle parse failed:", error);
            }
        });

        const interval = setInterval(() => {
            setVehicles((previous) => {
                const merged = {
                    ...previous,
                    ...bufferRef.current,
                };

                bufferRef.current = {};

                return Object.fromEntries(Object.entries(merged).slice(-150));
            });
        }, 2500);

        client.on("error", (error) => {
            console.error("HSL MQTT error:", error);
        });

        return () => {
            clearInterval(interval);
            client.end(true);
        };
    }, [enabled, activeTransitLegs]);

    if (!enabled) return null;

    return (
        <>
            {visibleVehicles.map((vehicle) => (
                <Marker
                    key={vehicle.id}
                    position={[vehicle.lat, vehicle.lon]}
                    icon={getVehicleIcon(vehicle)}
                >
                    <Popup>
                        <strong>Exact live vehicle for selected trip</strong>
                        <br />
                        Route: {vehicle.route}
                        <br />
                        Direction: {vehicle.direction ?? "Unknown"}
                        <br />
                        Trip start: {vehicle.startTime || "Unknown"}
                        <br />
                        Vehicle: {vehicle.id}
                        <br />
                        Speed:{" "}
                        {vehicle.speed ? `${Math.round(vehicle.speed * 3.6)} km/h` : "N/A"}
                        <br />
                        Updated:{" "}
                        {vehicle.timestamp
                            ? new Date(vehicle.timestamp).toLocaleTimeString()
                            : "N/A"}
                    </Popup>
                </Marker>
            ))}
        </>
    );
}

export default LiveVehiclesLayer;