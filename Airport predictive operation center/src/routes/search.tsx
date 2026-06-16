import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Search,
  Plane,
  Clock,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  GitFork,
} from "lucide-react";
import {
  searchRoute,
  type SearchResult,
  type LegStats,
  type ConnectionAnalysis,
} from "@/lib/search.functions";

interface LegInput {
  origin: string;
  dest: string;
}

export const Route = createFileRoute("/search")({
  head: () => ({
    meta: [
      { title: "Flight Probability Search — ClearPath OPS" },
      {
        name: "description",
        content:
          "Search flights and compute on-time probability, predicted delay, and connection-catching probability from historical data — inspired by bahnvorhersage.de.",
      },
      { property: "og:title", content: "Flight Probability Search — ClearPath OPS" },
    ],
  }),
  validateSearch: (s: Record<string, unknown>) => ({
    origin: typeof s.origin === "string" ? s.origin : undefined,
    dest: typeof s.dest === "string" ? s.dest : undefined,
    via: typeof s.via === "string" ? s.via : undefined,
    layover: typeof s.layover === "string" ? Number(s.layover) : undefined,
  }),
  component: SearchPage,
});

function SearchPage() {
  const initial = Route.useSearch();
  const initialLegs: LegInput[] = initial.via
    ? [
        { origin: initial.origin ?? "ORD", dest: initial.via },
        { origin: initial.via, dest: initial.dest ?? "" },
      ]
    : [{ origin: initial.origin ?? "ORD", dest: initial.dest ?? "" }];

  const [legs, setLegs] = useState<LegInput[]>(initialLegs);
  const [layovers, setLayovers] = useState<number[]>(
    Array(Math.max(0, initialLegs.length - 1)).fill(initial.layover ?? 90),
  );
  const [mct, setMct] = useState(45);

  const searchFn = useServerFn(searchRoute);
  const mutation = useMutation({
    mutationFn: (input: { legs: LegInput[]; layoverMinutes: number[]; mctMinutes: number }) =>
      searchFn({ data: input }),
  });

  const addLeg = () => {
    const last = legs[legs.length - 1];
    setLegs([...legs, { origin: last.dest || "", dest: "" }]);
    setLayovers([...layovers, 90]);
  };
  const removeLeg = (i: number) => {
    if (legs.length <= 1) return;
    setLegs(legs.filter((_, idx) => idx !== i));
    setLayovers(layovers.filter((_, idx) => idx !== Math.min(i, layovers.length - 1)));
  };
  const updateLeg = (i: number, key: keyof LegInput, v: string) => {
    setLegs(legs.map((l, idx) => (idx === i ? { ...l, [key]: v.toUpperCase().slice(0, 3) } : l)));
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (legs.some((l) => !l.origin || !l.dest)) return;
    mutation.mutate({ legs, layoverMinutes: layovers, mctMinutes: mct });
  };

  return (
    <div className="min-h-screen bg-[#0B1628] text-white">
      <header className="border-b border-white/5 bg-[#081020]/60 backdrop-blur px-6 py-5">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-sky-500 to-indigo-600 grid place-items-center">
              <Search className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-semibold">Flight Delay Probability Search</h1>
              <p className="text-xs text-white/50 mt-1 max-w-xl">
                Analyze route reliability using Cumulative Distribution Function (CDF) curves of historical arrival delays to predict exact arrival performance and connection-catching probabilities for multi-leg journeys.
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

      <main className="max-w-6xl mx-auto p-6 space-y-6">
        <form
          onSubmit={onSubmit}
          className="rounded-xl border border-white/10 bg-[#0F1D33] p-5 space-y-4"
        >
          <div className="space-y-3">
            {legs.map((leg, i) => (
              <div key={i}>
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-[10px] uppercase tracking-widest text-white/40 w-12">
                    Leg {i + 1}
                  </span>
                  <Field
                    label="From"
                    value={leg.origin}
                    onChange={(v) => updateLeg(i, "origin", v)}
                    placeholder="ORD"
                  />
                  <Plane className="h-4 w-4 text-white/40" />
                  <Field
                    label="To"
                    value={leg.dest}
                    onChange={(v) => updateLeg(i, "dest", v)}
                    placeholder="MCO"
                  />
                  {legs.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeLeg(i)}
                      className="text-white/40 hover:text-rose-400 p-1.5"
                      aria-label="Remove leg"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
                {i < legs.length - 1 && (
                  <div className="ml-16 mt-2 flex items-center gap-3">
                    <Clock className="h-3.5 w-3.5 text-white/40" />
                    <label className="text-[11px] uppercase tracking-widest text-white/40">
                      Layover at {leg.dest || "—"}
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={layovers[i] ?? 90}
                      onChange={(e) =>
                        setLayovers(
                          layovers.map((v, idx) => (idx === i ? Number(e.target.value) : v)),
                        )
                      }
                      className="w-20 px-2 py-1 rounded-md bg-white/5 border border-white/10 text-sm tabular-nums"
                    />
                    <span className="text-xs text-white/50">min</span>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="flex items-center gap-3 flex-wrap pt-2 border-t border-white/5">
            <button
              type="button"
              onClick={addLeg}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border border-white/10 hover:bg-white/5 text-white/70"
            >
              <Plus className="h-3.5 w-3.5" /> Add connection
            </button>
            <div className="flex items-center gap-2 text-xs text-white/60">
              <span className="uppercase tracking-widest text-[10px]">MCT</span>
              <input
                type="number"
                min={0}
                value={mct}
                onChange={(e) => setMct(Number(e.target.value))}
                className="w-16 px-2 py-1 rounded-md bg-white/5 border border-white/10 tabular-nums"
              />
              <span>min</span>
              <span className="text-white/40">(minimum connection time)</span>
            </div>
            <div className="flex-1" />
            <button
              type="submit"
              disabled={mutation.isPending}
              className="flex items-center gap-2 text-sm px-4 py-2 rounded-md bg-sky-500 hover:bg-sky-400 text-white font-medium disabled:opacity-50"
            >
              <Search className="h-4 w-4" />
              {mutation.isPending ? "Analyzing…" : "Analyze"}
            </button>
          </div>
        </form>

        {mutation.isError && (
          <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-200">
            {(mutation.error as Error).message}
          </div>
        )}

        {mutation.data && <Results result={mutation.data} />}

        {!mutation.data && !mutation.isPending && (
          <div className="rounded-xl border border-white/10 bg-[#0F1D33]/50 p-8 text-center text-sm text-white/50">
            Enter a route above and click Analyze. Add a connection to see catch-probability for the
            transfer.
          </div>
        )}

        <Glossary />
      </main>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <label className="flex flex-col gap-0.5">
      <span className="text-[10px] uppercase tracking-widest text-white/40">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-20 px-2 py-1.5 rounded-md bg-white/5 border border-white/10 text-sm font-mono uppercase"
      />
    </label>
  );
}

function Results({ result }: { result: SearchResult }) {
  return (
    <div className="space-y-6">
      {result.overallTripCatchPct != null && (
        <div className="rounded-xl border border-white/10 bg-gradient-to-br from-[#0F1D33] to-[#13294A] p-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="text-[11px] uppercase tracking-widest text-white/40">
                End-to-end trip success
              </div>
              <div className="text-4xl font-bold tabular-nums mt-1" style={catchColor(result.overallTripCatchPct)}>
                {result.overallTripCatchPct.toFixed(1)}%
              </div>
              <div className="text-xs text-white/55 mt-1">
                Probability of catching every connection (product of leg catch rates).
              </div>
            </div>
            {result.finalLegPrediction && (
              <FinalLegCard pred={result.finalLegPrediction} />
            )}
          </div>
        </div>
      )}

      {!result.overallTripCatchPct && result.finalLegPrediction && (
        <FinalLegCard pred={result.finalLegPrediction} solo />
      )}

      {result.legs.map((leg, i) => (
        <div key={i} className="space-y-3">
          {i > 0 && result.connections[i - 1] && (
            <ConnectionCard
              conn={result.connections[i - 1]}
              viaCode={result.legs[i - 1].dest}
              viaCity={result.legs[i - 1].destCity}
            />
          )}
          <LegCard leg={leg} index={i} />
        </div>
      ))}
    </div>
  );
}

function FinalLegCard({
  pred,
  solo = false,
}: {
  pred: NonNullable<SearchResult["finalLegPrediction"]>;
  solo?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border border-white/10 bg-white/[0.03] p-4 ${solo ? "" : "min-w-[280px]"}`}
    >
      <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-widest text-white/40">
        <TrendingUp className="h-3.5 w-3.5" /> Predicted arrival delay (final leg)
      </div>
      <div className="flex items-baseline gap-2 mt-1">
        <span className="text-3xl font-bold tabular-nums text-amber-300">
          {pred.predictedArrDelayMin >= 0 ? "+" : ""}
          {pred.predictedArrDelayMin.toFixed(0)}
        </span>
        <span className="text-sm text-white/50">min (median)</span>
      </div>
      <div className="grid grid-cols-3 gap-3 mt-3 text-xs">
        <Stat label="Avg" value={`${pred.avgArrDelayMin >= 0 ? "+" : ""}${pred.avgArrDelayMin.toFixed(1)}m`} />
        <Stat label="85th pct" value={`${pred.confidenceP85Min.toFixed(0)}m`} />
        <Stat label="On-time" value={`${pred.onTimePct.toFixed(0)}%`} />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-white/40">{label}</div>
      <div className="font-semibold tabular-nums">{value}</div>
    </div>
  );
}

function ConnectionCard({
  conn,
  viaCode,
  viaCity,
}: {
  conn: ConnectionAnalysis;
  viaCode: string;
  viaCity: string | null;
}) {
  const good = conn.catchPct >= 80;
  const bad = conn.catchPct < 50;
  const Icon = good ? CheckCircle2 : AlertTriangle;
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.02] p-4">
      <div className="flex items-start gap-3">
        <Icon
          className={`h-5 w-5 mt-0.5 ${good ? "text-emerald-400" : bad ? "text-rose-400" : "text-amber-400"}`}
        />
        <div className="flex-1">
          <div className="flex items-baseline justify-between flex-wrap gap-2">
            <div className="text-sm">
              <span className="text-white/50">Connection at</span>{" "}
              <span className="font-semibold">{viaCode}</span>
              {viaCity && <span className="text-white/50"> · {viaCity}</span>}
            </div>
            <div className="text-2xl font-bold tabular-nums" style={catchColor(conn.catchPct)}>
              {conn.catchPct.toFixed(1)}% catch
            </div>
          </div>
          <div className="text-xs text-white/55 mt-1">{conn.reasoning}</div>
          <div className="text-[11px] text-white/40 mt-1">
            Layover {conn.layoverMin}m − MCT {conn.mctMin}m = {conn.effectiveBufferMin}m buffer ·
            Expected miss rate {conn.expectedMissPct.toFixed(1)}%
          </div>
        </div>
      </div>
    </div>
  );
}

function LegCard({ leg, index }: { leg: LegStats; index: number }) {
  if (leg.n === 0) {
    return (
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-5">
        <div className="font-semibold">
          Leg {index + 1}: {leg.origin} → {leg.dest}
        </div>
        <div className="text-sm text-amber-200/80 mt-1">
          No historical flights found for this route in the dataset.
        </div>
      </div>
    );
  }
  return (
    <div className="rounded-xl border border-white/10 bg-[#0F1D33] p-5">
      <div className="flex items-baseline justify-between flex-wrap gap-2 mb-3">
        <div>
          <div className="font-semibold">
            Leg {index + 1}: {leg.origin}{leg.originCity ? ` · ${leg.originCity}` : ""} → {leg.dest}
            {leg.destCity ? ` · ${leg.destCity}` : ""}
          </div>
          <div className="text-xs text-white/50">
            {leg.n.toLocaleString()} historical flights · {leg.dateMin} → {leg.dateMax}
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-widest text-white/40">On-time</div>
          <div className="text-2xl font-bold tabular-nums" style={catchColor(leg.onTimePct)}>
            {leg.onTimePct.toFixed(1)}%
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
        <MiniStat label="Avg delay" value={`${leg.avgArrDelay >= 0 ? "+" : ""}${leg.avgArrDelay.toFixed(1)}m`} />
        <MiniStat label="Median" value={`${leg.medianArrDelay >= 0 ? "+" : ""}${leg.medianArrDelay.toFixed(0)}m`} />
        <MiniStat label="85th pct" value={`${leg.p85ArrDelay.toFixed(0)}m`} />
        <MiniStat label="P(≥60m)" value={`${leg.p60.toFixed(1)}%`} />
        <MiniStat label="Cancel" value={`${leg.cancelPct.toFixed(1)}%`} />
      </div>

      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={leg.cdf} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
            <CartesianGrid stroke="#ffffff10" />
            <XAxis dataKey="minutes" stroke="#ffffff60" fontSize={11} />
            <YAxis stroke="#ffffff60" fontSize={11} domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
            <Tooltip
              contentStyle={{ background: "#0B1628", border: "1px solid #ffffff20", borderRadius: 8, fontSize: 12 }}
              formatter={(v: number) => `${v.toFixed(1)}%`}
              labelFormatter={(l) => `≤ ${l} min`}
            />
            <ReferenceLine x={15} stroke="#F59E0B" strokeDasharray="3 3" />
            <Line type="monotone" dataKey="pct" stroke="#38BDF8" strokeWidth={2.5} dot={false} name="P(delay ≤ x)" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {leg.byCarrier.length > 0 && (
        <div className="mt-3">
          <div className="text-[11px] uppercase tracking-widest text-white/40 mb-2">By carrier</div>
          <div className="flex flex-wrap gap-2">
            {leg.byCarrier.slice(0, 6).map((c) => (
              <div
                key={c.carrier}
                className="text-xs px-2 py-1 rounded-md border border-white/10 bg-white/[0.03]"
              >
                <span className="font-semibold text-white">{c.carrierName ?? c.carrier}</span>{" "}
                <span className="font-mono text-[10px] text-white/40">({c.carrier})</span>{" "}
                <span className="text-white/50">· {c.n}</span>{" "}
                <span style={catchColor(c.onTimePct)}>{c.onTimePct.toFixed(0)}% on-time</span>{" "}
                <span className="text-white/50">
                  · avg {c.avgArrDelay >= 0 ? "+" : ""}
                  {c.avgArrDelay.toFixed(1)}m
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-white/[0.03] border border-white/10 px-3 py-2">
      <div className="text-[10px] uppercase tracking-widest text-white/40">{label}</div>
      <div className="text-sm font-semibold tabular-nums mt-0.5">{value}</div>
    </div>
  );
}

function catchColor(pct: number): React.CSSProperties {
  if (pct >= 80) return { color: "#22C55E" };
  if (pct >= 60) return { color: "#FACC15" };
  if (pct >= 40) return { color: "#F59E0B" };
  return { color: "#EF4444" };
}

function Glossary() {
  const items = [
    {
      icon: TrendingUp,
      term: "Cumulative Distribution Function (CDF)",
      def: "A curve showing what % of past flights arrived within X minutes of schedule. A point at (15 min, 85%) means 85% of flights were no more than 15 minutes late.",
    },
    {
      icon: Clock,
      term: "Arrival Delay",
      def: "Actual arrival time minus scheduled arrival time, in minutes. Positive = late, negative = early. Industry convention treats arrivals within 15 min as 'on-time'.",
    },
    {
      icon: GitFork,
      term: "Connection-Catching Probability",
      def: "The chance you'll make your next flight. Computed from the first leg's historical arrival distribution against the available buffer (layover minus the airport's Minimum Connection Time).",
    },
  ];
  return (
    <section className="rounded-xl border border-white/10 bg-[#0F1D33] p-5">
      <div className="text-[11px] uppercase tracking-widest text-white/40 mb-3">Glossary</div>
      <div className="grid gap-4 md:grid-cols-3">
        {items.map(({ icon: Icon, term, def }) => (
          <div key={term} className="rounded-lg border border-white/10 bg-white/[0.02] p-4">
            <div className="flex items-center gap-2 mb-1.5">
              <Icon className="h-4 w-4 text-sky-400" />
              <h3 className="text-sm font-semibold text-white">{term}</h3>
            </div>
            <p className="text-xs text-white/60 leading-relaxed">{def}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
