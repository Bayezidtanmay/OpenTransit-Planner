import { useEffect, useState } from "react";
import { Marker, Popup, useMapEvents } from "react-leaflet";
import L from "leaflet";
import api from "../api";

const ORANGE_BUS_ROUTES = [
    "20", "30", "40", "200", "400", "500", "510", "520", "530",
    "560", "570", "600",
];

const isOrangeBusStop = (stop) => {
    const routes = stop.routes || [];

    return routes.some((route) =>
        ORANGE_BUS_ROUTES.some((orangeRoute) =>
            route.shortName?.startsWith(orangeRoute)
        )
    );
};

const getStopType = (stop) => {
    const routes = stop.routes || [];

    if (stop.vehicleMode === "SUBWAY" || routes.some((route) => route.mode === "SUBWAY")) return "METRO";
    if (stop.vehicleMode === "RAIL" || routes.some((route) => route.mode === "RAIL")) return "RAIL";
    if (stop.vehicleMode === "TRAM" || routes.some((route) => route.mode === "TRAM")) return "TRAM";
    if (stop.vehicleMode === "BUS" || routes.some((route) => route.mode === "BUS")) {
        return isOrangeBusStop(stop) ? "ORANGE_BUS" : "BUS";
    }

    return "BUS";
};

const getColor = (type) => {
    if (type === "ORANGE_BUS") return "#f97316";
    if (type === "METRO") return "#ca3f16";
    if (type === "RAIL") return "#8c4799";
    if (type === "TRAM") return "#00985f";
    return "#007ac9";
};

const formatBoardTime = (serviceDay, seconds) => {
    if (!serviceDay || seconds === null || seconds === undefined) return "—";

    const date = new Date((Number(serviceDay) + Number(seconds)) * 1000);

    return date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
    });
};

const getMinutesUntil = (serviceDay, seconds) => {
    if (!serviceDay || seconds === null || seconds === undefined) return "—";

    const departureMs = (Number(serviceDay) + Number(seconds)) * 1000;
    const diffMinutes = Math.round((departureMs - Date.now()) / 60000);

    if (diffMinutes <= 0) return "now";
    if (diffMinutes === 1) return "1 min";

    return `${diffMinutes} min`;
};

const getStopIcon = (stop, zoom) => {
    const type = getStopType(stop);
    const color = getColor(type);

    const isStationIcon = type === "METRO" || type === "RAIL";
    const showBigBusIcon = zoom >= 17 && (type === "BUS" || type === "ORANGE_BUS");

    if (!isStationIcon && !showBigBusIcon) {
        return L.divIcon({
            html: `
        <div style="
          width:4px;
          height:4px;
          border-radius:9999px;
          background:${color};
          border:1px solid white;
        "></div>
      `,
            className: "hsl-small-stop-dot",
            iconSize: [4, 4],
            iconAnchor: [2, 2],
            popupAnchor: [0, -6],
        });
    }

    const content = type === "METRO" ? "M" : "▣";

    return L.divIcon({
        html: `
      <div style="
        width:24px;
        height:24px;
        border-radius:${type === "METRO" ? "4px" : "6px"};
        background:${color};
        color:white;
        border:2px solid white;
        display:flex;
        align-items:center;
        justify-content:center;
        font-size:${type === "METRO" ? "19px" : "13px"};
        font-weight:900;
        line-height:1;
        box-shadow:0 2px 6px rgba(15,23,42,0.25);
      ">
        ${content}
      </div>
    `,
        className: "hsl-station-icon",
        iconSize: [24, 24],
        iconAnchor: [12, 12],
        popupAnchor: [0, -12],
    });
};

