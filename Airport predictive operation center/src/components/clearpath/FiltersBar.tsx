import { Search, X, SlidersHorizontal, ChevronDown } from "lucide-react";
import { useState } from "react";
import { type ATCRestrictionType } from "@/lib/clearpath-data";

export type RiskFilter = "all" | "high" | "medium" | "low";
export type SortKey = "risk-desc" | "std-asc" | "delay-desc" | "distance-desc";
export type HaulFilter = "all" | "short" | "medium" | "long";
export type StatusFilter = "all" | "active" | "cancelled";
export type DepWindow = "all" | "earlyam" | "morning" | "afternoon" | "evening" | "redeye";
export type DayOfWeek = "all" | "weekday" | "weekend" | "1" | "2" | "3" | "4" | "5" | "6" | "7";
export type WindGustFilter = "all" | "25" | "40" | "60";
export type PrecipFilter = "all" | "light" | "heavy";
export type SnowFilter = "all" | "any" | "sig";
export type CloudCoverFilter = "all" | "high";
export type WeatherCat = "all" | "clear" | "cloudy" | "fog" | "rain" | "snow" | "thunder";
export type DestRegion = "all" | "domestic" | "intl";

export interface Filters {
  query: string;
  airline: string;
  destination: string;
  gate: string;
  risk: RiskFilter;
  atc: ATCRestrictionType | "all";
  delayCause: string;
  haul: HaulFilter;
  status: StatusFilter;
  sort: SortKey;
  // new
  depWindow: DepWindow;
  dayOfWeek: DayOfWeek;
  windGust: WindGustFilter;
  precip: PrecipFilter;
  snow: SnowFilter;
  cloudCover: CloudCoverFilter;
  weatherCat: WeatherCat;
  tail: string;
  destCountry: string;
  destRegion: DestRegion;
}

export const DEFAULT_FILTERS: Filters = {
  query: "",
  airline: "",
  destination: "",
  gate: "",
  risk: "all",
  atc: "all",
  delayCause: "",
  haul: "all",
  status: "all",
  sort: "std-asc",
  depWindow: "all",
  dayOfWeek: "all",
  windGust: "all",
  precip: "all",
  snow: "all",
  cloudCover: "all",
  weatherCat: "all",
  tail: "",
  destCountry: "",
  destRegion: "all",
};

export interface AirlineOption { code: string; name: string }
export interface DestinationOption { code: string; city?: string }

interface Props {
  filters: Filters;
  onChange: (f: Filters) => void;
  gateOptions: string[];
  airlineOptions: AirlineOption[];
  destinationOptions: DestinationOption[];
  delayCauseOptions: string[];
  tailOptions: string[];
  countryOptions: string[];
}

const CAUSE_LABEL: Record<string, string> = {
  none: "On time / no cause",
  weather: "Weather",
  late_aircraft: "Late aircraft",
  nas: "ATC / NAS flow",
  carrier: "Carrier ops",
  security: "Security / maintenance",
};

