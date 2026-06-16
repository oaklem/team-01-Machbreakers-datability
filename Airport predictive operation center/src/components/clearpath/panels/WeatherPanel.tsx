import { Cloud, CloudRain, Wind, Eye, Snowflake, Zap } from "lucide-react";
import type { Flight } from "@/lib/clearpath-data";
import { InfoTip } from "../InfoTip";

export function WeatherPanel({ flight }: { flight: Flight }) {
  const w = flight.weather;
  const chips: { label: string; icon: typeof Cloud; active: boolean; tip: string }[] = [
    {
      label: "Thunderstorms",
      icon: Zap,
      active: w.thunderstorms,
      tip: "Active or forecast thunderstorms can force reroutes, holds, or temporary ground stops.",
    },
    {
      label: "Low visibility",
      icon: Eye,
      active: w.lowVisibility,
      tip: "Reduced visibility (fog, heavy rain) means controllers must space aircraft further apart, reducing capacity.",
    },
    {
      label: `Crosswind ${w.crosswindKt} kt`,
      icon: Wind,
      active: w.crosswindKt >= 15,
      tip: "Strong crosswinds can close a runway or force single-runway operations, cutting hourly capacity.",
    },
    {
      label: "De-icing required",
      icon: Snowflake,
      active: w.deicingRequired,
      tip: "Aircraft must be sprayed before takeoff in icing conditions. Adds time and queueing at the de-ice pads.",
    },
  ];

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
        <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-white/40">
          <Cloud className="h-3.5 w-3.5" /> Airport METAR (FRA)
          <InfoTip label="METAR">
            METAR is the standard aviation weather report for an airport, issued roughly every 30 minutes.
          </InfoTip>
        </div>
        <div className="text-xs font-mono text-white/85 mt-1.5 break-all">{w.metar}</div>
      </div>

      <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
        <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-white/40">
          <CloudRain className="h-3.5 w-3.5" /> En-route weather
          <InfoTip label="En-route weather">
            Weather along the route between origin and destination, including any turbulence or storms the flight will encounter.
          </InfoTip>
        </div>
        <div className="text-xs text-white/85 mt-1.5">{w.enroute}</div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {chips.map((c) => (
          <div
            key={c.label}
            className={`rounded-lg border p-3 flex items-center gap-2 ${
              c.active
                ? "border-amber-500/30 bg-amber-500/5 text-amber-200"
                : "border-white/10 bg-white/[0.03] text-white/55"
            }`}
          >
            <c.icon className="h-4 w-4" />
            <span className="text-xs font-medium flex-1">{c.label}</span>
            <InfoTip label={c.label}>{c.tip}</InfoTip>
          </div>
        ))}
      </div>
    </div>
  );
}
