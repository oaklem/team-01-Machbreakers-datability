import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { KpiBar } from "@/components/clearpath/KpiBar";
import { FlightCard } from "@/components/clearpath/FlightCard";
import { CascadeMap } from "@/components/clearpath/CascadeMap";
import { DetailDrawer } from "@/components/clearpath/DetailDrawer";
import { FiltersBar, DEFAULT_FILTERS, type Filters } from "@/components/clearpath/FiltersBar";
import { FLIGHTS as MOCK_FLIGHTS, type Flight } from "@/lib/clearpath-data";
import { getFlightsForLatestDate } from "@/lib/flights.functions";
import { dbRowToFlight } from "@/lib/db-to-flight";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AirportSummary } from "@/components/clearpath/AirportSummary";
import { Plane, BarChart3, Search, BookOpen, X, ClipboardList } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { ThemeToggle } from "@/components/ThemeToggle";

const flightsQuery = queryOptions({
  queryKey: ["flights", "ord", "latest"],
  queryFn: async () => {
    const res = await getFlightsForLatestDate();
    const flights = res.rows.map(dbRowToFlight) as Flight[];
    return {
      date: res.date,
      airport: res.airport,
      weather: res.weather,
      flights: flights.length ? flights : MOCK_FLIGHTS,
    };
  },
  staleTime: 60_000,
});

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ClearPath OPS — APOC Delay Severity Dashboard" },
      {
        name: "description",
        content:
          "Airport Operations Control Centre dashboard showing real-time flight delay severity, ATC flow restrictions, weather impact, turnaround status, and recommended actions for non-technical airport staff.",
      },
      { property: "og:title", content: "ClearPath OPS — APOC Delay Severity Dashboard" },
      {
        property: "og:description",
        content:
          "Real-time flight delay severity, ATC flow, weather, turnaround and recommended actions for airport operations coordinators.",
      },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(flightsQuery),
  errorComponent: ({ error }) => (
    <div className="min-h-screen grid place-items-center bg-[#0B1628] text-white p-6">
      <div className="max-w-md text-center">
        <h1 className="text-lg font-semibold mb-2">Couldn't load flight data</h1>
        <p className="text-sm text-white/60">{error.message}</p>
      </div>
    </div>
  ),
  notFoundComponent: () => <div className="p-6 text-white">No flights found.</div>,
  component: Dashboard,
});