export function FiltersBar({
  filters,
  onChange,
  gateOptions,
  airlineOptions,
  destinationOptions,
  delayCauseOptions,
  tailOptions,
  countryOptions,
}: Props) {
  const set = <K extends keyof Filters>(k: K, v: Filters[K]) => onChange({ ...filters, [k]: v });
  const [expanded, setExpanded] = useState(false);

  const advancedActiveCount =
    (filters.gate ? 1 : 0) +
    (filters.haul !== "all" ? 1 : 0) +
    (filters.status !== "all" ? 1 : 0) +
    (filters.depWindow !== "all" ? 1 : 0) +
    (filters.dayOfWeek !== "all" ? 1 : 0) +
    (filters.windGust !== "all" ? 1 : 0) +
    (filters.precip !== "all" ? 1 : 0) +
    (filters.snow !== "all" ? 1 : 0) +
    (filters.cloudCover !== "all" ? 1 : 0) +
    (filters.weatherCat !== "all" ? 1 : 0) +
    (filters.tail ? 1 : 0) +
    (filters.destCountry ? 1 : 0) +
    (filters.destRegion !== "all" ? 1 : 0);

  const isActive =
    !!filters.query ||
    !!filters.airline ||
    !!filters.destination ||
    !!filters.delayCause ||
    filters.risk !== "all" ||
    advancedActiveCount > 0;

  const selectClass =
    "h-9 rounded-md bg-[#0B1628] border border-white/10 text-white text-xs px-2 focus:outline-none focus:border-sky-400/60";

  return (
    <div className="rounded-xl border border-white/10 bg-[#0F1D33] p-3 space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
          <input
            type="text"
            value={filters.query}
            onChange={(e) => set("query", e.target.value)}
            placeholder="Search flight #, airline, tail, destination or city…"
            className="w-full h-9 rounded-md bg-[#0B1628] border border-white/10 text-white text-sm pl-9 pr-3 placeholder:text-white/30 focus:outline-none focus:border-sky-400/60"
          />
        </div>

        <select value={filters.airline} onChange={(e) => set("airline", e.target.value)} className={selectClass}>
          <option value="">All airlines</option>
          {airlineOptions.map((a) => (
            <option key={a.code} value={a.code}>{a.code} — {a.name}</option>
          ))}
        </select>

        <select value={filters.destination} onChange={(e) => set("destination", e.target.value)} className={selectClass}>
          <option value="">All destinations</option>
          {destinationOptions.map((d) => (
            <option key={d.code} value={d.code}>{d.code}{d.city ? ` — ${d.city}` : ""}</option>
          ))}
        </select>

        <select value={filters.risk} onChange={(e) => set("risk", e.target.value as RiskFilter)} className={selectClass}>
          <option value="all">All severity levels</option>
          <option value="high">High (0.60+)</option>
          <option value="medium">Medium (0.30–0.59)</option>
          <option value="low">Low (&lt; 0.30)</option>
        </select>

        <select value={filters.delayCause} onChange={(e) => set("delayCause", e.target.value)} className={selectClass}>
          <option value="">All delay causes</option>
          {delayCauseOptions.map((c) => (<option key={c} value={c}>{CAUSE_LABEL[c] ?? c}</option>))}
        </select>

        <div className="ml-auto flex items-center gap-2 pl-2 border-l border-white/10">
          <span className="text-[10px] uppercase tracking-widest text-white/40">Sort</span>
          <select value={filters.sort} onChange={(e) => set("sort", e.target.value as SortKey)} className={selectClass}>
            <option value="risk-desc">Highest severity</option>
            <option value="delay-desc">Longest delay</option>
            <option value="std-asc">Earliest STD</option>
            <option value="distance-desc">Longest distance</option>
          </select>
        </div>

        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md border border-white/10 bg-[#0B1628] text-white/80 hover:text-white hover:border-sky-400/60 text-xs"
          aria-expanded={expanded}
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          More filters
          {advancedActiveCount > 0 && (
            <span className="ml-0.5 inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-sky-500/20 text-sky-300 text-[10px] font-semibold px-1">
              {advancedActiveCount}
            </span>
          )}
          <ChevronDown className={`h-3.5 w-3.5 transition-transform ${expanded ? "rotate-180" : ""}`} />
        </button>

        {isActive && (
          <button
            type="button"
            onClick={() => onChange(DEFAULT_FILTERS)}
            className="inline-flex items-center gap-1 text-xs text-white/60 hover:text-white px-2 py-1 rounded-md hover:bg-white/5"
          >
            <X className="h-3.5 w-3.5" /> Reset
          </button>
        )}
      </div>

      {expanded && (
        <div className="pt-2 border-t border-white/10 flex flex-wrap items-center gap-2">
          <select value={filters.gate} onChange={(e) => set("gate", e.target.value)} className={selectClass}>
            <option value="">All gates</option>
            {gateOptions.map((g) => (<option key={g} value={g}>Gate {g}</option>))}
          </select>

          <select value={filters.haul} onChange={(e) => set("haul", e.target.value as HaulFilter)} className={selectClass}>
            <option value="all">All haul lengths</option>
            <option value="short">Short-haul (&lt; 1500 km)</option>
            <option value="medium">Medium-haul (1500–4000 km)</option>
            <option value="long">Long-haul (&gt; 4000 km)</option>
          </select>

          <select value={filters.status} onChange={(e) => set("status", e.target.value as StatusFilter)} className={selectClass}>
            <option value="all">All statuses</option>
            <option value="active">Active only</option>
            <option value="cancelled">Cancelled only</option>
          </select>

          <select value={filters.depWindow} onChange={(e) => set("depWindow", e.target.value as DepWindow)} className={selectClass}>
            <option value="all">All dep windows</option>
            <option value="earlyam">Early AM (00–05)</option>
            <option value="morning">Morning (06–11)</option>
            <option value="afternoon">Afternoon (12–17)</option>
            <option value="evening">Evening (18–21)</option>
            <option value="redeye">Red-eye (22–23)</option>
          </select>

          <select value={filters.dayOfWeek} onChange={(e) => set("dayOfWeek", e.target.value as DayOfWeek)} className={selectClass}>
            <option value="all">All days</option>
            <option value="weekday">Weekdays</option>
            <option value="weekend">Weekend</option>
            <option value="1">Mon</option>
            <option value="2">Tue</option>
            <option value="3">Wed</option>
            <option value="4">Thu</option>
            <option value="5">Fri</option>
            <option value="6">Sat</option>
            <option value="7">Sun</option>
          </select>

          <select value={filters.windGust} onChange={(e) => set("windGust", e.target.value as WindGustFilter)} className={selectClass}>
            <option value="all">All wind gusts</option>
            <option value="25">Gusts &gt; 25 km/h</option>
            <option value="40">Gusts &gt; 40 km/h</option>
            <option value="60">Gusts &gt; 60 km/h</option>
          </select>

          <select value={filters.precip} onChange={(e) => set("precip", e.target.value as PrecipFilter)} className={selectClass}>
            <option value="all">All precipitation</option>
            <option value="light">Light (&gt; 0.1 mm)</option>
            <option value="heavy">Heavy (&gt; 5 mm)</option>
          </select>

          <select value={filters.snow} onChange={(e) => set("snow", e.target.value as SnowFilter)} className={selectClass}>
            <option value="all">All snowfall</option>
            <option value="any">Any snow (&gt; 0)</option>
            <option value="sig">Significant (&gt; 2 cm)</option>
          </select>

          <select value={filters.cloudCover} onChange={(e) => set("cloudCover", e.target.value as CloudCoverFilter)} className={selectClass}>
            <option value="all">All cloud cover</option>
            <option value="high">Overcast (&gt; 80%)</option>
          </select>

          <select value={filters.weatherCat} onChange={(e) => set("weatherCat", e.target.value as WeatherCat)} className={selectClass}>
            <option value="all">All weather</option>
            <option value="clear">Clear</option>
            <option value="cloudy">Cloudy</option>
            <option value="fog">Fog</option>
            <option value="rain">Rain</option>
            <option value="snow">Snow</option>
            <option value="thunder">Thunderstorm</option>
          </select>

          <select value={filters.tail} onChange={(e) => set("tail", e.target.value)} className={selectClass}>
            <option value="">All tails</option>
            {tailOptions.map((t) => (<option key={t} value={t}>{t}</option>))}
          </select>

          <select value={filters.destCountry} onChange={(e) => set("destCountry", e.target.value)} className={selectClass}>
            <option value="">All countries</option>
            {countryOptions.map((c) => (<option key={c} value={c}>{c}</option>))}
          </select>

          <select value={filters.destRegion} onChange={(e) => set("destRegion", e.target.value as DestRegion)} className={selectClass}>
            <option value="all">All regions</option>
            <option value="domestic">Domestic (US)</option>
            <option value="intl">International</option>
          </select>
        </div>
      )}
    </div>
  );
}
