import { AlertOctagon, ChevronRight, MapPin, Route } from "lucide-react";
import { toast } from "sonner";
import { Flight, riskColor, riskLabel, riskScore01 } from "@/lib/clearpath-data";
import { getRecommendations, getWeatherRerouteOptions, levelStyles, type ActionLevel } from "@/lib/recommendations";
import { useClosureImpact } from "@/lib/closures";

const LEVEL_LABEL: Record<ActionLevel, string> = {
  monitor: "Monitor",
  prepare: "Prepare",
  act: "Act now",
};

interface Props {
  flight: Flight;
  rank: number;
  selected: boolean;
  onSelect: () => void;
  onViewDetails: () => void;
}

export function FlightCard({ flight, rank, selected, onSelect, onViewDetails }: Props) {
  const closureImpact = useClosureImpact(flight);
  const adjustedRisk = Math.min(100, flight.risk + closureImpact.delta);
  const color = riskColor(adjustedRisk);
  const label = riskLabel(adjustedRisk);
  const mitigations = getRecommendations(flight).slice(0, 2);
  const reroutes = getWeatherRerouteOptions(flight);

  const confStyle = (c: "High" | "Medium" | "Low") =>
    c === "High"
      ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
      : c === "Medium"
      ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
      : "bg-white/10 text-white/60 border-white/15";

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full text-left rounded-xl border bg-[#0F1D33] p-4 transition-all hover:bg-[#13243d] ${
        selected ? "border-sky-400/60 ring-1 ring-sky-400/40" : "border-white/10"
      }`}
    >
      <div className="flex items-center gap-3">
        <div className="text-white/30 text-xs font-mono w-6 shrink-0">#{rank}</div>
        <div
          className="h-10 w-10 rounded-full grid place-items-center text-white text-xs font-bold shrink-0"
          style={{ backgroundColor: flight.airlineColor }}
        >
          {flight.airlineCode}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-white font-semibold">{flight.flightNumber}</span>
            <span className="text-white/60 text-sm">
              {flight.origin} → {flight.destination}
            </span>
            <span className="text-[10px] uppercase tracking-wider text-white/40 border border-white/10 rounded px-1.5 py-0.5">
              {flight.aircraftType}
            </span>
          </div>
          <div className="text-xs text-white/50 mt-0.5 flex items-center gap-3 flex-wrap">
            <span>STD {flight.std}</span>
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3 w-3" /> Gate {flight.gate}
              {flight.gateConflict && <span className="text-amber-400">⚠</span>}
            </span>
            {flight.estDelay > 0 ? (
              <span className="text-amber-400">EST +{flight.estDelay} min</span>
            ) : (
              <span className="text-emerald-400">On time</span>
            )}
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-2xl font-bold tabular-nums" style={{ color }}>
            {riskScore01(adjustedRisk)}
          </div>
          <div className="text-[10px] uppercase tracking-widest" style={{ color }}>
            {label}
          </div>
          {closureImpact.delta > 0 && (
            <div className="text-[9px] uppercase tracking-wider text-red-300 mt-0.5">
              +{closureImpact.delta} NOTAM
            </div>
          )}
        </div>
      </div>

      <div className="mt-3 h-1.5 w-full rounded-full bg-white/5 overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${adjustedRisk}%`, backgroundColor: color }}
        />
      </div>

      {closureImpact.delta > 0 && (
        <div className="mt-2 flex items-start gap-1.5 rounded-md border border-red-500/25 bg-red-500/[0.06] px-2 py-1.5 text-[11px] text-red-200">
          <AlertOctagon className="h-3 w-3 mt-0.5 shrink-0" />
          <span className="truncate">{closureImpact.reasons[0]}</span>
        </div>
      )}

      <div className="mt-3 text-sm text-white/70 line-clamp-1">{flight.rootCause}</div>

      {mitigations.length > 0 && (
        <div className="mt-3 rounded-md border border-white/10 bg-white/[0.02] p-2">
          <div className="text-[10px] uppercase tracking-widest text-white/40 mb-1.5">
            Recommended mitigation
          </div>
          <ul className="space-y-1">
            {mitigations.map((m) => {
              const s = levelStyles(m.level);
              return (
                <li key={m.id} className="flex items-center gap-2 text-xs">
                  <span
                    className="text-[9px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded shrink-0"
                    style={{ backgroundColor: s.bg, color: s.text, borderColor: s.border, borderWidth: 1 }}
                  >
                    {LEVEL_LABEL[m.level]}
                  </span>
                  <span className="text-white/80 truncate">{m.title}</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {reroutes.length > 0 && (
        <div className="mt-3 rounded-md border border-sky-400/20 bg-sky-400/[0.04] p-2">
          <div className="flex items-center gap-1.5 mb-1.5">
            <Route className="h-3 w-3 text-sky-300" />
            <div className="text-[10px] uppercase tracking-widest text-sky-300/80">
              Alternate routing options
            </div>
          </div>
          <ul className="space-y-1">
            {reroutes.map((r) => (
              <li key={r.id}>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    e.stopPropagation();
                    toast.success(`Reroute proposed to dispatch`, {
                      description: `${flight.flightNumber} — ${r.label} (+${r.addMin} min, +${r.addNm} NM, +${r.addFuelKg} kg fuel).`,
                    });
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.stopPropagation();
                      toast.success(`Reroute proposed to dispatch`, {
                        description: `${flight.flightNumber} — ${r.label}.`,
                      });
                    }
                  }}
                  className="w-full text-left rounded border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] px-2 py-1.5 cursor-pointer"
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-white/90 font-medium">{r.label}</span>
                    {r.recommended && (
                      <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-400/30">
                        Recommended
                      </span>
                    )}
                    <span className={`text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded border ${confStyle(r.confidence)}`}>
                      {r.confidence} conf
                    </span>
                  </div>
                  <div className="mt-0.5 flex items-center gap-3 text-[10px] text-white/55 flex-wrap">
                    <span className="text-white/70">+{r.addMin} min</span>
                    <span>+{r.addNm} NM</span>
                    <span>+{r.addFuelKg.toLocaleString()} kg</span>
                    <span className="text-white/50">· {r.hazardAvoided}</span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}



      <div className="mt-3 flex items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1.5">
          {flight.tags.map((t) => (
            <span
              key={t}
              className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-md bg-white/5 text-white/60 border border-white/10"
            >
              {t}
            </span>
          ))}
          {flight.tags.length === 0 && (
            <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Nominal
            </span>
          )}
        </div>
        <div
          role="button"
          tabIndex={0}
          onClick={(e) => {
            e.stopPropagation();
            onViewDetails();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.stopPropagation();
              onViewDetails();
            }
          }}
          className="inline-flex items-center gap-1 text-xs text-sky-300 hover:text-sky-200 px-2 py-1 rounded-md hover:bg-white/5 cursor-pointer"
        >
          View Details
          <ChevronRight className="h-3.5 w-3.5" />
        </div>
      </div>
    </button>
  );
}
