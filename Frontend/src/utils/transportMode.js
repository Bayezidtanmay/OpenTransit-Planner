import {
    Bus,
    Train,
    TramFront,
    ShipWheel,
    Footprints,
    Bike,
    CircleDot,
  } from "lucide-react";
  
  export const getTransportMode = (mode) => {
    const normalizedMode = mode?.toUpperCase();
  
    const modes = {
      WALK: {
        label: "Walk",
        Icon: Footprints,
        badgeClass: "bg-slate-100 text-slate-700 border-slate-200",
        lineClass: "bg-slate-400",
      },
      BUS: {
        label: "Bus",
        Icon: Bus,
        badgeClass: "bg-blue-100 text-blue-700 border-blue-200",
        lineClass: "bg-blue-600",
      },
      RAIL: {
        label: "Train",
        Icon: Train,
        badgeClass: "bg-purple-100 text-purple-700 border-purple-200",
        lineClass: "bg-purple-600",
      },
      TRAM: {
        label: "Tram",
        Icon: TramFront,
        badgeClass: "bg-green-100 text-green-700 border-green-200",
        lineClass: "bg-green-600",
      },
      SUBWAY: {
        label: "Metro",
        Icon: CircleDot,
        badgeClass: "bg-orange-100 text-orange-700 border-orange-200",
        lineClass: "bg-orange-600",
      },
      BICYCLE: {
        label: "Bike",
        Icon: Bike,
        badgeClass: "bg-emerald-100 text-emerald-700 border-emerald-200",
        lineClass: "bg-emerald-600",
      },
      FERRY: {
        label: "Ferry",
        Icon: ShipWheel,
        badgeClass: "bg-cyan-100 text-cyan-700 border-cyan-200",
        lineClass: "bg-cyan-600",
      },
    };
  
    return (
      modes[normalizedMode] || {
        label: normalizedMode || "Transit",
        Icon: CircleDot,
        badgeClass: "bg-slate-100 text-slate-700 border-slate-200",
        lineClass: "bg-slate-400",
      }
    );
  };
  
  export const formatTime = (dateString) => {
    if (!dateString) return "";
  
    return new Date(dateString).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };
  
  export const formatDuration = (seconds) => {
    if (!seconds) return "0 min";
  
    const minutes = Math.round(seconds / 60);
  
    if (minutes < 60) {
      return `${minutes} min`;
    }
  
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
  
    return `${hours} h ${remainingMinutes} min`;
  };