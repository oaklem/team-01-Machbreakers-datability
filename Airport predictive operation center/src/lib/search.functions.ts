import { createServerFn } from "@tanstack/react-start";

export interface LegStats {
  origin: string;
  dest: string;
  n: number;
  nCancelled: number;
  cancelPct: number;
  avgArrDelay: number;
  medianArrDelay: number;
  p85ArrDelay: number; // 85th percentile arrival delay (minutes)
  onTimePct: number; // arr_delay < 15
  p15: number; // P(arr_delay >= 15)
  p60: number; // P(arr_delay >= 60)
  cdf: { minutes: number; pct: number }[]; // P(arr_delay <= x)
  byCarrier: {
    carrier: string;
    carrierName: string | null;
    n: number;
    avgArrDelay: number;
    onTimePct: number;
  }[];
  dateMin: string | null;
  dateMax: string | null;
  destCity: string | null;
  originCity: string | null;
}

export interface ConnectionAnalysis {
  layoverMin: number;
  mctMin: number; // minimum connection time
  effectiveBufferMin: number; // layover - mct
  catchPct: number; // P(arr_delay_leg1 <= buffer)
  expectedMissPct: number;
  reasoning: string;
}

export interface SearchResult {
  generatedAt: string;
  legs: LegStats[];
  connections: ConnectionAnalysis[]; // length = legs.length - 1
  finalLegPrediction: {
    predictedArrDelayMin: number; // expected/median
    avgArrDelayMin: number;
    confidenceP85Min: number;
    onTimePct: number;
    cancelPct: number;
  } | null;
  overallTripCatchPct: number | null; // product of catchPcts
}

interface Row {
  date: string;
  arr_delay_min: number | null;
  dep_delay_min: number | null;
  cancelled: number | null;
  carrier: string | null;
  origin: string | null;
  dest: string | null;
  airline: { name: string | null } | null;
  origin_ap: { city: string | null } | null;
  dest_ap: { city: string | null } | null;
}


async function fetchLeg(
  supabaseAdmin: any,
  origin: string,
  dest: string,
): Promise<Row[]> {
  const out: Row[] = [];
  const PAGE = 1000;
  let from = 0;
  const MAX = 50_000;
  while (from < MAX) {
    const { data, error } = await supabaseAdmin
      .from("flights")
      .select(
        `date, arr_delay_min, dep_delay_min, cancelled, carrier, origin, dest,
         airline:airlines!flights_carrier_fkey(name),
         origin_ap:airports!flights_origin_fkey(city),
         dest_ap:airports!flights_dest_fkey(city)`,
      )
      .eq("origin", origin)
      .eq("dest", dest)
      .range(from, from + PAGE - 1);
    if (error) throw error;
    const batch = (data ?? []) as unknown as Row[];
    out.push(...batch);
    if (batch.length < PAGE) break;
    from += PAGE;
  }
  return out;
}