function Dashboard() {
  const { data } = useSuspenseQuery(flightsQuery);
  const FLIGHTS = data.flights;

  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [pageSize, setPageSize] = useState<number>(100);
  const [page, setPage] = useState<number>(1);
  const [selectedId, setSelectedId] = useState<string>(
    [...FLIGHTS].sort((a, b) => b.risk - a.risk)[0]?.id ?? "",
  );
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerFlightId, setDrawerFlightId] = useState<string | null>(null);

  const handleFiltersChange = (newFilters: Filters) => {
    setFilters(newFilters);
    setPage(1);
  };

  const gateOptions = useMemo(
    () => Array.from(new Set(FLIGHTS.map((f) => f.gate))).sort(),
    [FLIGHTS],
  );

  const airlineOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const f of FLIGHTS) if (!map.has(f.airlineCode)) map.set(f.airlineCode, f.airline);
    return Array.from(map, ([code, name]) => ({ code, name })).sort((a, b) =>
      a.code.localeCompare(b.code),
    );
  }, [FLIGHTS]);

  const destinationOptions = useMemo(() => {
    const map = new Map<string, string | undefined>();
    for (const f of FLIGHTS) if (!map.has(f.destination)) map.set(f.destination, f.destinationCity);
    return Array.from(map, ([code, city]) => ({ code, city })).sort((a, b) =>
      a.code.localeCompare(b.code),
    );
  }, [FLIGHTS]);

  const delayCauseOptions = useMemo(
    () => Array.from(new Set(FLIGHTS.map((f) => f.delayCause ?? "none"))).sort(),
    [FLIGHTS],
  );

  const tailOptions = useMemo(
    () => Array.from(new Set(FLIGHTS.map((f) => f.registration).filter(Boolean))).sort(),
    [FLIGHTS],
  );

  const countryOptions = useMemo(
    () =>
      Array.from(
        new Set(FLIGHTS.map((f) => f.destinationCountry).filter((c): c is string => !!c)),
      ).sort(),
    [FLIGHTS],
  );

  const filtered = useMemo(() => {
    const q = filters.query.trim().toLowerCase();
    const result = FLIGHTS.filter((f) => {
      if (
        q &&
        !`${f.flightNumber} ${f.airlineCode} ${f.airline} ${f.origin} ${f.destination} ${f.destinationCity ?? ""} ${f.registration}`
          .toLowerCase()
          .includes(q)
      )
        return false;
      if (filters.airline && f.airlineCode !== filters.airline) return false;
      if (filters.destination && f.destination !== filters.destination) return false;
      if (filters.gate && f.gate !== filters.gate) return false;
      if (filters.risk === "high" && f.risk < 60) return false;
      if (filters.risk === "medium" && (f.risk < 30 || f.risk >= 60)) return false;
      if (filters.risk === "low" && f.risk >= 30) return false;
      if (filters.delayCause && (f.delayCause ?? "none") !== filters.delayCause) return false;
      if (filters.status === "active" && f.cancelled) return false;
      if (filters.status === "cancelled" && !f.cancelled) return false;
      if (filters.haul !== "all") {
        const d = f.distanceKm ?? 0;
        if (filters.haul === "short" && !(d > 0 && d < 1500)) return false;
        if (filters.haul === "medium" && !(d >= 1500 && d <= 4000)) return false;
        if (filters.haul === "long" && !(d > 4000)) return false;
      }
      if (filters.atc !== "all") {
        const hasType = f.atc.restrictions.some((r) => r.type === filters.atc);
        if (!hasType) return false;
      }
      // Time-based
      if (filters.depWindow !== "all") {
        const h = f.depHour ?? parseInt(f.std.slice(0, 2), 10);
        if (Number.isNaN(h)) return false;
        const inWin =
          (filters.depWindow === "earlyam" && h >= 0 && h <= 5) ||
          (filters.depWindow === "morning" && h >= 6 && h <= 11) ||
          (filters.depWindow === "afternoon" && h >= 12 && h <= 17) ||
          (filters.depWindow === "evening" && h >= 18 && h <= 21) ||
          (filters.depWindow === "redeye" && (h === 22 || h === 23));
        if (!inWin) return false;
      }
      if (filters.dayOfWeek !== "all") {
        const d = f.dayOfWeek;
        if (d == null) return false;
        if (filters.dayOfWeek === "weekday" && !(d >= 1 && d <= 5)) return false;
        if (filters.dayOfWeek === "weekend" && !(d === 6 || d === 7 || d === 0)) return false;
        if (/^[1-7]$/.test(filters.dayOfWeek) && String(d) !== filters.dayOfWeek) return false;
      }
      // Weather
      if (filters.windGust !== "all") {
        const g = f.windGustKmh ?? 0;
        if (g <= Number(filters.windGust)) return false;
      }
      if (filters.precip !== "all") {
        const p = f.precipMm ?? 0;
        if (filters.precip === "light" && !(p > 0.1)) return false;
        if (filters.precip === "heavy" && !(p > 5)) return false;
      }
      if (filters.snow !== "all") {
        const s = f.snowfallCm ?? 0;
        if (filters.snow === "any" && !(s > 0)) return false;
        if (filters.snow === "sig" && !(s > 2)) return false;
      }
      if (filters.cloudCover === "high" && (f.cloudCoverPct ?? 0) <= 80) return false;
      if (filters.weatherCat !== "all") {
        const c = f.weatherCode ?? -1;
        const cat =
          c === 0 ? "clear"
          : c >= 1 && c <= 3 ? "cloudy"
          : c === 45 || c === 48 ? "fog"
          : (c >= 51 && c <= 67) || (c >= 80 && c <= 82) ? "rain"
          : (c >= 71 && c <= 77) || (c >= 85 && c <= 86) ? "snow"
          : c >= 95 && c <= 99 ? "thunder"
          : null;
        if (cat !== filters.weatherCat) return false;
      }
      // Aircraft & geography
      if (filters.tail && f.registration !== filters.tail) return false;
      if (filters.destCountry && f.destinationCountry !== filters.destCountry) return false;
      if (filters.destRegion !== "all") {
        const isDom = (f.destinationCountry ?? "").toUpperCase() === "US" || (f.destinationCountry ?? "").toUpperCase() === "USA";
        if (filters.destRegion === "domestic" && !isDom) return false;
        if (filters.destRegion === "intl" && isDom) return false;
      }
      return true;
    });

    switch (filters.sort) {
      case "delay-desc":
        result.sort((a, b) => b.estDelay - a.estDelay);
        break;
      case "std-asc":
        result.sort((a, b) => a.std.localeCompare(b.std));
        break;
      case "distance-desc":
        result.sort((a, b) => (b.distanceKm ?? 0) - (a.distanceKm ?? 0));
        break;
      default:
        result.sort((a, b) => b.risk - a.risk);
    }
    return result;
  }, [filters, FLIGHTS]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * pageSize;
  const pageItems = filtered.slice(pageStart, pageStart + pageSize);

  // Reset to page 1 when filters or pageSize change
  useEffect(() => { setPage(1); }, [filters, pageSize]);

  const selected = FLIGHTS.find((f) => f.id === selectedId) ?? FLIGHTS[0];
  const drawerFlight = FLIGHTS.find((f) => f.id === drawerFlightId) ?? null;

  const highRisk = FLIGHTS.filter((f) => f.risk >= 60).length;
  const exposure = FLIGHTS.reduce(
    (acc, f) => acc + f.rotation.filter((l) => l.downstreamDelay > 0).length,
    0,
  );
  const avgProp = Math.round(
    FLIGHTS.reduce((acc, f) => acc + f.estDelay, 0) / FLIGHTS.length,
  );
  const atcRestrictions = FLIGHTS.reduce((acc, f) => acc + f.atc.restrictions.length, 0);

  return (
    <TooltipProvider delayDuration={150}>
      <div className="min-h-screen flex flex-col bg-[#0B1628] text-white">
        <main className="flex-1 min-w-0 flex flex-col">
          <header className="border-b border-white/5 bg-[#081020]/60 backdrop-blur px-6 py-5">
            <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-sky-500 to-indigo-600 grid place-items-center shrink-0">
                  <Plane className="h-5 w-5 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sky-400 text-[11px] uppercase tracking-widest font-bold bg-sky-500/10 px-2 py-0.5 rounded">AI OPS</span>
                    <span className="text-white/20 font-light">|</span>
                    <h1 className="text-xl font-semibold tracking-tight">
                      {data.airport ?? "—"} · Operations Delay Severity Overview
                    </h1>
                  </div>
                  <p className="text-xs text-white/50 mt-1">
                    Chicago O'Hare departures · {data.date ?? "—"} · live delay severity, ATC flow, weather, turnaround
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  to="/search"
                  className="flex items-center gap-2 text-sm text-white/70 hover:text-white px-3 py-1.5 rounded-md border border-white/10 hover:bg-white/5"
                >
                  <Search className="h-4 w-4" /> Search
                </Link>
                <Link
                  to="/statistics"
                  className="flex items-center gap-2 text-sm text-white/70 hover:text-white px-3 py-1.5 rounded-md border border-white/10 hover:bg-white/5"
                >
                  <BarChart3 className="h-4 w-4" /> Statistics
                </Link>
                <Link
                  to="/register"
                  className="flex items-center gap-2 text-sm text-white/70 hover:text-white px-3 py-1.5 rounded-md border border-white/10 hover:bg-white/5"
                >
                  <ClipboardList className="h-4 w-4" /> Register
                </Link>
                <ThemeToggle />
              </div>

            </div>
            <div className="mb-4">
              <AirportSummary
                airport={data.airport ?? "ORD"}
                city="Chicago O'Hare International"
                weather={data.weather}
              />
            </div>

            <KpiBar
              highRisk={highRisk}
              exposure={exposure}
              avgProp={avgProp}
              atcRestrictions={atcRestrictions}
            />
          </header>

          <div className="px-6 pt-5">
            <FiltersBar
              filters={filters}
              onChange={handleFiltersChange}
              gateOptions={gateOptions}
              airlineOptions={airlineOptions}
              destinationOptions={destinationOptions}
              delayCauseOptions={delayCauseOptions}
              tailOptions={tailOptions}
              countryOptions={countryOptions}
            />
          </div>

          <div className="flex-1 grid grid-cols-1 lg:grid-cols-5 gap-5 p-6 min-h-0">
            <section className="lg:col-span-3 flex flex-col min-h-0">
              <div className="flex items-baseline justify-between mb-4 gap-3 flex-wrap">
                <h2 className="text-white font-semibold">Today's Departures</h2>
                <div className="flex items-center gap-3">
                  <label className="text-xs text-white/60 flex items-center gap-2">
                    Per page
                    <select
                      value={pageSize}
                      onChange={(e) => {
                        setPageSize(Number(e.target.value));
                        setPage(1);
                      }}
                      className="h-7 rounded-md bg-[#0B1628] border border-white/10 text-white text-xs px-2 focus:outline-none focus:border-sky-400/60"
                    >
                      {[50, 100, 200, 500].map((n) => (
                        <option key={n} value={n}>{n}</option>
                      ))}
                    </select>
                  </label>
                  <span className="text-xs text-white/40">
                    {filtered.length === 0
                      ? `0 of ${FLIGHTS.length} flights`
                      : `${pageStart + 1}–${Math.min(pageStart + pageSize, filtered.length)} of ${filtered.length} (of ${FLIGHTS.length})`}
                  </span>
                </div>
              </div>
              <div className="space-y-3 overflow-y-auto pr-1">
                {filtered.length === 0 ? (
                  <div className="rounded-xl border border-white/10 bg-[#0F1D33] p-8 text-center text-sm text-white/50">
                    No flights match the current filters.
                  </div>
                ) : (
                  pageItems.map((f, i) => (
                    <FlightCard
                      key={f.id}
                      flight={f}
                      rank={pageStart + i + 1}
                      selected={f.id === selectedId}
                      onSelect={() => setSelectedId(f.id)}
                      onViewDetails={() => {
                        setSelectedId(f.id);
                        setDrawerFlightId(f.id);
                        setDrawerOpen(true);
                      }}
                    />
                  ))
                )}
              </div>
              {totalPages > 1 && (
                <div className="mt-4 flex items-center justify-between gap-3 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage <= 1}
                    className="h-8 px-3 rounded-md border border-white/10 bg-[#0B1628] text-xs text-white hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <label className="text-xs text-white/60 flex items-center gap-2">
                    Page
                    <select
                      value={currentPage}
                      onChange={(e) => setPage(Number(e.target.value))}
                      className="h-7 rounded-md bg-[#0B1628] border border-white/10 text-white text-xs px-2 focus:outline-none focus:border-sky-400/60"
                    >
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                    of {totalPages}
                  </label>
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage >= totalPages}
                    className="h-8 px-3 rounded-md border border-white/10 bg-[#0B1628] text-xs text-white hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              )}
            </section>

            <section className="lg:col-span-2 min-h-0">
              <CascadeMap flight={selected} />
            </section>
          </div>
        </main>

        <DetailDrawer flight={drawerFlight} open={drawerOpen} onOpenChange={setDrawerOpen} />
        <GlossaryOverlay />
        <Toaster theme="dark" position="top-right" />
      </div>
    </TooltipProvider>
  );
}

const GLOSSARY: { term: string; def: string }[] = [
  { term: "Flights at High Delay Severity", def: "Departures with a delay severity score ≥ 0.60 — a delay or cancellation is likely." },
  { term: "Cascade Exposure", def: "Downstream legs (aircraft rotations and connections) that could inherit a delay from today's high-severity departures." },
  { term: "Avg Delay Propagation", def: "Average extra minutes a delay tends to add to the next leg flown by the same aircraft." },
  { term: "Active ATC Restrictions", def: "Live FAA programs in effect — Ground Stops, Ground Delay Programs, or reroutes constraining flow." },
  { term: "Delay Severity Score", def: "0–1 model output combining weather, ATC, turnaround, carrier history, and time-of-day factors." },
  {
    term: "Delay Severity Color Codes",
    def: "The 0.00–1.00 score maps to three bands. Green (Low Severity) 0.00–0.29: flight is on track, no action needed. Amber (Medium Severity) 0.30–0.59: emerging pressure, monitor closely. Red (High Severity) 0.60–1.00: a delay or cancellation is likely, take mitigation action now.",
  },
  { term: "Delay Cause", def: "Primary attributable reason: Weather, Late aircraft, ATC/NAS flow, Carrier ops, or On-time." },
  {
    term: "Network Cascade View",
    def: "Right-side panel that follows one aircraft through every flight it is scheduled to fly today. It shows, at a glance, how a delay on an early leg can ripple forward and disrupt later flights using the same plane.",
  },
  {
    term: "Propagation Path Steps",
    def: "Each card in the cascade is one leg of the aircraft's day, listed top-to-bottom in the order it flies. The arrow between cards means 'the same plane continues to the next flight'. The colored score is that leg's own delay severity, and 'Downstream impact' is the minutes of delay expected to carry over into the next leg — that is propagation.",
  },
  { term: "Filters", def: "Narrow departures by airline, destination, delay severity, or cause. 'More filters' reveals gate, haul, weather, day, tail, country, region." },
];

function GlossaryOverlay() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      {open && (
        <div
          className="fixed bottom-20 right-6 z-50 w-[380px] max-w-[calc(100vw-2rem)] max-h-[70vh] rounded-xl border border-white/10 bg-[#0F1D33] shadow-2xl shadow-black/50 overflow-hidden flex flex-col animate-in fade-in slide-in-from-bottom-2"
          role="dialog"
          aria-label="Glossary"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-sky-400" />
              <h2 className="text-sm font-semibold text-white">Glossary</h2>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-white/50 hover:text-white p-1 rounded-md hover:bg-white/5"
              aria-label="Close glossary"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="overflow-y-auto px-4 py-3 space-y-3">
            {GLOSSARY.map((g) => (
              <div key={g.term}>
                <div className="text-xs font-semibold text-white">{g.term}</div>
                <p className="text-xs text-white/60 leading-relaxed mt-0.5">{g.def}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-6 right-6 z-50 inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-sky-500 hover:bg-sky-400 text-white text-sm font-medium shadow-lg shadow-sky-500/30"
        aria-expanded={open}
      >
        <BookOpen className="h-4 w-4" />
        Glossary
      </button>
    </>
  );
}
