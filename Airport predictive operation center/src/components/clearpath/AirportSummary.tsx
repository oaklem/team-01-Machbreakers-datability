import { useEffect, useState } from "react";
import { Thermometer, Wind, Eye, Gauge, Droplets, Cloud, MapPin, AlertTriangle, CloudFog, CloudSnow, CloudRain, Snowflake } from "lucide-react";
import type { LiveWeather } from "@/lib/flights.functions";

function wxLabel(code: number | null | undefined): string {
  if (code == null) return "—";
  if (code === 0) return "Clear";
  if (code <= 2) return "Mostly clear";
  if (code === 3) return "Overcast";
  if (code <= 48) return "Fog";
  if (code <= 57) return "Drizzle";
  if (code <= 67) return "Rain";
  if (code <= 77) return "Snow";
  if (code <= 82) return "Showers";
  if (code <= 86) return "Snow showers";
  return "Thunderstorm";
}

function compass(deg: number | null | undefined): string {
  if (deg == null) return "—";
  const dirs = ["N","NE","E","SE","S","SW","W","NW"];
  return dirs[Math.round(((deg % 360) / 45)) % 8];
}

// km/h to knots
const toKt = (kmh: number) => kmh * 0.539957;

type FlightCategory = { code: "VFR" | "MVFR" | "IFR" | "LIFR" | "—"; label: string; cls: string };

function flightCategory(visM: number | null | undefined, cloud: number | null | undefined): FlightCategory {
  if (visM == null && cloud == null) return { code: "—", label: "Unknown", cls: "bg-white/5 text-white/50 border-white/10" };
  const visKm = visM != null ? visM / 1000 : 99;
  const cc = cloud ?? 0;
  if (visKm < 1.6) return { code: "LIFR", label: "Low IFR", cls: "bg-rose-500/15 text-rose-300 border-rose-400/40" };
  if (visKm < 5 || cc > 80) return { code: "IFR", label: "Instrument", cls: "bg-amber-500/15 text-amber-300 border-amber-400/40" };
  if (visKm < 8 || cc > 50) return { code: "MVFR", label: "Marginal VFR", cls: "bg-sky-500/15 text-sky-300 border-sky-400/40" };
  return { code: "VFR", label: "Visual", cls: "bg-emerald-500/15 text-emerald-300 border-emerald-400/40" };
}

