import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { ArrowLeft, BarChart3 } from "lucide-react";
import { getDelayStatistics } from "@/lib/stats.functions";
import { StatsKpiStrip } from "@/components/clearpath/stats/StatsKpiStrip";
import { ProbabilityCurveChart } from "@/components/clearpath/stats/ProbabilityCurveChart";
import { DelayHistogram } from "@/components/clearpath/stats/DelayHistogram";
import { PunctualityHeatmap } from "@/components/clearpath/stats/PunctualityHeatmap";
import { RouteReliabilityTable } from "@/components/clearpath/stats/RouteReliabilityTable";

const statsQuery = queryOptions({
  queryKey: ["delay-stats", "ord"],
  queryFn: () => getDelayStatistics(),
  staleTime: 5 * 60_000,
});

export const Route = createFileRoute("/statistics")({
  head: () => ({
    meta: [
      { title: "ORD Delay Statistics — ClearPath OPS" },
      {
        name: "description",
        content:
          "Probability analysis of Chicago O'Hare departures: on-time curves, delay distributions, weekday/hour punctuality heatmap, and route reliability ranking.",
      },
      { property: "og:title", content: "ORD Delay Statistics — ClearPath OPS" },
      {
        property: "og:description",
        content:
          "Historical probability and reliability statistics for ORD departures — inspired by bahnvorhersage.de.",
      },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(statsQuery),
  errorComponent: ({ error }) => (
    <div className="min-h-screen bg-[#0B1628] text-white p-6">
      <h1 className="text-lg font-semibold mb-2">Couldn't load statistics</h1>
      <p className="text-sm text-white/60">{error.message}</p>
    </div>
  ),
  notFoundComponent: () => (
    <div className="min-h-screen bg-[#0B1628] text-white p-6">No data.</div>
  ),
  component: StatisticsPage,
});

function StatisticsPage() {
  const { data } = useSuspenseQuery(statsQuery);
  const { summary } = data;

  return (
    <div className="min-h-screen bg-[#0B1628] text-white">
      <header className="border-b border-white/5 bg-[#081020]/60 backdrop-blur px-6 py-5">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-emerald-500 to-sky-600 grid place-items-center">
              <BarChart3 className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-emerald-400 text-[11px] uppercase tracking-widest font-bold bg-emerald-500/10 px-2 py-0.5 rounded">
                  ANALYTICS
                </span>
                <span className="text-white/20 font-light">|</span>
                <h1 className="text-xl font-semibold tracking-tight">
                  ORD · Delay Probability Statistics
                </h1>
              </div>
              <p className="text-xs text-white/50 mt-1">
                {summary.total.toLocaleString()} flights ·{" "}
                {summary.dateMin ?? "—"} → {summary.dateMax ?? "—"} · historical reliability
                analysis
              </p>
            </div>
          </div>
          <Link
            to="/"
            className="flex items-center gap-2 text-sm text-white/70 hover:text-white px-3 py-1.5 rounded-md border border-white/10 hover:bg-white/5"
          >
            <ArrowLeft className="h-4 w-4" /> Live Ops
          </Link>
        </div>
      </header>

      <main className="p-6 space-y-5 max-w-[1600px] mx-auto">
        <StatsKpiStrip summary={summary} />
        <ProbabilityCurveChart cdf={data.cdf} topCarriers={data.topCarriers} />
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          <DelayHistogram histogram={data.histogram} />
          <PunctualityHeatmap cells={data.heatmap} />
        </div>
        <RouteReliabilityTable routes={data.routes} />
      </main>
    </div>
  );
}
