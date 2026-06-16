import { createServerFn } from "@tanstack/react-start";

export interface DbFlightRow {
  flight_id: string;
  date: string;
  day_of_week: number | null;
  carrier: string | null;
  carrier_name: string | null;
  flight_number: number | null;
  tail_number: string | null;
  origin: string | null;
  origin_city: string | null;
  dest: string | null;
  dest_city: string | null;
  dest_country: string | null;
  sched_dep_local: string | null;
  dep_hour: number | null;
  scheduled_arr_local: string | null;
  distance_km: number | null;
  temp_c: number | null;
  wind_speed_kmh: number | null;
  wind_gust_kmh: number | null;
  precip_mm: number | null;
  snowfall_cm: number | null;
  cloud_cover_pct: number | null;
  weather_code: number | null;
  dep_delay_min: number | null;
  arr_delay_min: number | null;
  delayed_15: number | null;
  cancelled: number | null;
  delay_cause: string | null;
  late_aircraft_delay_min: number | null;
  weather_delay_min: number | null;
}

// ORD = Chicago O'Hare
const AIRPORT_CODE = "ORD";
const AIRPORT_LAT = 41.9742;
const AIRPORT_LON = -87.9073;

export interface LiveWeather {
  source: string;
  fetchedAtUtc: string;
  temp_c: number | null;
  wind_speed_kmh: number | null;
  wind_gust_kmh: number | null;
  wind_direction_deg: number | null;
  precip_mm: number | null;
  snowfall_cm: number | null;
  cloud_cover_pct: number | null;
  visibility_m: number | null;
  humidity_pct: number | null;
  pressure_hpa: number | null;
  weather_code: number | null;
  dew_point_c: number | null;
  precipitation_probability_pct: number | null;
}

async function fetchOpenMeteo(): Promise<LiveWeather | null> {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${AIRPORT_LAT}&longitude=${AIRPORT_LON}&current=temperature_2m,relative_humidity_2m,dew_point_2m,wind_speed_10m,wind_gusts_10m,wind_direction_10m,precipitation,snowfall,cloud_cover,pressure_msl,weather_code&hourly=visibility,precipitation_probability&wind_speed_unit=kmh&forecast_days=1`;
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    const j: any = await res.json();
    const c = j.current ?? {};
    // pick closest hourly visibility to now
    let vis: number | null = null;
    let pop: number | null = null;
    if (j.hourly?.time) {
      const now = Date.now();
      let best = Infinity;
      let bestIdx = -1;
      for (let i = 0; i < j.hourly.time.length; i++) {
        const t = new Date(j.hourly.time[i] + "Z").getTime();
        const d = Math.abs(t - now);
        if (d < best) { best = d; bestIdx = i; }
      }
      if (bestIdx >= 0) {
        vis = j.hourly.visibility?.[bestIdx] ?? null;
        pop = j.hourly.precipitation_probability?.[bestIdx] ?? null;
      }
    }
    return {
      source: "Open-Meteo",
      fetchedAtUtc: new Date().toISOString(),
      temp_c: c.temperature_2m ?? null,
      wind_speed_kmh: c.wind_speed_10m ?? null,
      wind_gust_kmh: c.wind_gusts_10m ?? null,
      wind_direction_deg: c.wind_direction_10m ?? null,
      precip_mm: c.precipitation ?? null,
      snowfall_cm: c.snowfall ?? null,
      cloud_cover_pct: c.cloud_cover ?? null,
      visibility_m: vis,
      humidity_pct: c.relative_humidity_2m ?? null,
      pressure_hpa: c.pressure_msl ?? null,
      weather_code: c.weather_code ?? null,
      dew_point_c: c.dew_point_2m ?? null,
      precipitation_probability_pct: pop,
    };
  } catch {
    return null;
  }
}

export const getFlightsForLatestDate = createServerFn({ method: "GET" }).handler(
  async (): Promise<{
    date: string | null;
    airport: string;
    weather: LiveWeather | null;
    rows: DbFlightRow[];
  }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Latest date with ORD flights
    const { data: latest, error: latestErr } = await supabaseAdmin
      .from("flights")
      .select("date")
      .eq("origin", AIRPORT_CODE)
      .order("date", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (latestErr) throw latestErr;
    if (!latest?.date) {
      const w = await fetchOpenMeteo();
      return { date: null, airport: AIRPORT_CODE, weather: w, rows: [] };
    }

    const [{ data, error }, weather] = await Promise.all([
      supabaseAdmin
        .from("flights")
        .select(
          `flight_id, date, day_of_week, carrier, flight_number, tail_number, origin, dest,
         sched_dep_local, dep_hour, scheduled_arr_local, distance_km,
         temp_c, wind_speed_kmh, wind_gust_kmh, precip_mm, snowfall_cm, cloud_cover_pct, weather_code,
         dep_delay_min, arr_delay_min, delayed_15, cancelled, delay_cause,
         late_aircraft_delay_min, weather_delay_min,
         airline:airlines!flights_carrier_fkey(name),
         origin_ap:airports!flights_origin_fkey(city),
         dest_ap:airports!flights_dest_fkey(city, country)`,
        )
        .eq("date", latest.date)
        .eq("origin", AIRPORT_CODE)
        .order("sched_dep_local", { ascending: true, nullsFirst: false })
        .limit(400),
      fetchOpenMeteo(),
    ]);
    if (error) throw error;

    const rows: DbFlightRow[] = (data ?? []).map((r: any) => ({
      flight_id: r.flight_id,
      date: r.date,
      day_of_week: r.day_of_week ?? null,
      carrier: r.carrier,
      carrier_name: r.airline?.name ?? null,
      flight_number: r.flight_number,
      tail_number: r.tail_number,
      origin: r.origin,
      origin_city: r.origin_ap?.city ?? null,
      dest: r.dest,
      dest_city: r.dest_ap?.city ?? null,
      dest_country: r.dest_ap?.country ?? null,
      sched_dep_local: r.sched_dep_local,
      dep_hour: r.dep_hour ?? null,
      scheduled_arr_local: r.scheduled_arr_local,
      distance_km: r.distance_km,
      // Overlay live weather (if available) so the UI reflects current ORD conditions
      temp_c: weather?.temp_c ?? r.temp_c,
      wind_speed_kmh: weather?.wind_speed_kmh ?? r.wind_speed_kmh,
      wind_gust_kmh: weather?.wind_gust_kmh ?? r.wind_gust_kmh,
      precip_mm: weather?.precip_mm ?? r.precip_mm,
      snowfall_cm: weather?.snowfall_cm ?? r.snowfall_cm,
      cloud_cover_pct: weather?.cloud_cover_pct ?? r.cloud_cover_pct,
      weather_code: weather?.weather_code ?? r.weather_code,
      dep_delay_min: r.dep_delay_min,
      arr_delay_min: r.arr_delay_min,
      delayed_15: r.delayed_15,
      cancelled: r.cancelled,
      delay_cause: r.delay_cause,
      late_aircraft_delay_min: r.late_aircraft_delay_min,
      weather_delay_min: r.weather_delay_min,
    }));

    return { date: latest.date, airport: AIRPORT_CODE, weather, rows };
  },
);

