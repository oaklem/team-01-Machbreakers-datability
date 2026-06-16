import { useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from "recharts";
import type { DelayStats } from "@/lib/stats.functions";

const CARRIER_COLORS = ["#38BDF8", "#F59E0B", "#A78BFA", "#22C55E", "#EF4444"];

export function ProbabilityCurveChart({
  cdf,
  topCarriers,
}: {
  cdf: DelayStats["cdf"];
  topCarriers: string[];
}) {
  const [mode, setMode] = useState<"overall" | "carrier">("overall");

  const data = cdf.map((d) => {
    const row: Record<string, number> = { minutes: d.minutes, overall: +d.overall.toFixed(2) };
    for (const c of topCarriers) row[c] = +(d.byCarrier[c] ?? 0).toFixed(2);
    return row;
  });

  return (
    <div className="rounded-xl border border-white/10 bg-[#0F1D33] p-5">
      <div className="flex items-baseline justify-between mb-3 flex-wrap gap-2">
        <div>
          <h3 className="font-semibold">On-time probability curve</h3>
          <p className="text-xs text-white/50 mt-0.5">
            P(arrival delay ≤ x minutes). Steeper rise near 0 = more reliable.
          </p>
        </div>
        <div className="flex gap-1 text-xs">
          {(["overall", "carrier"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`px-3 py-1 rounded-md border transition-colors ${
                mode === m
                  ? "bg-sky-500/20 border-sky-500/50 text-sky-200"
                  : "bg-white/5 border-white/10 text-white/60 hover:text-white"
              }`}
            >
              {m === "overall" ? "Overall" : "By carrier"}
            </button>
          ))}
        </div>
      </div>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
            <CartesianGrid stroke="#ffffff10" />
            <XAxis
              dataKey="minutes"
              stroke="#ffffff60"
              fontSize={11}
              label={{ value: "Delay (min)", position: "insideBottom", offset: -2, fill: "#ffffff80", fontSize: 11 }}
            />
            <YAxis
              stroke="#ffffff60"
              fontSize={11}
              domain={[0, 100]}
              tickFormatter={(v) => `${v}%`}
            />
            <Tooltip
              contentStyle={{ background: "#0B1628", border: "1px solid #ffffff20", borderRadius: 8, fontSize: 12 }}
              formatter={(v: number) => `${v.toFixed(1)}%`}
              labelFormatter={(l) => `≤ ${l} min`}
            />
            <ReferenceLine x={15} stroke="#F59E0B" strokeDasharray="3 3" label={{ value: "15m", fill: "#F59E0B", fontSize: 10 }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            {mode === "overall" ? (
              <Line type="monotone" dataKey="overall" stroke="#38BDF8" strokeWidth={2.5} dot={false} name="All flights" />
            ) : (
              topCarriers.map((c, i) => (
                <Line
                  key={c}
                  type="monotone"
                  dataKey={c}
                  stroke={CARRIER_COLORS[i % CARRIER_COLORS.length]}
                  strokeWidth={2}
                  dot={false}
                  name={c}
                />
              ))
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
