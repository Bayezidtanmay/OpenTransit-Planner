import { Clock, RotateCcw, Trash2 } from "lucide-react";

const formatSearchTime = (dateString) => {
    const date = new Date(dateString);

    return date.toLocaleString([], {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
    });
};

function JourneyHistory({ history, onUseHistory, onRemoveHistory, onClearHistory }) {
    if (!history.length) return null;

    return (
        <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                    <h2 className="text-base font-bold text-slate-900">Recent journeys</h2>
                    <p className="text-sm text-slate-500">
                        Quickly reuse your previous journey searches.
                    </p>
                </div>

                <button
                    type="button"
                    onClick={onClearHistory}
                    className="rounded-full px-3 py-1.5 text-sm font-semibold text-red-600 hover:bg-red-50"
                >
                    Clear all
                </button>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
                {history.map((item) => (
                    <div
                        key={item.id}
                        className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                    >
                        <div className="mb-3 flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-700">
                                    <Clock size={20} />
                                </div>

                                <div>
                                    <div className="font-black text-slate-900">
                                        {item.fromPlace?.name || item.fromPlace?.label}
                                    </div>

                                    <div className="text-sm font-semibold text-slate-400">↓</div>

                                    <div className="font-black text-slate-900">
                                        {item.toPlace?.name || item.toPlace?.label}
                                    </div>

                                    <div className="mt-1 text-xs font-semibold text-slate-400">
                                        {formatSearchTime(item.searchedAt)}
                                    </div>
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={() => onRemoveHistory(item.id)}
                                className="rounded-full p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                            >
                                <Trash2 size={17} />
                            </button>
                        </div>

                        <button
                            type="button"
                            onClick={() => onUseHistory(item)}
                            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-50 px-3 py-2 text-sm font-bold text-blue-700 hover:bg-blue-100"
                        >
                            <RotateCcw size={16} />
                            Use again
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default JourneyHistory;