export function AirportSummary({
  airport,
  city,
  weather,
}: {
  airport: string;
  city: string;
  weather: LiveWeather | null;
}) {
  const [mounted, setMounted] = useState(false);
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    setMounted(true);
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const localTime = mounted
    ? now.toLocaleTimeString("en-US", {
        hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "America/Chicago",
      })
    : "--:--";
  const zulu = mounted
    ? `${String(now.getUTCHours()).padStart(2,"0")}:${String(now.getUTCMinutes()).padStart(2,"0")}Z`
    : "--:--Z";

  const visKm = weather?.visibility_m != null ? (weather.visibility_m / 1000).toFixed(1) : null;
  const cat = flightCategory(weather?.visibility_m, weather?.cloud_cover_pct);

  // Dew point spread (fog risk)
  const dewSpread = weather?.temp_c != null && weather?.dew_point_c != null
    ? weather.temp_c - weather.dew_point_c
    : null;
  const fogRisk = dewSpread != null && dewSpread <= 2;

  // Alerts
  const gustKt = weather?.wind_gust_kmh != null ? toKt(weather.wind_gust_kmh) : null;
  const windKt = weather?.wind_speed_kmh != null ? toKt(weather.wind_speed_kmh) : null;
  const highWind = (gustKt ?? 0) > 25 || (windKt ?? 0) > 20;
  const lowVis = weather?.visibility_m != null && weather.visibility_m < 5000;
  const precipNow = (weather?.precip_mm ?? 0) > 0 || (weather?.snowfall_cm ?? 0) > 0;
  const freezingPrecip = precipNow && weather?.temp_c != null && weather.temp_c <= 2;
  const snowing = (weather?.snowfall_cm ?? 0) > 0;

  const alerts: { icon: React.ReactNode; label: string; cls: string }[] = [];
  if (freezingPrecip) alerts.push({
    icon: <Snowflake className="h-3 w-3" />,
    label: "Freezing precipitation — de-ice ops",
    cls: "bg-rose-500/15 text-rose-300 border-rose-400/40",
  });
  if (highWind) alerts.push({
    icon: <Wind className="h-3 w-3" />,
    label: `High winds${gustKt ? ` · gusts ${Math.round(gustKt)}kt` : ""}`,
    cls: "bg-amber-500/15 text-amber-300 border-amber-400/40",
  });
  if (lowVis) alerts.push({
    icon: <Eye className="h-3 w-3" />,
    label: `Low visibility · ${visKm}km`,
    cls: "bg-amber-500/15 text-amber-300 border-amber-400/40",
  });
  if (fogRisk && !lowVis) alerts.push({
    icon: <CloudFog className="h-3 w-3" />,
    label: `Fog risk · spread ${dewSpread!.toFixed(1)}°C`,
    cls: "bg-sky-500/15 text-sky-300 border-sky-400/40",
  });
  if (snowing) alerts.push({
    icon: <CloudSnow className="h-3 w-3" />,
    label: `Snow · ${weather!.snowfall_cm!.toFixed(1)}cm/h`,
    cls: "bg-sky-500/15 text-sky-300 border-sky-400/40",
  });
  if (!snowing && (weather?.precip_mm ?? 0) > 0) alerts.push({
    icon: <CloudRain className="h-3 w-3" />,
    label: `Rain · ${weather!.precip_mm!.toFixed(1)}mm/h`,
    cls: "bg-sky-500/15 text-sky-300 border-sky-400/40",
  });

  const stat = (icon: React.ReactNode, label: string, value: string, sub?: string) => (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-white/[0.03] border border-white/10 min-w-0">
      <div className="text-sky-300 shrink-0">{icon}</div>
      <div className="min-w-0">
        <div className="text-[9px] uppercase tracking-widest text-white/40 leading-none">{label}</div>
        <div className="text-sm font-semibold text-white tabular-nums leading-tight truncate">
          {value}{sub && <span className="text-[10px] font-normal text-white/50 ml-1">{sub}</span>}
        </div>
      </div>
    </div>
  );

  return (
    <div className="rounded-lg border border-white/10 bg-gradient-to-br from-[#0E1B33] to-[#0A1426] p-3">
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-3 pr-4 border-r border-white/10">
          <div className="h-11 w-11 rounded-md bg-gradient-to-br from-sky-500/30 to-indigo-600/30 border border-sky-400/30 grid place-items-center">
            <MapPin className="h-5 w-5 text-sky-300" />
          </div>
          <div>
            <div className="text-2xl font-bold text-white leading-none tracking-tight">{airport}</div>
            <div className="text-[11px] text-white/50 mt-1">{city}</div>
          </div>
        </div>

        <div className="flex flex-col gap-1 pr-4 border-r border-white/10">
          <div className="text-[9px] uppercase tracking-widest text-white/40 leading-none">Local Time</div>
          <div className="font-mono text-lg font-bold text-white tabular-nums leading-tight">{localTime}</div>
        </div>

        <div className="flex flex-col gap-1 pr-4 border-r border-white/10">
          <div className="text-[9px] uppercase tracking-widest text-white/40 leading-none">Zulu Time</div>
          <div className="font-mono text-lg font-bold text-sky-400 tabular-nums leading-tight">{zulu}</div>
        </div>

        <div className={`flex flex-col items-center justify-center px-3 py-1.5 rounded-md border ${cat.cls} min-w-[78px]`}>
          <div className="text-[9px] uppercase tracking-widest opacity-70 leading-none">Flight cat</div>
          <div className="text-base font-bold tabular-nums leading-tight mt-0.5">{cat.code}</div>
          <div className="text-[9px] opacity-70 leading-none">{cat.label}</div>
        </div>

        <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
          {stat(
            <Thermometer className="h-4 w-4" />,
            "Temp",
            weather?.temp_c != null ? `${Math.round(weather.temp_c)}°` : "—",
            "C",
          )}
          {stat(
            <Wind className="h-4 w-4" />,
            "Wind",
            weather?.wind_speed_kmh != null
              ? `${compass(weather.wind_direction_deg)} ${Math.round(toKt(weather.wind_speed_kmh))}`
              : "—",
            gustKt != null && windKt != null && gustKt > windKt + 3
              ? `G${Math.round(gustKt)}kt`
              : "kt",
          )}
          {stat(
            <Eye className="h-4 w-4" />,
            "Visibility",
            visKm ?? "—",
            "km",
          )}
          {stat(
            <Cloud className="h-4 w-4" />,
            "Sky",
            wxLabel(weather?.weather_code),
            weather?.cloud_cover_pct != null ? `${Math.round(weather.cloud_cover_pct)}%` : undefined,
          )}
          {weather?.dew_point_c != null && stat(
            <CloudFog className="h-4 w-4" />,
            "Dew pt",
            `${Math.round(weather.dew_point_c)}°`,
            dewSpread != null ? `Δ${dewSpread.toFixed(1)}` : "C",
          )}
          {weather?.humidity_pct != null && stat(
            <Droplets className="h-4 w-4" />,
            "Humidity",
            `${Math.round(weather.humidity_pct)}`,
            "%",
          )}
          {weather?.precipitation_probability_pct != null && stat(
            <CloudRain className="h-4 w-4" />,
            "Precip prob",
            `${Math.round(weather.precipitation_probability_pct)}`,
            "%",
          )}
          {weather?.pressure_hpa != null && stat(
            <Gauge className="h-4 w-4" />,
            "QNH",
            `${Math.round(weather.pressure_hpa)}`,
            "hPa",
          )}
        </div>

        <div className="flex items-center gap-2 text-[10px] text-emerald-400 ml-auto">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="uppercase tracking-widest">Live · {weather?.source ?? "—"}</span>
        </div>
      </div>

      {alerts.length > 0 && (
        <div className="mt-3 pt-3 border-t border-white/5 flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1 text-[10px] uppercase tracking-widest text-white/40">
            <AlertTriangle className="h-3 w-3" /> Ops alerts
          </div>
          {alerts.map((a, i) => (
            <span
              key={i}
              className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md border text-[11px] font-medium ${a.cls}`}
            >
              {a.icon}
              {a.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
