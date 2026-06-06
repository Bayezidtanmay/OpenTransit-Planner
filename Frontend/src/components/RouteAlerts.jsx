import { AlertTriangle, Info, ShieldAlert } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import api from "../api";

const getAlertIcon = (severity) => {
    if (severity === "SEVERE") return ShieldAlert;
    if (severity === "WARNING") return AlertTriangle;
    return Info;
};

const getAlertStyle = (severity) => {
    if (severity === "SEVERE") {
        return "border-red-200 bg-red-50 text-red-800";
    }

    if (severity === "WARNING") {
        return "border-amber-200 bg-amber-50 text-amber-800";
    }

    return "border-blue-200 bg-blue-50 text-blue-800";
};

function RouteAlerts({ legs }) {
    const [alerts, setAlerts] = useState([]);
    const [loading, setLoading] = useState(false);

    const routeIds = useMemo(() => {
        return [
            ...new Set(
                legs
                    .map((leg) => leg.route?.gtfsId)
                    .filter(Boolean)
            ),
        ];
    }, [legs]);

    useEffect(() => {
        const fetchAlerts = async () => {
            if (!routeIds.length) {
                setAlerts([]);
                return;
            }

            try {
                setLoading(true);

                const response = await api.get("/journeys/alerts", {
                    params: {
                        routeIds: routeIds.join(","),
                    },
                });

                setAlerts(response.data.alerts || []);
            } catch (error) {
                console.error("Route alerts failed:", error);
                setAlerts([]);
            } finally {
                setLoading(false);
            }
        };

        fetchAlerts();
    }, [routeIds]);

    if (!routeIds.length) return null;

    if (loading) {
        return (
            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm font-semibold text-slate-500">
                Checking route alerts...
            </div>
        );
    }

    if (!alerts.length) {
        return (
            <div className="mt-4 rounded-2xl border border-green-200 bg-green-50 px-5 py-4 text-sm font-bold text-green-700">
                No active disruptions found for this journey.
            </div>
        );
    }

    return (
        <div className="mt-4 space-y-3">
            {alerts.slice(0, 3).map((alert, index) => {
                const Icon = getAlertIcon(alert.alertSeverityLevel);

                return (
                    <div
                        key={`${alert.alertHeaderText}-${index}`}
                        className={`rounded-2xl border px-5 py-4 ${getAlertStyle(
                            alert.alertSeverityLevel
                        )}`}
                    >
                        <div className="flex items-start gap-3">
                            <Icon size={22} className="mt-0.5 shrink-0" />

                            <div>
                                <div className="font-black">
                                    {alert.alertHeaderText || "Route disruption"}
                                </div>

                                {alert.alertDescriptionText && (
                                    <p className="mt-1 text-sm opacity-90">
                                        {alert.alertDescriptionText}
                                    </p>
                                )}

                                <div className="mt-2 text-xs font-bold uppercase opacity-70">
                                    {alert.alertSeverityLevel || "INFO"} ·{" "}
                                    {alert.alertEffect || "Service alert"}
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

export default RouteAlerts;