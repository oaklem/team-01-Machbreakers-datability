import type { DelayStats } from "@/lib/stats.functions";

export function StatsKpiStrip({ summary }: { summary: DelayStats["summary"] }) {
  const tiles = [
    { label: "On-time arrival", value: `${summary.onTimePct.toFixed(1)}%`, color: "#22C55E" },
    { label: "Avg arrival delay", value: `${summary.avgArrDelay.toFixed(1)} min`, color: "#F59E0B" },
    { label: "P(delay ≥ 15 min)", value: `${summary.p15.toFixed(1)}%`, color: "#F59E0B" },
    { label: "P(delay ≥ 60 min)", value: `${summary.p60.toFixed(1)}%`, color: "#EF4444" },
    { label: "Cancellation rate", value: `${summary.cancelPct.toFixed(1)}%`, color: "#A78BFA" },
  ];
  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
      {tiles.map((t) => (
        <div key={t.label} className="rounded-xl border border-white/10 bg-[#0F1D33] p-4">
          <div className="text-[11px] uppercase tracking-widest text-white/40">{t.label}</div>
          <div className="text-2xl font-bold tabular-nums mt-1" style={{ color: t.color }}>
            {t.value}
          </div>
        </div>
      ))}
    </div>
  );
}
