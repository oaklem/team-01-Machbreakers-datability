import { ArrowDown, Plane } from "lucide-react";
import { Flight, riskColor, riskLabel, riskScore01 } from "@/lib/clearpath-data";

export function CascadeMap({ flight }: { flight: Flight }) {
  return (
    <div className="rounded-xl border border-white/10 bg-[#0F1D33] p-5 h-full flex flex-col">
      <div className="flex items-baseline justify-between mb-1">
        <h2 className="text-white font-semibold">Network Cascade View</h2>
        <span className="text-xs text-white/40">Aircraft rotation</span>
      </div>
      <div className="text-xs text-white/50 mb-5">
        Tracking <span className="text-white">{flight.detail.aircraft}</span> — selected via{" "}
        <span className="text-sky-300">{flight.flightNumber}</span>
      </div>

      <div className="flex-1 overflow-y-auto pr-1 space-y-1">
        {flight.rotation.map((leg, i) => {
          const color = riskColor(leg.risk);
          const isSelected = leg.flight === flight.flightNumber;
          return (
            <div key={`${leg.flight}-${i}`}>
              <div
                className={`rounded-lg border p-3 ${
                  isSelected ? "border-sky-400/60 bg-sky-400/5" : "border-white/10 bg-white/[0.02]"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="h-8 w-8 rounded-full grid place-items-center shrink-0"
                    style={{ backgroundColor: `${color}22`, color }}
                  >
                    <Plane className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-white font-semibold text-sm">{leg.flight}</span>
                      <span className="text-white/60 text-xs">
                        {leg.from} → {leg.to}
                      </span>
                    </div>
                    <div className="text-[11px] text-white/50 mt-0.5 font-mono">{leg.time}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-lg font-bold tabular-nums" style={{ color }}>
                      {riskScore01(leg.risk)}
                    </div>
                    <div className="text-[9px] uppercase tracking-widest" style={{ color }}>
                      {riskLabel(leg.risk)}
                    </div>
                  </div>
                </div>
                <div className="mt-2 flex items-center justify-between text-[11px]">
                  <span className="text-white/50">Downstream impact</span>
                  <span
                    className="font-mono font-semibold"
                    style={{ color: leg.downstreamDelay > 0 ? color : "#10B981" }}
                  >
                    {leg.downstreamDelay > 0 ? `+${leg.downstreamDelay} min` : "No carry"}
                  </span>
                </div>
              </div>
              {i < flight.rotation.length - 1 && (
                <div className="flex justify-center py-1">
                  <ArrowDown className="h-4 w-4 text-white/20" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
