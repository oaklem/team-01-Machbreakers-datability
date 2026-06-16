import { useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import type { DelayStats } from "@/lib/stats.functions";

const COLORS = ["#22C55E", "#84CC16", "#F59E0B", "#FB923C", "#EF4444", "#B91C1C"];

export function DelayHistogram({ histogram }: { histogram: DelayStats["histogram"] }) {
  const [mode, setMode] = useState<"arr" | "dep">("arr");
  const data = histogram.buckets.map((b, i) => ({
    bucket: b,
    count: mode === "arr" ? histogram.arr[i] : histogram.dep[i],
  }));
  // Include cancelled as final bar
  data.push({ bucket: "Cancelled", count: histogram.cancelled });

  return (
    <div className="rounded-xl border border-white/10 bg-[#0F1D33] p-5">
      <div className="flex items-baseline justify-between mb-3 flex-wrap gap-2">
        <div>
          <h3 className="font-semibold">Delay distribution</h3>
          <p className="text-xs text-white/50 mt-0.5">
            Flight counts by delay bucket across the entire dataset.
          </p>
        </div>
        <div className="flex gap-1 text-xs">
          {(["arr", "dep"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`px-3 py-1 rounded-md border transition-colors ${
                mode === m
                  ? "bg-sky-500/20 border-sky-500/50 text-sky-200"
                  : "bg-white/5 border-white/10 text-white/60 hover:text-white"
              }`}
            >
              {m === "arr" ? "Arrival" : "Departure"}
            </button>
          ))}
        </div>
      </div>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
            <CartesianGrid stroke="#ffffff10" />
            <XAxis dataKey="bucket" stroke="#ffffff60" fontSize={11} />
            <YAxis stroke="#ffffff60" fontSize={11} />
            <Tooltip
              contentStyle={{ background: "#0B1628", border: "1px solid #ffffff20", borderRadius: 8, fontSize: 12 }}
              formatter={(v: number) => v.toLocaleString()}
            />
            <Bar dataKey="count" radius={[6, 6, 0, 0]}>
              {data.map((_, i) => (
                <Cell key={i} fill={i === data.length - 1 ? "#7F1D1D" : COLORS[i % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
