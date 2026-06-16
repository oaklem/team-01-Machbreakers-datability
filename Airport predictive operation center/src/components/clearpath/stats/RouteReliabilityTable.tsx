import { useMemo, useState } from "react";
import type { DelayStats } from "@/lib/stats.functions";

type SortKey = "n" | "onTimePct" | "avgDelay" | "p15" | "p60" | "cancelPct";

export function RouteReliabilityTable({ routes }: { routes: DelayStats["routes"] }) {
  const [sortKey, setSortKey] = useState<SortKey>("n");
  const [dir, setDir] = useState<"asc" | "desc">("desc");

  const sorted = useMemo(() => {
    const arr = [...routes];
    arr.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      return dir === "asc" ? av - bv : bv - av;
    });
    return arr;
  }, [routes, sortKey, dir]);

  const headers: { key: SortKey | "dest"; label: string }[] = [
    { key: "dest", label: "Destination" },
    { key: "n", label: "Flights" },
    { key: "onTimePct", label: "On-time %" },
    { key: "avgDelay", label: "Avg delay" },
    { key: "p15", label: "P(≥15m)" },
    { key: "p60", label: "P(≥60m)" },
    { key: "cancelPct", label: "Cancel %" },
  ];

  const onSort = (k: SortKey) => {
    if (k === sortKey) setDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(k);
      setDir("desc");
    }
  };

  const pctColor = (pct: number) =>
    pct >= 80 ? "text-emerald-400" : pct >= 65 ? "text-amber-400" : "text-rose-400";

  return (
    <div className="rounded-xl border border-white/10 bg-[#0F1D33] p-5">
      <div className="mb-3">
        <h3 className="font-semibold">Route reliability (top 30 by volume)</h3>
        <p className="text-xs text-white/50 mt-0.5">Click a column to sort.</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-white/50 text-[11px] uppercase tracking-wider">
              {headers.map((h) => (
                <th
                  key={h.key}
                  onClick={() => h.key !== "dest" && onSort(h.key as SortKey)}
                  className={`text-left py-2 px-2 font-medium ${
                    h.key !== "dest" ? "cursor-pointer hover:text-white" : ""
                  }`}
                >
                  {h.label}
                  {sortKey === h.key && (dir === "desc" ? " ↓" : " ↑")}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((r) => (
              <tr key={r.dest} className="border-t border-white/5 hover:bg-white/5">
                <td className="py-2 px-2">
                  <div className="font-medium">{r.dest}</div>
                  {r.city && <div className="text-[11px] text-white/50">{r.city}</div>}
                </td>
                <td className="py-2 px-2 tabular-nums">{r.n.toLocaleString()}</td>
                <td className={`py-2 px-2 tabular-nums font-medium ${pctColor(r.onTimePct)}`}>
                  {r.onTimePct.toFixed(1)}%
                </td>
                <td className="py-2 px-2 tabular-nums">{r.avgDelay.toFixed(1)} min</td>
                <td className="py-2 px-2 tabular-nums">{r.p15.toFixed(1)}%</td>
                <td className="py-2 px-2 tabular-nums">{r.p60.toFixed(1)}%</td>
                <td className="py-2 px-2 tabular-nums">{r.cancelPct.toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
