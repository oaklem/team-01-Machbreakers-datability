import type {
  Flight,
  RiskTag,
  ATCRestriction,
  ContributingFactor,
  TurnaroundTask,
  CrewMember,
  DownstreamLeg,
  RotationLeg,
} from "./clearpath-data";
import type { DbFlightRow } from "./flights.functions";

// Stable string hash for deterministic synthesis
function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}
function pick<T>(seed: number, arr: readonly T[]): T {
  return arr[seed % arr.length];
}
function formatTime(t: string | null): string {
  if (!t) return "--:--";
  return t.slice(0, 5);
}
function addMinutes(hhmm: string, mins: number): string {
  if (hhmm === "--:--") return hhmm;
  const [h, m] = hhmm.split(":").map(Number);
  const total = (h * 60 + m + mins + 24 * 60) % (24 * 60);
  const hh = String(Math.floor(total / 60)).padStart(2, "0");
  const mm = String(total % 60).padStart(2, "0");
  return `${hh}:${mm}`;
}

const AIRLINE_COLORS: Record<string, string> = {
  UA: "#1E3A8A", AA: "#C8102E", DL: "#9B1B30", WN: "#F9B612",
  US: "#005DAA", AS: "#0E4D8E", B6: "#003876", NK: "#FFC72C",
  F9: "#0F7B5A", VX: "#CC0000", MQ: "#0033A0", EV: "#003E7E",
  OO: "#0072CE", HA: "#7A1A78",
};

const AIRCRAFT_TYPES = ["B737-800", "A320", "A321neo", "B737 MAX 8", "E175", "CRJ-900", "B757-200"];
const REG_PREFIXES = ["N", "N", "N"];

function computeRisk(row: DbFlightRow): number {
  if (row.cancelled === 1) return 95;
  const dep = row.dep_delay_min ?? 0;
  const arr = row.arr_delay_min ?? 0;
  const worst = Math.max(dep, arr, 0);
  let risk = Math.min(100, Math.round(worst * 1.6));
  // weather amplifies
  const wx = (row.precip_mm ?? 0) > 2 || (row.snowfall_cm ?? 0) > 0.5 || (row.wind_gust_kmh ?? 0) > 55;
  if (wx) risk = Math.min(100, risk + 12);
  if ((row.delayed_15 ?? 0) === 1 && risk < 35) risk = 35;
  return risk;
}

function tagsForCause(cause: string | null, row: DbFlightRow): RiskTag[] {
  const tags: RiskTag[] = [];
  switch (cause) {
    case "weather": tags.push("Weather"); break;
    case "late_aircraft": tags.push("Late Aircraft"); break;
    case "nas": tags.push("ATC Flow"); break;
    case "carrier": tags.push("Ground Handling"); break;
    case "security": tags.push("Maintenance"); break;
  }
  if ((row.snowfall_cm ?? 0) > 0.5 || (row.precip_mm ?? 0) > 2) {
    if (!tags.includes("Weather")) tags.push("Weather");
  }
  if ((row.late_aircraft_delay_min ?? 0) > 10 && !tags.includes("Late Aircraft")) {
    tags.push("Late Aircraft");
  }
  return tags;
}

