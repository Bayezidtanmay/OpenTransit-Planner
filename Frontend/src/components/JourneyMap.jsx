import { useEffect } from "react";
import {
    MapContainer,
    TileLayer,
    Polyline,
    Marker,
    Popup,
    useMap,
} from "react-leaflet";
import polyline from "@mapbox/polyline";
import "leaflet/dist/leaflet.css";

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

    return (
        <div className="bg-white rounded-2xl shadow overflow-hidden sticky top-6">
            <div className="p-4 border-b">
                <h2 className="text-xl font-bold text-slate-900">Selected Route Map</h2>
                <p className="text-sm text-slate-500">
                    The map updates when you choose a different route option.
                </p>
            </div>

            <MapContainer
                center={start}
                zoom={12}
                scrollWheelZoom={true}
                className="h-[560px] w-full"
            >
                <TileLayer
                    attribution='Map tiles &copy; HSL / Digitransit / OpenStreetMap contributors'
                    url="http://127.0.0.1:8000/api/map/tiles/{z}/{x}/{y}"
                    tileSize={512}
                    zoomOffset={-1}
                />

                <FitRouteBounds routeLines={routeLines} />

                <Marker position={start}>
                    <Popup>Start: {legs[0].from.name}</Popup>
                </Marker>

                <Marker position={end}>
                    <Popup>Destination: {lastLeg.to.name}</Popup>
                </Marker>

                {legs.map((leg, index) => (
                    <Marker key={`from-${index}`} position={[leg.from.lat, leg.from.lon]}>
                        <Popup>
                            {leg.mode}
                            {leg.route?.shortName ? ` ${leg.route.shortName}` : ""}:{" "}
                            {leg.from.name}
                        </Popup>
                    </Marker>
                ))}

                {routeLines.map((line, index) => (
                    <Polyline
                        key={index}
                        positions={line.positions}
                        pathOptions={{
                            color: getLineColor(line.mode),
                            weight: line.mode === "WALK" ? 4 : 7,
                            opacity: 0.85,
                            dashArray: line.mode === "WALK" ? "8 8" : null,
                        }}
                    />
                ))}
            </MapContainer>
        </div>
    );
}

export default JourneyMap;