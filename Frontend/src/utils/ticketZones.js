import hslZones from "../data/hslZones.json";

const ZONE_ORDER = ["A", "B", "C", "D"];

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

const isPointInRing = ([lat, lon], ring) => {
  let inside = false;

  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = Number(ring[i][0]); // longitude
    const yi = Number(ring[i][1]); // latitude
    const xj = Number(ring[j][0]); // longitude
    const yj = Number(ring[j][1]); // latitude

    const intersects =
      yi > lat !== yj > lat &&
      lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;

    if (intersects) inside = !inside;
  }

  return inside;
};

const isPointInPolygon = (point, polygon) => {
  if (!polygon?.length) return false;

  const outerRing = polygon[0];

  return isPointInRing(point, outerRing);
};

const isPointInGeometry = (point, geometry) => {
  if (!geometry?.coordinates) return false;

  if (geometry.type === "Polygon") {
    return isPointInPolygon(point, geometry.coordinates);
  }

  if (geometry.type === "MultiPolygon") {
    return geometry.coordinates.some((polygon) =>
      isPointInPolygon(point, polygon)
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
    if (uniqueZones[0] === "B") firstIndex = 0;
    if (uniqueZones[0] === "C") firstIndex = 1;
    if (uniqueZones[0] === "D") firstIndex = 2;
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