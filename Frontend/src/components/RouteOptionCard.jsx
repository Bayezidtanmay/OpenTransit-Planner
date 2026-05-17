import {
    ArrowRight,
    BusFront,
    ChevronUp,
    Footprints,
    Leaf,
    Map,
    MapPin,
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

const ORANGE_BUS_ROUTES = [
    "20",
    "30",
    "40",
    "200",
    "400",
    "500",
    "510",
    "520",
    "530",
    "560",
    "570",
    "600",
];

const isOrangeBus = (routeName = "") =>
    ORANGE_BUS_ROUTES.some((route) => routeName.startsWith(route));

const getLegColor = (leg) => {
    const routeName = leg.route?.shortName || "";

    if (leg.mode === "BUS" && isOrangeBus(routeName)) {
        return "#f97316";
    }

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

const getLegLabel = (leg) => {
    if (leg.mode === "WALK") return "Walk";
    if (leg.mode === "BUS") return `Bus ${leg.route?.shortName || ""}`;
    if (leg.mode === "TRAM") return `Tram ${leg.route?.shortName || ""}`;
    if (leg.mode === "RAIL") return `Train ${leg.route?.shortName || ""}`;
    if (leg.mode === "SUBWAY") return `Metro ${leg.route?.shortName || ""}`;

    return leg.route?.shortName || leg.mode;
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

function RouteDetails({ legs }) {
    return (
        <div className="mt-4 border-t border-slate-200 pt-4">
            {legs.map((leg, index) => {
                const Icon = getLegIcon(leg);
                const color = getLegColor(leg);
                const isWalk = leg.mode === "WALK";

                return (
                    <div key={index} className="grid grid-cols-[58px_36px_1fr] gap-3">
                        <div className="pt-1 text-right text-sm font-bold text-slate-800">
                            {formatTime(leg.start.scheduledTime)}
                        </div>

                        <div className="flex flex-col items-center">
                            <div
                                className="flex h-8 w-8 items-center justify-center rounded-full border-4 bg-white"
                                style={{ borderColor: color }}
                            >
                                <Icon
                                    size={16}
                                    className={isWalk ? "text-slate-700" : ""}
                                    style={{ color: isWalk ? undefined : color }}
                                />
                            </div>

                            {index !== legs.length - 1 && (
                                <div
                                    className="min-h-16 w-1 flex-1 rounded-full"
                                    style={{
                                        backgroundColor: isWalk ? "#d4d4d8" : color,
                                    }}
                                />
                            )}
                        </div>

                        <div className="pb-5">
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <div className="text-base font-bold text-slate-900">
                                        {leg.from.name}
                                    </div>

                                    <div className="mt-1 text-sm text-slate-500">
                                        {leg.from.name === "Origin"
                                            ? "Starting point"
                                            : leg.from.name}
                                    </div>
                                </div>

                                <Map size={22} className="shrink-0 text-blue-600" />
                            </div>

                            <div className="mt-3 rounded-xl bg-slate-50 p-3">
                                <div className="flex items-center gap-2">
                                    {!isWalk && (
                                        <span
                                            className="rounded-md px-3 py-1 text-sm font-black text-white"
                                            style={{ backgroundColor: color }}
                                        >
                                            {leg.route?.shortName}
                                        </span>
                                    )}

                                    <span className="font-semibold text-slate-800">
                                        {getLegLabel(leg)}
                                    </span>

                                    <span className="text-sm text-slate-500">
                                        {formatDuration(leg.duration)}
                                    </span>
                                </div>

                                <div className="mt-2 text-sm text-slate-600">
                                    {isWalk
                                        ? `Walk ${Math.round(Number(leg.distance || 0))} m`
                                        : leg.route?.longName || "Continue on this service"}
                                </div>
                            </div>

                            <div className="mt-3 flex items-start justify-between gap-3 border-t border-slate-200 pt-3">
                                <div>
                                    <div className="text-base font-bold text-slate-900">
                                        {leg.to.name}
                                    </div>

                                    <div className="mt-1 flex items-center gap-1 text-sm text-slate-500">
                                        <MapPin size={14} />
                                        {Math.round(Number(leg.distance || 0))} m
                                    </div>
                                </div>

                                <Map size={22} className="shrink-0 text-blue-600" />
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

function RouteOptionCard({ route, selected, onSelect, onClose }) {
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

    const handleToggleDetails = (event) => {
        event.stopPropagation();

        if (selected && onClose) {
            onClose();
            return;
        }

        onSelect();
    };

    return (
        <div
            onClick={onSelect}
            className={`w-full cursor-pointer border-b bg-white px-4 py-3 text-left transition hover:bg-slate-50 ${selected
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

                <button
                    type="button"
                    onClick={handleToggleDetails}
                    className="shrink-0 rounded-full p-1 text-blue-600 hover:bg-blue-50"
                >
                    {selected ? <ChevronUp size={28} /> : <ArrowRight size={28} />}
                </button>
            </div>

            {selected && <RouteDetails legs={legs} />}
        </div>
    );
}

export default RouteOptionCard;