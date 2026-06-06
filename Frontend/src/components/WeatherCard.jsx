import { CloudRain, CloudSun, Sun, Wind } from "lucide-react";
import { useEffect, useState } from "react";

const getWeatherText = (code) => {
    if (code === 0) return "Clear sky";
    if ([1, 2, 3].includes(code)) return "Partly cloudy";
    if ([45, 48].includes(code)) return "Foggy";
    if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code)) return "Rainy";
    if ([71, 73, 75, 77, 85, 86].includes(code)) return "Snowy";
    if ([95, 96, 99].includes(code)) return "Thunderstorm";

    return "Weather update";
};

const getWeatherIcon = (code) => {
    if (code === 0) return Sun;
    if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code)) return CloudRain;
    return CloudSun;
};

function WeatherCard({ place }) {
    const [weather, setWeather] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchWeather = async () => {
            if (!place?.lat || !place?.lon) {
                setWeather(null);
                return;
            }

            try {
                setLoading(true);

                const url = `https://api.open-meteo.com/v1/forecast?latitude=${place.lat}&longitude=${place.lon}&current=temperature_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m&timezone=auto`;

                const response = await fetch(url);
                const data = await response.json();

                setWeather(data.current || null);
            } catch (error) {
                console.error("Weather fetch failed:", error);
                setWeather(null);
            } finally {
                setLoading(false);
            }
        };

        fetchWeather();
    }, [place]);

    if (!place) return null;

    if (loading) {
        return (
            <div className="mt-6 rounded-2xl border border-slate-200 bg-blue-50 p-4 text-sm font-semibold text-blue-700">
                Loading destination weather...
            </div>
        );
    }

    if (!weather) return null;

    const Icon = getWeatherIcon(weather.weather_code);

    return (
        <div className="mt-6 rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-50 to-sky-50 p-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-blue-700 shadow-sm">
                        <Icon size={30} />
                    </div>

                    <div>
                        <div className="text-sm font-bold uppercase text-blue-700">
                            Destination weather
                        </div>

                        <div className="text-lg font-black text-slate-900">
                            {place.name || place.label}
                        </div>

                        <div className="text-sm text-slate-500">
                            {getWeatherText(weather.weather_code)}
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                        <div className="text-2xl font-black text-slate-900">
                            {Math.round(weather.temperature_2m)}°C
                        </div>
                        <div className="text-xs font-semibold text-slate-500">Temp</div>
                    </div>

                    <div>
                        <div className="text-2xl font-black text-slate-900">
                            {Math.round(weather.apparent_temperature)}°C
                        </div>
                        <div className="text-xs font-semibold text-slate-500">Feels</div>
                    </div>

                    <div>
                        <div className="flex items-center justify-center gap-1 text-2xl font-black text-slate-900">
                            <Wind size={20} />
                            {Math.round(weather.wind_speed_10m)}
                        </div>
                        <div className="text-xs font-semibold text-slate-500">km/h</div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default WeatherCard;