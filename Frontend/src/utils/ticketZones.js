import hslZones from "../data/hslZones.json";

const ZONE_ORDER = ["A", "B", "C", "D"];

const getZoneName = (feature) => {
    return (
        feature.properties?.zone ||
        feature.properties?.Zone ||
        feature.properties?.ZONE ||
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

const isPointInRing = ([lat, lon], ring) => {
    let inside = false;

    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        const xi = ring[i][1];
        const yi = ring[i][0];
        const xj = ring[j][1];
        const yj = ring[j][0];

        const intersects =
            yi > lat !== yj > lat &&
            lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;

        if (intersects) inside = !inside;
    }

    return inside;
};

const isPointInGeometry = (point, geometry) => {
    if (!geometry?.coordinates) return false;

    if (geometry.type === "Polygon") {
        return isPointInRing(point, geometry.coordinates[0]);
    }

    if (geometry.type === "MultiPolygon") {
        return geometry.coordinates.some((polygon) =>
            isPointInRing(point, polygon[0])
        );
    }

    return false;
};

const getZoneForPoint = (lat, lon) => {
    if (!lat || !lon) return null;

    const feature = hslZones.features.find((item) =>
        isPointInGeometry([Number(lat), Number(lon)], item.geometry)
    );

    return feature ? getZoneName(feature) : null;
};

const getRoutePoints = (legs) => {
    const points = [];

    legs.forEach((leg) => {
        if (leg.from?.lat && leg.from?.lon) {
            points.push([leg.from.lat, leg.from.lon]);
        }

        if (Array.isArray(leg.intermediatePlaces)) {
            leg.intermediatePlaces.forEach((place) => {
                if (place.lat && place.lon) {
                    points.push([place.lat, place.lon]);
                }
            });
        }

        if (leg.to?.lat && leg.to?.lon) {
            points.push([leg.to.lat, leg.to.lon]);
        }
    });

    return points;
};

const buildTicketZone = (zones) => {
    const uniqueZones = [...new Set(zones)]
        .filter((zone) => ZONE_ORDER.includes(zone))
        .sort((a, b) => ZONE_ORDER.indexOf(a) - ZONE_ORDER.indexOf(b));

    if (uniqueZones.length === 0) return "AB";

    let firstIndex = ZONE_ORDER.indexOf(uniqueZones[0]);
    let lastIndex = ZONE_ORDER.indexOf(uniqueZones[uniqueZones.length - 1]);

    if (firstIndex === lastIndex) {
        if (uniqueZones[0] === "A") lastIndex = 1;
        else if (uniqueZones[0] === "B") firstIndex = 0;
        else if (uniqueZones[0] === "C") firstIndex = 1;
        else if (uniqueZones[0] === "D") firstIndex = 2;
    }

    return ZONE_ORDER.slice(firstIndex, lastIndex + 1).join("");
};

export const getRequiredTicketZone = (legs) => {
    const points = getRoutePoints(legs);

    const zones = points
        .map(([lat, lon]) => getZoneForPoint(lat, lon))
        .filter(Boolean);

    return buildTicketZone(zones);
};