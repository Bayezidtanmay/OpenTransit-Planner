import { useEffect, useRef, useState } from "react";
import {
    BusFront,
    Building2,
    MapPin,
    Navigation,
    Train,
    TramFront,
} from "lucide-react";
import api from "../api";

const getPlaceIcon = (place) => {
    const layer = place.properties?.layer;
    const modes = place.properties?.addendum?.GTFS?.modes || [];
    const name = place.properties?.name?.toLowerCase() || "";
    const label = place.properties?.label?.toLowerCase() || "";

    if (modes.includes("SUBWAY") || name.includes("metro") || label.includes("metro")) {
        return {
            Icon: Train,
            colorClass: "text-orange-600",
            bgClass: "bg-orange-50",
            borderClass: "border-orange-200",
        };
    }

    if (modes.includes("TRAM")) {
        return {
            Icon: TramFront,
            colorClass: "text-green-600",
            bgClass: "bg-green-50",
            borderClass: "border-green-200",
        };
    }

    if (modes.includes("BUS")) {
        return {
            Icon: BusFront,
            colorClass: "text-blue-600",
            bgClass: "bg-blue-50",
            borderClass: "border-blue-200",
        };
    }

    if (modes.includes("RAIL")) {
        return {
            Icon: Train,
            colorClass: "text-purple-600",
            bgClass: "bg-purple-50",
            borderClass: "border-purple-200",
        };
    }

    if (layer === "station" || layer === "stop") {
        return {
            Icon: Navigation,
            colorClass: "text-slate-600",
            bgClass: "bg-slate-50",
            borderClass: "border-slate-200",
        };
    }

    if (layer === "venue") {
        return {
            Icon: Building2,
            colorClass: "text-slate-600",
            bgClass: "bg-slate-50",
            borderClass: "border-slate-200",
        };
    }

    return {
        Icon: MapPin,
        colorClass: "text-slate-500",
        bgClass: "bg-slate-50",
        borderClass: "border-slate-200",
    };
};

const getPlaceBadge = (place) => {
    const layer = place.properties?.layer;
    const code = place.properties?.addendum?.GTFS?.code;
    const modes = place.properties?.addendum?.GTFS?.modes || [];

    if (code) return code;

    if (modes.includes("SUBWAY")) return "Metro";
    if (modes.includes("TRAM")) return "Tram";
    if (modes.includes("BUS")) return "Bus";
    if (modes.includes("RAIL")) return "Station";

    if (layer === "station") return "Station";
    if (layer === "stop") return "Stop";
    if (layer === "venue") return "Place";

    return null;
};

function LocationAutocomplete({ label, placeholder, value, onSelect }) {
    const [query, setQuery] = useState(value?.label || "");
    const [suggestions, setSuggestions] = useState([]);
    const [loading, setLoading] = useState(false);

    const wrapperRef = useRef(null);
    const selectedLabelRef = useRef(value?.label || "");

    useEffect(() => {
        if (value?.label) {
            selectedLabelRef.current = value.label;
            setQuery(value.label);
            setSuggestions([]);
        }
    }, [value]);

    useEffect(() => {
        const trimmedQuery = query.trim();

        if (trimmedQuery.length < 2) {
            setSuggestions([]);
            return;
        }

        if (trimmedQuery === selectedLabelRef.current) {
            setSuggestions([]);
            return;
        }

        const delay = setTimeout(async () => {
            try {
                setLoading(true);

                const response = await api.get("/geocode/search", {
                    params: { text: trimmedQuery },
                });

                setSuggestions(response.data.features || []);
            } catch (error) {
                console.error("Geocoding failed:", error);
            } finally {
                setLoading(false);
            }
        }, 400);

        return () => clearTimeout(delay);
    }, [query]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setSuggestions([]);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    const handleSelect = (place) => {
        const [lon, lat] = place.geometry.coordinates;

        const selectedPlace = {
            label: place.properties.label || place.properties.name,
            name: place.properties.name,
            lat,
            lon,
        };

        selectedLabelRef.current = selectedPlace.label;
        setQuery(selectedPlace.label);
        setSuggestions([]);
        setLoading(false);
        onSelect(selectedPlace);
    };

    const handleInputChange = (event) => {
        const newValue = event.target.value;

        selectedLabelRef.current = "";
        setQuery(newValue);
        setSuggestions([]);

        if (value) {
            onSelect(null);
        }
    };

    return (
        <div ref={wrapperRef} className="relative">
            <label className="mb-2 block text-sm font-semibold text-slate-700">
                {label}
            </label>

            <input
                type="text"
                value={query}
                placeholder={placeholder}
                onChange={handleInputChange}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:ring-2 focus:ring-blue-600"
            />

            {loading && (
                <p className="absolute right-4 top-11 text-sm text-slate-400">
                    Searching...
                </p>
            )}

            {suggestions.length > 0 && (
                <div className="absolute z-[9999] mt-2 w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
                    {suggestions.map((place) => {
                        const { Icon, colorClass, bgClass, borderClass } = getPlaceIcon(place);
                        const badge = getPlaceBadge(place);

                        return (
                            <button
                                key={place.properties.gid}
                                type="button"
                                onMouseDown={(event) => {
                                    event.preventDefault();
                                    handleSelect(place);
                                }}
                                className="flex w-full items-center gap-4 border-b border-slate-100 px-4 py-3 text-left transition hover:bg-slate-50 last:border-b-0"
                            >
                                <div
                                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border ${bgClass} ${borderClass}`}
                                >
                                    <Icon size={23} strokeWidth={2.4} className={colorClass} />
                                </div>

                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2">
                                        <div className="truncate text-[15px] font-bold text-slate-900">
                                            {place.properties.name}
                                        </div>

                                        {badge && (
                                            <span className="rounded-md border border-slate-300 bg-white px-2 py-0.5 text-xs font-semibold text-slate-600">
                                                {badge}
                                            </span>
                                        )}
                                    </div>

                                    <div className="mt-0.5 truncate text-sm text-slate-500">
                                        {place.properties.locality ||
                                            place.properties.localadmin ||
                                            place.properties.region ||
                                            "Finland"}
                                    </div>
                                </div>

                                <div className="text-2xl font-light text-blue-600">›</div>
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

export default LocationAutocomplete;