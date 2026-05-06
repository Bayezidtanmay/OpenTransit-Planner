import {
    ArrowRight,
    Clock,
    MapPin,
    Route,
    Timer,
} from "lucide-react";
import {
    formatDuration,
    formatTime,
    getTransportMode,
} from "../utils/transportMode";

const getJourneyDayLabel = (dateString) => {
    if (!dateString) return null;

    const journeyDate = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date();

    tomorrow.setDate(today.getDate() + 1);

    const isTomorrow =
        journeyDate.getFullYear() === tomorrow.getFullYear() &&
        journeyDate.getMonth() === tomorrow.getMonth() &&
        journeyDate.getDate() === tomorrow.getDate();

    const isAfter6AM = journeyDate.getHours() >= 6;

    if (isTomorrow && isAfter6AM) {
        return "Tomorrow";
    }

    return null;
};

function RouteOptionCard({ route, index, selected, onSelect }) {
    const legs = route.node.legs;
    const firstLeg = legs[0];
    const lastLeg = legs[legs.length - 1];

    const startTime = formatTime(firstLeg.start.scheduledTime);
    const endTime = formatTime(lastLeg.end.scheduledTime);
    const dayLabel = getJourneyDayLabel(firstLeg.start.scheduledTime);

    const totalDuration = formatDuration(route.node.duration);
    const transfers = legs.filter(
        (leg) => leg.mode !== "WALK" && leg.mode !== "BICYCLE"
    ).length;

    return (
        <button
            onClick={onSelect}
            className={`w-full text-left rounded-3xl border p-5 shadow-sm transition hover:shadow-md ${selected
                    ? "bg-blue-50 border-blue-600 ring-2 ring-blue-100"
                    : "bg-white border-slate-200"
                }`}
        >
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-500">
                        <Route size={16} />
                        Route option {index + 1}
                    </div>

                    {dayLabel && (
                        <span className="mt-2 inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700">
                            {dayLabel}
                        </span>
                    )}

                    <div className="mt-2 flex items-center gap-3">
                        <span className="text-2xl font-bold text-slate-900">
                            {startTime}
                        </span>
                        <ArrowRight size={18} className="text-slate-400" />
                        <span className="text-2xl font-bold text-slate-900">
                            {endTime}
                        </span>
                    </div>
                </div>

                <div className="text-right">
                    <div className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-3 py-1 text-sm font-semibold text-white">
                        <Timer size={15} />
                        {totalDuration}
                    </div>

                    <div className="mt-2 text-sm text-slate-500">
                        {transfers} transit leg{transfers !== 1 ? "s" : ""}
                    </div>
                </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
                {legs.map((leg, legIndex) => {
                    const modeInfo = getTransportMode(leg.mode);
                    const Icon = modeInfo.Icon;

                    return (
                        <span
                            key={legIndex}
                            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm font-semibold ${modeInfo.badgeClass}`}
                        >
                            <Icon size={16} />
                            {leg.route?.shortName || modeInfo.label}
                        </span>
                    );
                })}
            </div>

            <div className="mt-5 space-y-0">
                {legs.map((leg, legIndex) => {
                    const modeInfo = getTransportMode(leg.mode);
                    const Icon = modeInfo.Icon;

                    return (
                        <div key={legIndex} className="relative flex gap-4">
                            <div className="flex flex-col items-center">
                                <div
                                    className={`flex h-10 w-10 items-center justify-center rounded-full border bg-white ${modeInfo.badgeClass}`}
                                >
                                    <Icon size={18} />
                                </div>

                                {legIndex !== legs.length - 1 && (
                                    <div className={`h-14 w-1 ${modeInfo.lineClass}`} />
                                )}
                            </div>

                            <div className="pb-5 flex-1">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div className="font-bold text-slate-900">
                                        {leg.route?.shortName
                                            ? `${modeInfo.label} ${leg.route.shortName}`
                                            : modeInfo.label}
                                    </div>

                                    <div className="flex items-center gap-1 text-sm text-slate-500">
                                        <Clock size={14} />
                                        {formatDuration(leg.duration)}
                                    </div>
                                </div>

                                <div className="mt-1 text-sm text-slate-600">
                                    {formatTime(leg.start.scheduledTime)} · {leg.from.name}
                                </div>

                                <div className="mt-1 flex items-center gap-1 text-sm text-slate-500">
                                    <MapPin size={14} />
                                    {leg.to.name} · {Math.round(leg.distance)} m
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </button>
    );
}

export default RouteOptionCard;