function quantile(sorted: number[], q: number): number {
  if (!sorted.length) return 0;
  const idx = (sorted.length - 1) * q;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

function computeLegStats(origin: string, dest: string, rows: Row[]): LegStats {
  const total = rows.length;
  const cancelled = rows.filter((r) => r.cancelled === 1).length;
  const active = rows.filter((r) => r.cancelled !== 1);
  const arr = active
    .map((r) => r.arr_delay_min)
    .filter((v): v is number => v != null);
  const sorted = [...arr].sort((a, b) => a - b);
  const sum = arr.reduce((s, v) => s + v, 0);
  const avg = arr.length ? sum / arr.length : 0;

  const cdf: LegStats["cdf"] = [];
  for (let x = -15; x <= 180; x += 5) {
    const pct = arr.length ? (arr.filter((d) => d <= x).length / arr.length) * 100 : 0;
    cdf.push({ minutes: x, pct });
  }

  const carrierMap = new Map<string, number[]>();
  const carrierNames = new Map<string, string | null>();
  for (const r of active) {
    if (!r.carrier || r.arr_delay_min == null) continue;
    const a = carrierMap.get(r.carrier) ?? [];
    a.push(r.arr_delay_min);
    carrierMap.set(r.carrier, a);
    if (!carrierNames.has(r.carrier)) carrierNames.set(r.carrier, r.airline?.name ?? null);
  }
  const byCarrier = [...carrierMap.entries()]
    .map(([carrier, ds]) => ({
      carrier,
      carrierName: carrierNames.get(carrier) ?? null,
      n: ds.length,
      avgArrDelay: ds.reduce((s, v) => s + v, 0) / ds.length,
      onTimePct: (ds.filter((d) => d < 15).length / ds.length) * 100,
    }))
    .sort((a, b) => b.n - a.n);

  const dates = rows.map((r) => r.date).filter(Boolean).sort();

  return {
    origin,
    dest,
    n: total,
    nCancelled: cancelled,
    cancelPct: total ? (cancelled / total) * 100 : 0,
    avgArrDelay: avg,
    medianArrDelay: quantile(sorted, 0.5),
    p85ArrDelay: quantile(sorted, 0.85),
    onTimePct: arr.length ? (arr.filter((d) => d < 15).length / arr.length) * 100 : 0,
    p15: arr.length ? (arr.filter((d) => d >= 15).length / arr.length) * 100 : 0,
    p60: arr.length ? (arr.filter((d) => d >= 60).length / arr.length) * 100 : 0,
    cdf,
    byCarrier,
    dateMin: dates[0] ?? null,
    dateMax: dates[dates.length - 1] ?? null,
    originCity: rows[0]?.origin_ap?.city ?? null,
    destCity: rows[0]?.dest_ap?.city ?? null,
  };
}

export interface SearchInput {
  legs: { origin: string; dest: string }[];
  layoverMinutes?: number[]; // length = legs.length - 1
  mctMinutes?: number; // default 45
}

export const searchRoute = createServerFn({ method: "POST" })
  .inputValidator((data: SearchInput) => {
    if (!data?.legs?.length) throw new Error("At least one leg required");
    for (const l of data.legs) {
      if (!l.origin || !l.dest) throw new Error("Each leg requires origin and dest");
    }
    return data;
  })
  .handler(async ({ data }): Promise<SearchResult> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const legRows = await Promise.all(
      data.legs.map((l) => fetchLeg(supabaseAdmin, l.origin.toUpperCase(), l.dest.toUpperCase())),
    );
    const legs = data.legs.map((l, i) =>
      computeLegStats(l.origin.toUpperCase(), l.dest.toUpperCase(), legRows[i]),
    );

    const mct = data.mctMinutes ?? 45;
    const connections: ConnectionAnalysis[] = [];
    for (let i = 0; i < legs.length - 1; i++) {
      const layover = data.layoverMinutes?.[i] ?? 90;
      const buffer = layover - mct;
      const arr = legRows[i]
        .filter((r) => r.cancelled !== 1)
        .map((r) => r.arr_delay_min)
        .filter((v): v is number => v != null);
      const catchPct = arr.length
        ? (arr.filter((d) => d <= buffer).length / arr.length) * 100
        : 0;
      // also account for leg1 cancellation as missed connection
      const cancelPct = legs[i].cancelPct;
      const effectiveCatch = catchPct * (1 - cancelPct / 100);
      const reasoning =
        buffer < 0
          ? `Layover (${layover}m) is shorter than the minimum connection time (${mct}m) — no realistic buffer to absorb delay.`
          : `You catch the connection when leg ${i + 1} arrives no more than ${buffer} minutes late. Historical fraction of flights meeting that: ${catchPct.toFixed(1)}%.`;
      connections.push({
        layoverMin: layover,
        mctMin: mct,
        effectiveBufferMin: buffer,
        catchPct: effectiveCatch,
        expectedMissPct: 100 - effectiveCatch,
        reasoning,
      });
    }

    const lastLeg = legs[legs.length - 1];
    const finalLegPrediction = lastLeg.n
      ? {
          predictedArrDelayMin: lastLeg.medianArrDelay,
          avgArrDelayMin: lastLeg.avgArrDelay,
          confidenceP85Min: lastLeg.p85ArrDelay,
          onTimePct: lastLeg.onTimePct,
          cancelPct: lastLeg.cancelPct,
        }
      : null;

    const overallTripCatchPct = connections.length
      ? connections.reduce((p, c) => p * (c.catchPct / 100), 1) * 100
      : null;

    return {
      generatedAt: new Date().toISOString(),
      legs,
      connections,
      finalLegPrediction,
      overallTripCatchPct,
    };
  });
