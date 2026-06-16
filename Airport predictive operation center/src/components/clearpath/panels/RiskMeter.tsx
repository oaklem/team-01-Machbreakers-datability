import type { Flight } from "@/lib/clearpath-data";
import { riskColor, riskLabel, riskScore01 } from "@/lib/clearpath-data";
import { InfoTip } from "../InfoTip";

export function RiskMeter({ flight }: { flight: Flight }) {
  const color = riskColor(flight.risk);
  const pct = flight.risk;

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-widest text-white/40">
          Delay severity score
          <InfoTip label="Delay severity score">
            A combined score from 0.00 to 1.00 estimating how likely this flight is to depart late. Green is healthy, amber needs attention, red needs action.
          </InfoTip>
        </div>
        <span
          className="text-[10px] uppercase tracking-widest font-semibold px-2 py-0.5 rounded"
          style={{ backgroundColor: `${color}22`, color }}
        >
          {riskLabel(flight.risk)}
        </span>
      </div>

      <div className="flex items-baseline gap-2">
        <div className="text-4xl font-bold tabular-nums" style={{ color }}>
          {riskScore01(flight.risk)}
        </div>
        <div className="text-xs text-white/50">/ 1.00</div>
      </div>

      <div className="mt-3 relative h-2.5 w-full rounded-full bg-white/5 overflow-hidden">
        <div className="absolute inset-y-0 left-0 w-[30%] bg-emerald-500/20" />
        <div className="absolute inset-y-0 left-[30%] w-[30%] bg-amber-500/20" />
        <div className="absolute inset-y-0 left-[60%] w-[40%] bg-red-500/20" />
        <div
          className="absolute top-0 bottom-0 w-1 bg-white shadow-[0_0_8px_rgba(255,255,255,0.6)]"
          style={{ left: `calc(${pct}% - 2px)` }}
        />
      </div>
      <div className="flex justify-between text-[10px] text-white/40 mt-1 font-mono">
        <span>0.00</span>
        <span>0.30</span>
        <span>0.60</span>
        <span>1.00</span>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-1.5 text-[10px] border-t border-white/5 pt-3">
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
          <div className="min-w-0">
            <p className="text-emerald-400 font-medium font-sans">Low Severity</p>
            <p className="text-white/40 font-mono">0.00–0.29</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-amber-500 shrink-0" />
          <div className="min-w-0">
            <p className="text-amber-400 font-medium font-sans">Medium Severity</p>
            <p className="text-white/40 font-mono">0.30–0.59</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-red-500 shrink-0" />
          <div className="min-w-0">
            <p className="text-red-400 font-medium font-sans">High Severity</p>
            <p className="text-white/40 font-mono">0.60–1.00</p>
          </div>
        </div>
      </div>

      <div className="mt-4">
        <div className="text-[10px] uppercase tracking-widest text-white/40 mb-2">Contributing factors</div>
        <div className="space-y-1.5">
          {flight.factors.map((f) => {
            const fc = f.status === "alert" ? "#EF4444" : f.status === "watch" ? "#F59E0B" : "#10B981";
            return (
              <div key={f.name} className="flex items-center gap-2 text-xs">
                <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: fc }} />
                <span className="text-white/75 flex-1">{f.name}</span>
                <span className="text-white/40 font-mono tabular-nums">+{f.weight}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
