import { Fragment } from "react";
import type { DelayStats } from "@/lib/stats.functions";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function color(pct: number, n: number) {
  if (n === 0) return "#0B1628";
  // 0% red -> 100% green
  const t = Math.max(0, Math.min(1, pct / 100));
  const r = Math.round(239 * (1 - t) + 34 * t);
  const g = Math.round(68 * (1 - t) + 197 * t);
  const b = Math.round(68 * (1 - t) + 94 * t);
  return `rgb(${r},${g},${b})`;
}

export function PunctualityHeatmap({ cells }: { cells: DelayStats["heatmap"] }) {
  const grid: Record<number, Record<number, { onTimePct: number; n: number }>> = {};
  for (const c of cells) {
    grid[c.dow] = grid[c.dow] ?? {};
    grid[c.dow][c.hour] = { onTimePct: c.onTimePct, n: c.n };
  }

  return (
    <div className="rounded-xl border border-white/10 bg-[#0F1D33] p-5">
      <div className="mb-3">
        <h3 className="font-semibold">Punctuality heatmap</h3>
        <p className="text-xs text-white/50 mt-0.5">
          On-time % by weekday × departure hour. Red = chronic delays, green = reliable.
        </p>
      </div>
      <div className="overflow-x-auto">
        <div className="inline-block min-w-full">
          <div className="grid" style={{ gridTemplateColumns: `40px repeat(24, minmax(22px, 1fr))` }}>
            <div />
            {Array.from({ length: 24 }, (_, h) => (
              <div key={h} className="text-[10px] text-white/40 text-center tabular-nums">
                {h}
              </div>
            ))}
            {DAYS.map((d, di) => {
              const dow = di + 1;
              return (
                <Fragment key={d}>
                  <div className="text-[11px] text-white/60 pr-2 flex items-center">{d}</div>
                  {Array.from({ length: 24 }, (_, h) => {
                    const cell = grid[dow]?.[h] ?? { onTimePct: 0, n: 0 };
                    return (
                      <div
                        key={`${dow}-${h}`}
                        title={
                          cell.n
                            ? `${d} ${h}:00 — ${cell.onTimePct.toFixed(0)}% on-time (n=${cell.n})`
                            : `${d} ${h}:00 — no data`
                        }
                        className="h-6 m-0.5 rounded-sm border border-white/5"
                        style={{ backgroundColor: color(cell.onTimePct, cell.n) }}
                      />
                    );
                  })}
                </Fragment>
              );
            })}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 mt-3 text-[11px] text-white/50">
        <span>Less reliable</span>
        <div
          className="h-2 w-40 rounded-sm"
          style={{ background: "linear-gradient(to right, rgb(239,68,68), rgb(245,158,11), rgb(34,197,94))" }}
        />
        <span>More reliable</span>
      </div>
    </div>
  );
}
