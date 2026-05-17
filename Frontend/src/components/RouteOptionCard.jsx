import {
    ArrowRight,
    BusFront,
    Footprints,
    Leaf,
    Train,
    TramFront,
} from "lucide-react";
import { formatDuration, formatTime } from "../utils/transportMode";

const isTomorrow = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();

    const isDifferentDay = date.toDateString() !== today.toDateString();
    const hour = date.getHours();

    return isDifferentDay && hour >= 6;
};

const getLegColor = (leg) => {
    const apiColor = leg.route?.color
        ? `#${leg.route.color.replace("#", "")}`
        : null;

    if (apiColor && leg.mode !== "WALK") return apiColor;

    if (leg.mode === "TRAM") return "#00985f";
    if (leg.mode === "RAIL") return "#8c4799";
    if (leg.mode === "SUBWAY") return "#ff6319";
    if (leg.mode === "BUS") return "#007ac9";

    return "#d4d4d8";
};

const getLegIcon = (leg) => {
    if (leg.mode === "BUS") return BusFront;
    if (leg.mode === "TRAM") return TramFront;
    if (leg.mode === "RAIL" || leg.mode === "SUBWAY") return Train;

    return Footprints;
};

function RouteBar({ legs }) {
    return (
        <div className="mt-3 flex w-full items-center overflow-hidden rounded-md">
            {legs.map((leg, index) => {
                const isWalk = leg.mode === "WALK";
                const Icon = getLegIcon(leg);
                const color = getLegColor(leg);

                const flexValue = Math.max(0.55, Math.min(4.2, leg.duration / 210));

                return (
                    <div
                        key={index}
                        className={`flex h-8 items-center justify-center gap-1.5 border-r border-white px-2 text-xs font-bold last:border-r-0 ${isWalk ? "text-slate-700" : "text-white"
                            }`}
                        style={{
                            backgroundColor: isWalk ? "#d4d4d8" : color,
                            flex: flexValue,
                            minWidth: isWalk ? "48px" : "70px",
                        }}
                    >
                        <Icon size={15} />

                        {isWalk ? (
                            <span>{Math.max(1, Math.round(leg.duration / 60))}</span>
                        ) : (
                            <span>{leg.route?.shortName || leg.mode}</span>
                        )}
                    </div>
                );
            })}
        </div>
    );
}

function RouteOptionCard({ route, selected, onSelect }) {
    const legs = route.node.legs;
    const firstLeg = legs[0];
    const lastLeg = legs[legs.length - 1];

    const startTime = formatTime(firstLeg.start.scheduledTime);
    const endTime = formatTime(lastLeg.end.scheduledTime);
    const totalDuration = formatDuration(route.node.duration);
    const showTomorrow = isTomorrow(firstLeg.start.scheduledTime);

    const firstTransitLeg = legs.find(
        (leg) => leg.mode !== "WALK" && leg.mode !== "BICYCLE"
    );

    const hasLowEmission = legs.some(
        (leg) =>
            leg.mode === "TRAM" || leg.mode === "RAIL" || leg.mode === "SUBWAY"
    );

    return (
        <button
            onClick={onSelect}
            className={`w-full border-b bg-white px-4 py-3 text-left transition hover:bg-slate-50 ${selected
                ? "border-l-4 border-l-blue-600 bg-blue-50"
                : "border-l-4 border-l-transparent"
                }`}
        >
            <div className="flex items-start justify-between gap-3">
                <div>
                    <span className="text-2xl font-bold text-slate-900">
                        {startTime} - {endTime}
                    </span>

                    {showTomorrow && (
                        <div className="m-3 inline-flex rounded-md bg-blue-100 px-2 py-0.5 text-xs font-bold text-blue-700">
                            Tomorrow
                        </div>
                    )}
                </div>

                <div className="text-right">
                    {hasLowEmission && (
                        <div className="mb-1 inline-flex items-center gap-1 rounded-md bg-green-100 px-2 py-0.5 text-xs font-bold text-green-700">
                            <Leaf size={14} />
                            eco
                        </div>
                    )}

                    <div className="text-2xl font-bold text-slate-900">
                        {totalDuration}
                    </div>
                </div>
            </div>

            <RouteBar legs={legs} />

            <div className="mt-3 flex items-center justify-between gap-3">
                <p className="text-sm text-slate-700">
                    Departs at{" "}
                    <span className="font-bold text-green-700">
                        {formatTime(
                            firstTransitLeg?.start?.scheduledTime ||
                            firstLeg.start.scheduledTime
                        )}
                    </span>{" "}
                    from {firstTransitLeg?.from?.name || firstLeg.from.name}
                </p>

                <ArrowRight size={26} className="shrink-0 text-blue-600" />
            </div>
        </button>
    );
}

export default RouteOptionCard;