function rootCauseText(row: DbFlightRow): { short: string; long: string } {
  const cause = row.delay_cause ?? "none";
  const dep = row.dep_delay_min ?? 0;
  const origin = row.origin ?? "origin";
  const dest = row.dest ?? "destination";
  if (cause === "weather") {
    return {
      short: `Weather impact at ${origin} (precip ${row.precip_mm ?? 0}mm, gust ${row.wind_gust_kmh ?? 0}km/h)`,
      long: `Weather-driven delay observed at ${origin}. Conditions: temp ${row.temp_c ?? "?"}°C, wind gusts ${row.wind_gust_kmh ?? 0} km/h, precipitation ${row.precip_mm ?? 0} mm, snowfall ${row.snowfall_cm ?? 0} cm. Departure delayed ${dep} min.`,
    };
  }
  if (cause === "late_aircraft") {
    return {
      short: `Late inbound aircraft (+${row.late_aircraft_delay_min ?? dep} min)`,
      long: `Inbound aircraft arrived late by ${row.late_aircraft_delay_min ?? dep} minutes, compressing turnaround for the ${origin}→${dest} departure. Total departure delay ${dep} min.`,
    };
  }
  if (cause === "nas") {
    return {
      short: `ATC / NAS flow restriction affecting ${dest}`,
      long: `National Airspace System flow restriction caused ${dep} min ground hold for the ${origin}→${dest} sector.`,
    };
  }
  if (cause === "carrier") {
    return {
      short: `Carrier ground operations delay`,
      long: `Carrier-attributable delay at ${origin}: ground handling, crew or operational issue. Departure delayed ${dep} min.`,
    };
  }
  if (cause === "security") {
    return {
      short: `Security / maintenance hold`,
      long: `Security or maintenance hold caused a ${dep} minute departure delay at ${origin}.`,
    };
  }
  return {
    short: dep > 0 ? `Minor delay (+${dep} min) — no single root cause` : "On schedule — nominal operations",
    long: dep > 0
      ? `No dominant delay cause attributed. Departure ran ${dep} min late at ${origin}; arrival ${row.arr_delay_min ?? 0} min vs schedule.`
      : `Flight operating on schedule. No flow restrictions or weather concerns at ${origin}.`,
  };
}

function buildATC(row: DbFlightRow): Flight["atc"] {
  const restrictions: ATCRestriction[] = [];
  const cause = row.delay_cause;
  const dest = row.dest ?? "DEST";
  if (cause === "nas") {
    restrictions.push({
      type: "GDP",
      label: `${dest} Ground Delay Program`,
      detail: `Average ground delay ${Math.max(15, row.dep_delay_min ?? 20)} min. Arrival rate reduced.`,
    });
  }
  if ((row.wind_gust_kmh ?? 0) > 50) {
    restrictions.push({
      type: "AFP",
      label: `${dest} arrival flow program`,
      detail: `Strong crosswinds (${row.wind_gust_kmh} km/h gusts) — single-runway ops.`,
    });
  }
  if ((row.snowfall_cm ?? 0) > 0.5) {
    restrictions.push({
      type: "Sector Capacity",
      label: `${row.origin} sector capacity reduced`,
      detail: `De-icing operations active. Departure rate -25%.`,
    });
  }
  return {
    restrictions,
    expectedHoldMin: Math.max(0, Math.round((row.dep_delay_min ?? 0) * 0.3)),
    expectedTaxiOutMin: 12 + (hash(row.flight_id) % 12),
    notams: cause === "nas" ? [`${dest} arrival metering in effect`] : [],
  };
}

function buildWeather(row: DbFlightRow): Flight["weather"] {
  const t = Math.round(row.temp_c ?? 10);
  const dew = t - 4;
  const wind = Math.round((row.wind_speed_kmh ?? 0) * 0.54); // to kt
  const gust = Math.round((row.wind_gust_kmh ?? 0) * 0.54);
  const dir = 180 + (hash(row.flight_id) % 180);
  const vis = (row.precip_mm ?? 0) > 1 ? "3000" : "9999";
  const metar = `${row.origin ?? "----"} ${(row.date ?? "").replaceAll("-", "").slice(2)}Z ${dir}${String(wind).padStart(2, "0")}${gust > wind ? `G${gust}` : ""}KT ${vis} ${t}/${dew} Q1013`;
  return {
    metar,
    enroute: (row.precip_mm ?? 0) > 2 ? "Convective activity along route" : "Clear, no significant weather",
    thunderstorms: (row.weather_code ?? 0) >= 95,
    lowVisibility: (row.precip_mm ?? 0) > 2 || (row.cloud_cover_pct ?? 0) > 90,
    crosswindKt: gust,
    deicingRequired: (row.snowfall_cm ?? 0) > 0.2 || (row.temp_c ?? 10) < -2,
  };
}

