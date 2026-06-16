import { AlertCircle } from "lucide-react";
import type { Flight } from "@/lib/clearpath-data";
import { InfoTip } from "../InfoTip";

export function TurnaroundPanel({ flight }: { flight: Flight }) {
  const t = flight.turnaround;
  const tight = t.remainingMin < t.minimumMin;

  return (
    <div className="space-y-3">
      <div
        className={`rounded-lg border p-3 flex items-center justify-between ${
          tight ? "border-red-500/30 bg-red-500/5" : "border-white/10 bg-white/[0.03]"
        }`}
      >
        <div>
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-white/40">
            Time until pushback
            <InfoTip label="Turnaround time">
              The time left before the aircraft needs to push back from the gate. Each task (cleaning, fueling, boarding) must finish before this clock reaches zero.
            </InfoTip>
          </div>
          <div className={`text-2xl font-bold mt-1 tabular-nums ${tight ? "text-red-300" : "text-white"}`}>
            {t.remainingMin} min
          </div>
          <div className="text-xs text-white/50 mt-0.5">Minimum required: {t.minimumMin} min</div>
        </div>
        {tight && (
          <div className="text-right text-xs text-red-300 max-w-[150px]">
            <AlertCircle className="h-4 w-4 inline mr-1" />
            Below minimum — pushback at risk
          </div>
        )}
      </div>

      <div className="space-y-2">
        {t.tasks.map((task) => {
          const color =
            task.progress >= 100
              ? "#10B981"
              : task.bottleneck
              ? "#EF4444"
              : task.progress > 0
              ? "#F59E0B"
              : "#64748B";
          return (
            <div key={task.name} className="rounded-md border border-white/10 bg-white/[0.02] p-3">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-white font-medium">{task.name}</span>
                  {task.bottleneck && (
                    <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-red-500/15 text-red-300 border border-red-500/30">
                      Bottleneck
                    </span>
                  )}
                </div>
                <span className="text-xs font-mono tabular-nums" style={{ color }}>
                  {task.progress}%
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-white/5 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${task.progress}%`, backgroundColor: color }}
                />
              </div>
              {task.note && <div className="text-[11px] text-white/55 mt-1.5">{task.note}</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
