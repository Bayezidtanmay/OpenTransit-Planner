import { useEffect, useState } from "react";
import api from "../api";

function LocationAutocomplete({ label, placeholder, value, onSelect }) {
    const [query, setQuery] = useState(value?.label || "");
    const [suggestions, setSuggestions] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (query.length < 2) {
            setSuggestions([]);
            return;
        }

        const delay = setTimeout(async () => {
            try {
                setLoading(true);

                const response = await api.get("/geocode/search", {
                    params: { text: query },
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

    const handleSelect = (place) => {
        const [lon, lat] = place.geometry.coordinates;

        const selectedPlace = {
            label: place.properties.label || place.properties.name,
            name: place.properties.name,
            lat,
            lon,
        };

        setQuery(selectedPlace.label);
        setSuggestions([]);
        onSelect(selectedPlace);
    };

    return (
        <div className="relative">
            <label className="block text-sm font-semibold text-slate-700 mb-2">
                {label}
            </label>

            <input
                type="text"
                value={query}
                placeholder={placeholder}
                onChange={(e) => {
                    setQuery(e.target.value);
                    onSelect(null);
                }}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:ring-2 focus:ring-blue-600"
            />

            {loading && (
                <p className="absolute right-4 top-11 text-sm text-slate-400">
                    Searching...
                </p>
            )}

            {suggestions.length > 0 && (
                <div className="absolute z-50 mt-2 w-full rounded-xl border bg-white shadow-lg overflow-hidden">
                    {suggestions.map((place) => (
                        <button
                            key={place.properties.gid}
                            type="button"
                            onClick={() => handleSelect(place)}
                            className="w-full text-left px-4 py-3 hover:bg-slate-100 border-b last:border-b-0"
                        >
                            <div className="font-semibold text-slate-800">
                                {place.properties.name}
                            </div>
                            <div className="text-sm text-slate-500">
                                {place.properties.label}
                            </div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

export default LocationAutocomplete;