function TransitStopsLayer() {
    const [stops, setStops] = useState([]);
    const [mapInfo, setMapInfo] = useState(null);
    const [stopBoards, setStopBoards] = useState({});
    const [loadingStopId, setLoadingStopId] = useState(null);

    const updateMapInfo = (map) => {
        const center = map.getCenter();
        const zoom = map.getZoom();
        const bounds = map.getBounds();
        const northEast = bounds.getNorthEast();

        let maxRadius = 3500;

        if (zoom <= 10) maxRadius = 7000;
        if (zoom <= 8) maxRadius = 12000;

        const radius = Math.min(
            maxRadius,
            Math.max(800, Math.round(center.distanceTo(northEast)))
        );

        setMapInfo({
            lat: center.lat,
            lon: center.lng,
            zoom,
            radius,
        });
    };

    const map = useMapEvents({
        moveend: () => updateMapInfo(map),
        zoomend: () => updateMapInfo(map),
    });

    useEffect(() => {
        updateMapInfo(map);
    }, [map]);

    useEffect(() => {
        const fetchStops = async () => {
            if (!mapInfo) return;

            try {
                const response = await api.get("/journeys/map-stops", {
                    params: {
                        lat: mapInfo.lat,
                        lon: mapInfo.lon,
                        radius: mapInfo.radius,
                    },
                });

                setStops((previousStops) => {
                    const stopMap = new Map();

                    previousStops.forEach((stop) => {
                        stopMap.set(stop.gtfsId, stop);
                    });

                    (response.data.stops || []).forEach((stop) => {
                        stopMap.set(stop.gtfsId, stop);
                    });

                    return Array.from(stopMap.values());
                });
            } catch (error) {
                console.error("Map stops failed:", error);
            }
        };

        const delay = setTimeout(fetchStops, 500);
        return () => clearTimeout(delay);
    }, [mapInfo]);

    const fetchStopBoard = async (stopId) => {
        if (!stopId || stopBoards[stopId]) return;

        try {
            setLoadingStopId(stopId);

            const response = await api.get("/journeys/stop-board", {
                params: { stopId },
            });

            setStopBoards((previousBoards) => ({
                ...previousBoards,
                [stopId]: response.data,
            }));
        } catch (error) {
            console.error("Stop board failed:", error);
        } finally {
            setLoadingStopId(null);
        }
    };

    return (
        <>
            {stops.map((stop) => {
                const board = stopBoards[stop.gtfsId];
                const departures = board?.stoptimesWithoutPatterns || [];

                return (
                    <Marker
                        key={stop.gtfsId}
                        position={[stop.lat, stop.lon]}
                        icon={getStopIcon(stop, mapInfo?.zoom || 13)}
                        zIndexOffset={700}
                        eventHandlers={{
                            popupopen: () => fetchStopBoard(stop.gtfsId),
                        }}
                    >
                        <Popup>
                            <div className="min-w-[240px]">
                                <div className="font-black text-slate-900">
                                    {stop.name}
                                </div>

                                {stop.code && (
                                    <div className="text-sm text-slate-500">
                                        Stop {stop.code}
                                    </div>
                                )}

                                <div className="mt-3 border-t border-slate-200 pt-3">
                                    <div className="mb-2 text-xs font-black uppercase text-slate-400">
                                        Live departures
                                    </div>

                                    {loadingStopId === stop.gtfsId && (
                                        <div className="text-sm font-semibold text-slate-500">
                                            Loading departures...
                                        </div>
                                    )}

                                    {loadingStopId !== stop.gtfsId && departures.length === 0 && (
                                        <div className="text-sm font-semibold text-slate-500">
                                            No departures available.
                                        </div>
                                    )}

                                    {departures.slice(0, 6).map((item, index) => {
                                        const departure =
                                            item.realtimeDeparture ??
                                            item.scheduledDeparture;

                                        const route = item.trip?.route;
                                        const routeColor = route?.color
                                            ? `#${route.color.replace("#", "")}`
                                            : "#007ac9";

                                        return (
                                            <div
                                                key={`${item.trip?.gtfsId}-${index}`}
                                                className="grid grid-cols-[46px_1fr_52px] items-center gap-2 border-b border-slate-100 py-2 last:border-b-0"
                                            >
                                                <div
                                                    className="rounded-md px-2 py-1 text-center text-xs font-black text-white"
                                                    style={{ backgroundColor: routeColor }}
                                                >
                                                    {route?.shortName || "?"}
                                                </div>

                                                <div className="min-w-0">
                                                    <div className="truncate text-sm font-bold text-slate-800">
                                                        {item.headsign || route?.longName || "Unknown destination"}
                                                    </div>

                                                    <div className="text-xs font-semibold text-slate-400">
                                                        {formatBoardTime(item.serviceDay, departure)}
                                                    </div>
                                                </div>

                                                <div className="text-right text-sm font-black text-blue-700">
                                                    {getMinutesUntil(item.serviceDay, departure)}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </Popup>
                    </Marker>
                );
            })}
        </>
    );
}

export default TransitStopsLayer;