function buildTurnaround(row: DbFlightRow, risk: number): Flight["turnaround"] {
  const minimum = 30;
  const dep = row.dep_delay_min ?? 0;
  const remaining = Math.max(8, minimum - Math.round(dep * 0.4));
  const bottleneckIdx = hash(row.flight_id) % 4;
  const names = ["Cleaning", "Catering", "Fueling", "Baggage loading", "Boarding", "Technical checks"];
  const tasks: TurnaroundTask[] = names.map((name, i) => ({
    name,
    progress: risk > 60 ? Math.max(0, 90 - i * 18) : 80 - i * 10,
    bottleneck: i === bottleneckIdx && risk > 50,
    note: i === bottleneckIdx && risk > 50 ? "Running behind plan" : undefined,
  }));
  return { remainingMin: remaining, minimumMin: minimum, tasks };
}

function buildCrew(row: DbFlightRow): CrewMember[] {
  const h = hash(row.flight_id);
  const minutes = 360 + (h % 240);
  return [
    { role: "Captain", name: pick(h, ["J. Smith", "A. Patel", "R. Garcia", "M. Chen", "S. Johnson"]), legalUntil: addMinutes(formatTime(row.sched_dep_local), minutes), minutesRemaining: minutes },
    { role: "First Officer", name: pick(h + 1, ["T. Davis", "L. Kim", "K. Brown", "D. Wilson", "P. Singh"]), legalUntil: addMinutes(formatTime(row.sched_dep_local), minutes), minutesRemaining: minutes },
    { role: "Cabin Lead", name: pick(h + 2, ["E. Roux", "N. Walsh", "C. Murphy", "V. Lopez", "H. Park"]), legalUntil: addMinutes(formatTime(row.sched_dep_local), minutes + 60), minutesRemaining: minutes + 60 },
  ];
}

function buildRotation(row: DbFlightRow, risk: number): RotationLeg[] {
  const fn = `${row.carrier}${row.flight_number}`;
  const dep = row.dep_delay_min ?? 0;
  return [
    { flight: `${row.carrier}${(row.flight_number ?? 0) - 1}`, from: row.dest ?? "", to: row.origin ?? "", time: `${addMinutes(formatTime(row.sched_dep_local), -180)}→${addMinutes(formatTime(row.sched_dep_local), -45)}`, risk: Math.max(20, risk - 30), downstreamDelay: Math.max(0, dep - 15) },
    { flight: fn, from: row.origin ?? "", to: row.dest ?? "", time: `${formatTime(row.sched_dep_local)}→${addMinutes(formatTime(row.sched_dep_local), dep)}`, risk, downstreamDelay: dep },
    { flight: `${row.carrier}${(row.flight_number ?? 0) + 1}`, from: row.dest ?? "", to: row.origin ?? "", time: `${addMinutes(formatTime(row.scheduled_arr_local), 45)}→${addMinutes(formatTime(row.scheduled_arr_local), 180)}`, risk: Math.max(15, risk - 20), downstreamDelay: Math.max(0, Math.round(dep * 0.6)) },
  ];
}

function buildNetwork(row: DbFlightRow, risk: number): Flight["network"] {
  const fn = row.flight_number ?? 0;
  const downstream: DownstreamLeg[] = [
    {
      flight: `${row.carrier}${fn + 1}`,
      route: `${row.dest}→${row.origin}`,
      std: addMinutes(formatTime(row.scheduled_arr_local), 60),
      paxConnecting: hash(row.flight_id) % 25,
      crewDependency: true,
      impactRisk: Math.max(15, risk - 20),
    },
  ];
  return {
    downstream,
    paxConnectionsAtRisk: risk > 60 ? hash(row.flight_id) % 30 : 0,
    aircraftChain: [
      `${row.carrier}${fn - 1} ${row.dest}→${row.origin}`,
      `${row.carrier}${fn} ${row.origin}→${row.dest}`,
      `${row.carrier}${fn + 1} ${row.dest}→${row.origin}`,
    ],
  };
}

