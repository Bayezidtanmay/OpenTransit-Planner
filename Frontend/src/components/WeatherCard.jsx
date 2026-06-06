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

const fetchWeather = async (place) => {
    if (!place?.lat || !place?.lon) return null;

    const url = `https://api.open-meteo.com/v1/forecast?latitude=${place.lat}&longitude=${place.lon}&current=temperature_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m&timezone=auto`;

    const response = await fetch(url);
    const data = await response.json();

    return data.current || null;
};

function WeatherPlace({ title, place, weather }) {
    const Icon = getWeatherIcon(weather.weather_code);

    return (
        <div className="rounded-2xl bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                    <Icon size={25} />
                </div>

                <div>
                    <div className="text-xs font-bold uppercase text-blue-700">{title}</div>
                    <div className="line-clamp-1 font-black text-slate-900">
                        {place?.name || place?.label}
                    </div>
                </div>
            </div>

            <div className="flex items-end justify-between gap-3">
                <div>
                    <div className="text-3xl font-black text-slate-900">
                        {Math.round(weather.temperature_2m)}°C
                    </div>
                    <div className="text-sm font-semibold text-slate-500">
                        {getWeatherText(weather.weather_code)}
                    </div>
                </div>

                <div className="text-right text-sm text-slate-500">
                    <div>Feels {Math.round(weather.apparent_temperature)}°C</div>
                    <div className="flex items-center justify-end gap-1">
                        <Wind size={14} />
                        {Math.round(weather.wind_speed_10m)} km/h
                    </div>
                </div>
            </div>
        </div>
    );
}

function WeatherCard({ fromPlace, toPlace }) {
    const [fromWeather, setFromWeather] = useState(null);
    const [toWeather, setToWeather] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const loadWeather = async () => {
            if (!fromPlace?.lat || !fromPlace?.lon || !toPlace?.lat || !toPlace?.lon) {
                setFromWeather(null);
                setToWeather(null);
                return;
            }

            try {
                setLoading(true);

                const [fromResult, toResult] = await Promise.all([
                    fetchWeather(fromPlace),
                    fetchWeather(toPlace),
                ]);

                setFromWeather(fromResult);
                setToWeather(toResult);
            } catch (error) {
                console.error("Weather fetch failed:", error);
                setFromWeather(null);
                setToWeather(null);
            } finally {
                setLoading(false);
            }
        };

        loadWeather();
    }, [fromPlace, toPlace]);

    if (!fromPlace || !toPlace) return null;

    if (loading) {
        return (
            <div className="mt-6 rounded-2xl border border-slate-200 bg-blue-50 p-4 text-sm font-semibold text-blue-700">
                Loading journey weather...
            </div>
        );
    }

    if (!fromWeather || !toWeather) return null;

    return (
        <div className="mt-6 rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-50 to-sky-50 p-5">
            <div className="mb-4">
                <h2 className="text-lg font-black text-slate-900">Journey weather</h2>
                <p className="text-sm text-slate-500">
                    Weather at your starting point and destination.
                </p>
            </div>

            <div className="grid gap-4 md:grid-cols-[1fr_auto_1fr] md:items-center">
                <WeatherPlace title="From" place={fromPlace} weather={fromWeather} />

                <div className="hidden text-3xl font-black text-blue-300 md:block">→</div>

                <WeatherPlace title="To" place={toPlace} weather={toWeather} />
            </div>
        </div>
    );
}

export default WeatherCard;