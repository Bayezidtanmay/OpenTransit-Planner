import { Briefcase, GraduationCap, Home, MapPin, Plus, Trash2 } from "lucide-react";

const getShortcutIcon = (label) => {
    const lowerLabel = label.toLowerCase();

    if (lowerLabel.includes("home")) return Home;
    if (lowerLabel.includes("work") || lowerLabel.includes("office")) return Briefcase;
    if (lowerLabel.includes("school")) return GraduationCap;

    return MapPin;
};

function SavedPlaces({
    savedPlaces,
    fromPlace,
    toPlace,
    onSavePlace,
    onRemovePlace,
    onUsePlace,
}) {
    const canSaveFrom = Boolean(fromPlace?.lat && fromPlace?.lon);
    const canSaveTo = Boolean(toPlace?.lat && toPlace?.lon);

    const askLabelAndSave = (place) => {
        const label = prompt(
            "Save this place as:",
            "Home"
        );

        if (!label || !label.trim()) return;

        onSavePlace(label.trim(), place);
    };

    return (
        <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                    <h2 className="text-base font-bold text-slate-900">Saved places</h2>
                    <p className="text-sm text-slate-500">
                        Save Home, Work, School, or any favorite place for quick journey search.
                    </p>
                </div>
            </div>

            <div className="mb-4 flex flex-wrap gap-2">
                <button
                    type="button"
                    onClick={() => askLabelAndSave(fromPlace)}
                    disabled={!canSaveFrom}
                    className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-green-700 shadow-sm ring-1 ring-green-100 hover:bg-green-50 disabled:text-slate-400 disabled:ring-slate-200"
                >
                    <Plus size={16} />
                    Save From
                </button>

                <button
                    type="button"
                    onClick={() => askLabelAndSave(toPlace)}
                    disabled={!canSaveTo}
                    className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-red-700 shadow-sm ring-1 ring-red-100 hover:bg-red-50 disabled:text-slate-400 disabled:ring-slate-200"
                >
                    <Plus size={16} />
                    Save To
                </button>
            </div>

            {savedPlaces.length === 0 ? (
                <div className="rounded-xl bg-white px-4 py-3 text-sm text-slate-500">
                    No saved places yet.
                </div>
            ) : (
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                    {savedPlaces.map((item) => {
                        const Icon = getShortcutIcon(item.label);

                        return (
                            <div
                                key={item.id}
                                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                            >
                                <div className="mb-3 flex items-start justify-between gap-3">
                                    <div className="flex items-start gap-3">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-700">
                                            <Icon size={20} />
                                        </div>

                                        <div>
                                            <div className="font-bold text-slate-900">{item.label}</div>
                                            <div className="line-clamp-2 text-sm text-slate-500">
                                                {item.place.label}
                                            </div>
                                        </div>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => onRemovePlace(item.id)}
                                        className="rounded-full p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                                    >
                                        <Trash2 size={17} />
                                    </button>
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => onUsePlace(item.place, "from")}
                                        className="rounded-xl bg-green-50 px-3 py-2 text-sm font-bold text-green-700 hover:bg-green-100"
                                    >
                                        Use From
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => onUsePlace(item.place, "to")}
                                        className="rounded-xl bg-red-50 px-3 py-2 text-sm font-bold text-red-700 hover:bg-red-100"
                                    >
                                        Use To
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

export default SavedPlaces;