function buildFactors(row: DbFlightRow, risk: number): ContributingFactor[] {
  const factors: ContributingFactor[] = [];
  const dep = row.dep_delay_min ?? 0;
  if ((row.late_aircraft_delay_min ?? 0) > 0) {
    factors.push({ name: "Inbound aircraft delay", weight: Math.min(40, row.late_aircraft_delay_min!), status: row.late_aircraft_delay_min! > 20 ? "alert" : "watch" });
  }
  if ((row.weather_delay_min ?? 0) > 0 || (row.precip_mm ?? 0) > 1) {
    factors.push({ name: "Weather conditions", weight: Math.max(10, row.weather_delay_min ?? Math.round((row.precip_mm ?? 0) * 5)), status: (row.precip_mm ?? 0) > 3 ? "alert" : "watch" });
  }
  if (row.delay_cause === "nas") {
    factors.push({ name: "ATC flow restriction", weight: Math.min(35, Math.round(dep * 0.8)), status: "alert" });
  }
  if (row.delay_cause === "carrier") {
    factors.push({ name: "Carrier / ground operations", weight: Math.min(30, Math.round(dep * 0.6)), status: "alert" });
  }
  if (factors.length === 0) {
    factors.push({ name: "Operations nominal", weight: 5, status: "ok" });
  }
  return factors;
}

export function dbRowToFlight(row: DbFlightRow): Flight {
  const h = hash(row.flight_id);
  const carrier = row.carrier ?? "??";
  const fn = `${carrier}${row.flight_number ?? ""}`;
  const std = formatTime(row.sched_dep_local);
  const dep = row.dep_delay_min ?? 0;
  const risk = computeRisk(row);
  const cause = rootCauseText(row);
  const gate = `${pick(h, ["A", "B", "C", "D"])}${(h % 30) + 1}`;
  return {
    id: row.flight_id,
    flightNumber: fn,
    airline: row.carrier_name ?? carrier,
    airlineCode: carrier,
    airlineColor: AIRLINE_COLORS[carrier] ?? "#334155",
    origin: row.origin ?? "---",
    destination: row.dest ?? "---",
    destinationCity: row.dest_city ?? undefined,
    destinationCountry: row.dest_country ?? undefined,
    distanceKm: row.distance_km ?? undefined,
    delayCause: row.delay_cause ?? "none",
    cancelled: (row.cancelled ?? 0) === 1,
    depHour: row.dep_hour ?? undefined,
    dayOfWeek: row.day_of_week ?? undefined,
    windGustKmh: row.wind_gust_kmh ?? undefined,
    precipMm: row.precip_mm ?? undefined,
    snowfallCm: row.snowfall_cm ?? undefined,
    cloudCoverPct: row.cloud_cover_pct ?? undefined,
    weatherCode: row.weather_code ?? undefined,
    aircraftType: pick(h, AIRCRAFT_TYPES),
    registration: row.tail_number ?? `${pick(h, REG_PREFIXES)}${(h % 900) + 100}XX`,
    std,
    etd: addMinutes(std, dep),
    gate,
    estDelay: dep,
    risk,
    rootCause: cause.short,
    tags: tagsForCause(row.delay_cause, row),
    factors: buildFactors(row, risk),
    atc: buildATC(row),
    weather: buildWeather(row),
    turnaround: buildTurnaround(row, risk),
    crew: buildCrew(row),
    network: buildNetwork(row, risk),
    detail: {
      aircraft: row.tail_number ?? "—",
      rootCauseLong: cause.long,
      propagation: [
        `Scheduled departure ${std}`,
        dep > 0 ? `Departure delayed +${dep} min` : "Departure on time",
        (row.arr_delay_min ?? 0) !== 0 ? `Arrival ${row.arr_delay_min! > 0 ? "+" : ""}${row.arr_delay_min} min vs schedule` : "Arrival on schedule",
      ],
      recommendation:
        risk >= 60
          ? "Escalate to airline OCC. Review turnaround tasks and consider gate / aircraft swap if recovery slips."
          : risk >= 30
          ? "Monitor turnaround progress. Confirm crew readiness and ATC slot."
          : "No action required. Continue normal monitoring.",
    },
    rotation: buildRotation(row, risk),
  };
}
