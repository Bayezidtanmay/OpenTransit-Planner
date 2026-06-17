import { useEffect, useRef, useState } from "react";
import { Circle, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";

const userIcon = L.divIcon({
    html: `
    <div style="
      width:24px;
      height:24px;
      border-radius:9999px;
      background:#0ea5e9;
      border:4px solid white;
      box-shadow:0 0 0 5px rgba(14,165,233,0.25), 0 2px 10px rgba(15,23,42,0.35);
      box-sizing:border-box;
    "></div>
  `,
    className: "user-location-marker",
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12],
});

const interpolate = (from, to, progress) => {
    return [
        from[0] + (to[0] - from[0]) * progress,
        from[1] + (to[1] - from[1]) * progress,
    ];
};

function UserLocationMarker({ enabled }) {
    const map = useMap();

    const markerRef = useRef(null);
    const animationRef = useRef(null);
    const currentPositionRef = useRef(null);

    const [position, setPosition] = useState(null);
    const [accuracy, setAccuracy] = useState(null);

    const animateToPosition = (nextPosition) => {
        const marker = markerRef.current;

        if (!marker || !currentPositionRef.current) {
            currentPositionRef.current = nextPosition;
            setPosition(nextPosition);
            return;
        }

        const startPosition = currentPositionRef.current;
        const startTime = performance.now();
        const duration = 900;

        if (animationRef.current) {
            cancelAnimationFrame(animationRef.current);
        }

        const animate = (now) => {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const smoothProgress = 1 - Math.pow(1 - progress, 3);

            const animatedPosition = interpolate(
                startPosition,
                nextPosition,
                smoothProgress
            );

            currentPositionRef.current = animatedPosition;
            setPosition(animatedPosition);

            if (markerRef.current) {
                markerRef.current.setLatLng(animatedPosition);
            }

            if (progress < 1) {
                animationRef.current = requestAnimationFrame(animate);
            } else {
                currentPositionRef.current = nextPosition;
                setPosition(nextPosition);
            }
        };

        animationRef.current = requestAnimationFrame(animate);
    };

    useEffect(() => {
        if (!enabled) {
            setPosition(null);
            setAccuracy(null);
            currentPositionRef.current = null;

            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }

            return;
        }

        if (!navigator.geolocation) {
            alert("Geolocation is not supported by your browser.");
            return;
        }

        const watchId = navigator.geolocation.watchPosition(
            (location) => {
                const lat = location.coords.latitude;
                const lon = location.coords.longitude;
                const nextPosition = [lat, lon];

                setAccuracy(location.coords.accuracy || null);
                animateToPosition(nextPosition);
            },
            (error) => {
                console.error("Live location failed:", error);
                alert("Unable to track your live location.");
            },
            {
                enableHighAccuracy: false,
                maximumAge: 60000,
                timeout: 30000,
            }
        );

        return () => {
            navigator.geolocation.clearWatch(watchId);

            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, [enabled]);

    const centerToUser = () => {
        if (position) {
            map.setView(position, 17, {
                animate: true,
                duration: 0.6,
            });
        }
    };

    if (!enabled || !position) return null;

    return (
        <>
            {accuracy && (
                <Circle
                    center={position}
                    radius={accuracy}
                    pathOptions={{
                        color: "#0ea5e9",
                        fillColor: "#0ea5e9",
                        fillOpacity: 0.12,
                        weight: 1,
                    }}
                />
            )}

            <Marker
                ref={markerRef}
                position={position}
                icon={userIcon}
                zIndexOffset={5000}
                eventHandlers={{
                    click: centerToUser,
                }}
            >
                <Popup>Your live location</Popup>
            </Marker>
        </>
    );
}

export default UserLocationMarker;