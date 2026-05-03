import { MapContainer, TileLayer, Polyline, Marker, Popup } from "react-leaflet";
import polyline from "@mapbox/polyline";
import "leaflet/dist/leaflet.css";

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
    const endLeg = legs[legs.length - 1];
    const end = [endLeg.to.lat, endLeg.to.lon];

    return (
        <div className="bg-white rounded-2xl shadow overflow-hidden">
            <div className="p-4 border-b">
                <h2 className="text-xl font-bold text-slate-900">Route Map</h2>
                <p className="text-sm text-slate-500">
                    Visual route preview using OpenStreetMap and Leaflet.
                </p>
            </div>

            <MapContainer
                center={start}
                zoom={12}
                scrollWheelZoom={true}
                className="h-125 w-full"
            >
                <TileLayer
                    attribution="&copy; OpenStreetMap contributors"
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                <Marker position={start}>
                    <Popup>Start: {legs[0].from.name}</Popup>
                </Marker>

                <Marker position={end}>
                    <Popup>Destination: {endLeg.to.name}</Popup>
                </Marker>

                {routeLines.map((line, index) => (
                    <Polyline
                        key={index}
                        positions={line.positions}
                        weight={6}
                        opacity={0.8}
                    />
                ))}
            </MapContainer>
        </div>
    );
}

export default JourneyMap;