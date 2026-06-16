import { createServerFn } from "@tanstack/react-start";

const AIRPORT = "ORD";

export interface DelayStats {
  summary: {
    total: number;
    nonCancelled: number;
    dateMin: string | null;
    dateMax: string | null;
    onTimePct: number;
    avgArrDelay: number;
    p15: number;
    p60: number;
    cancelPct: number;
  };
  cdf: { minutes: number; overall: number; byCarrier: Record<string, number> }[];
  topCarriers: string[];
  histogram: {
    buckets: string[];
    dep: number[];
    arr: number[];
    cancelled: number;
  };
  heatmap: { dow: number; hour: number; onTimePct: number; n: number }[];
  routes: {
    dest: string;
    city: string | null;
    n: number;
    onTimePct: number;
    avgDelay: number;
    p15: number;
    p60: number;
    cancelPct: number;
  }[];
}

interface Row {
  arr_delay_min: number | null;
  dep_delay_min: number | null;
  cancelled: number | null;
  dep_hour: number | null;
  day_of_week: number | null;
  carrier: string | null;
  dest: string | null;
  date: string;
  dest_ap: { city: string | null } | null;
}

export const getDelayStatistics = createServerFn({ method: "GET" }).handler(
  async (): Promise<DelayStats> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Paginate through all ORD rows
    const all: Row[] = [];
    const PAGE = 1000;
    let from = 0;
    // hard cap to avoid runaway
    const MAX = 200_000;
    while (from < MAX) {
      const { data, error } = await supabaseAdmin
        .from("flights")
        .select(
          `date, arr_delay_min, dep_delay_min, cancelled, dep_hour, day_of_week, carrier, dest,
           dest_ap:airports!flights_dest_fkey(city)`,
        )
        .eq("origin", AIRPORT)
        .range(from, from + PAGE - 1);
      if (error) throw error;
      const batch = (data ?? []) as unknown as Row[];
      all.push(...batch);
      if (batch.length < PAGE) break;
      from += PAGE;
    }

    const rows = all;
    const total = rows.length;
    const cancelled = rows.filter((r) => r.cancelled === 1).length;
    const active = rows.filter((r) => r.cancelled !== 1);
    const nonCancelled = active.length;

    const arrDelays = active
      .map((r) => r.arr_delay_min)
      .filter((v): v is number => v != null);
    const depDelays = active
      .map((r) => r.dep_delay_min)
      .filter((v): v is number => v != null);

    const sum = (a: number[]) => a.reduce((s, v) => s + v, 0);
    const avgArrDelay = arrDelays.length ? sum(arrDelays) / arrDelays.length : 0;

    const onTime = active.filter((r) => (r.arr_delay_min ?? 0) < 15).length;
    const p15 = active.filter((r) => (r.arr_delay_min ?? 0) >= 15).length;
    const p60 = active.filter((r) => (r.arr_delay_min ?? 0) >= 60).length;

    // Date range
    const dates = rows.map((r) => r.date).filter(Boolean).sort();
    const dateMin = dates[0] ?? null;
    const dateMax = dates[dates.length - 1] ?? null;

    // Top carriers by volume
    const carrierCount = new Map<string, number>();
    for (const r of rows) {
      if (!r.carrier) continue;
      carrierCount.set(r.carrier, (carrierCount.get(r.carrier) ?? 0) + 1);
    }
    const topCarriers = [...carrierCount.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([c]) => c);

    // CDF: P(arr_delay <= x) over non-cancelled
    const cdf: DelayStats["cdf"] = [];
    const step = 5;
    const carrierActive: Record<string, number[]> = {};
    for (const c of topCarriers) carrierActive[c] = [];
    for (const r of active) {
      if (r.arr_delay_min == null) continue;
      if (r.carrier && carrierActive[r.carrier]) carrierActive[r.carrier].push(r.arr_delay_min);
    }
    for (let x = -15; x <= 120; x += step) {
      const overall = arrDelays.length
        ? (arrDelays.filter((d) => d <= x).length / arrDelays.length) * 100
        : 0;
      const byCarrier: Record<string, number> = {};
      for (const c of topCarriers) {
        const arr = carrierActive[c];
        byCarrier[c] = arr.length ? (arr.filter((d) => d <= x).length / arr.length) * 100 : 0;
      }
      cdf.push({ minutes: x, overall, byCarrier });
    }

    // Histogram buckets
    const bucketEdges = [-Infinity, 0, 15, 30, 60, 120, Infinity];
    const bucketLabels = ["Early", "0–14 min", "15–29 min", "30–59 min", "60–119 min", "120+ min"];
    const bucketize = (vals: number[]) => {
      const counts = new Array(bucketLabels.length).fill(0);
      for (const v of vals) {
        for (let i = 0; i < bucketLabels.length; i++) {
          if (v >= bucketEdges[i] && v < bucketEdges[i + 1]) {
            counts[i]++;
            break;
          }
        }
      }
      return counts;
    };

    const histogram = {
      buckets: bucketLabels,
      dep: bucketize(depDelays),
      arr: bucketize(arrDelays),
      cancelled,
    };

    // Heatmap 7 x 24
    const cellOnTime = new Map<string, { ok: number; n: number }>();
    for (const r of active) {
      if (r.day_of_week == null || r.dep_hour == null) continue;
      const k = `${r.day_of_week}|${r.dep_hour}`;
      const cur = cellOnTime.get(k) ?? { ok: 0, n: 0 };
      cur.n += 1;
      if ((r.arr_delay_min ?? 0) < 15) cur.ok += 1;
      cellOnTime.set(k, cur);
    }
    const heatmap: DelayStats["heatmap"] = [];
    for (let d = 1; d <= 7; d++) {
      for (let h = 0; h < 24; h++) {
        const cell = cellOnTime.get(`${d}|${h}`);
        heatmap.push({
          dow: d,
          hour: h,
          n: cell?.n ?? 0,
          onTimePct: cell && cell.n ? (cell.ok / cell.n) * 100 : 0,
        });
      }
    }

    // Routes
    const byDest = new Map<string, Row[]>();
    for (const r of rows) {
      if (!r.dest) continue;
      const arr = byDest.get(r.dest) ?? [];
      arr.push(r);
      byDest.set(r.dest, arr);
    }
    const routes: DelayStats["routes"] = [...byDest.entries()]
      .map(([dest, list]) => {
        const n = list.length;
        const canc = list.filter((r) => r.cancelled === 1).length;
        const act = list.filter((r) => r.cancelled !== 1);
        const ad = act.map((r) => r.arr_delay_min).filter((v): v is number => v != null);
        const avg = ad.length ? sum(ad) / ad.length : 0;
        const ot = act.filter((r) => (r.arr_delay_min ?? 0) < 15).length;
        const p15c = act.filter((r) => (r.arr_delay_min ?? 0) >= 15).length;
        const p60c = act.filter((r) => (r.arr_delay_min ?? 0) >= 60).length;
        return {
          dest,
          city: list[0]?.dest_ap?.city ?? null,
          n,
          onTimePct: act.length ? (ot / act.length) * 100 : 0,
          avgDelay: avg,
          p15: act.length ? (p15c / act.length) * 100 : 0,
          p60: act.length ? (p60c / act.length) * 100 : 0,
          cancelPct: n ? (canc / n) * 100 : 0,
        };
      })
      .sort((a, b) => b.n - a.n)
      .slice(0, 30);

    return {
      summary: {
        total,
        nonCancelled,
        dateMin,
        dateMax,
        onTimePct: nonCancelled ? (onTime / nonCancelled) * 100 : 0,
        avgArrDelay,
        p15: nonCancelled ? (p15 / nonCancelled) * 100 : 0,
        p60: nonCancelled ? (p60 / nonCancelled) * 100 : 0,
        cancelPct: total ? (cancelled / total) * 100 : 0,
      },
      cdf,
      topCarriers,
      histogram,
      heatmap,
      routes,
    };
  },
);
