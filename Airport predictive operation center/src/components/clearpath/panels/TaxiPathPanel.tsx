import { useMemo, useState } from "react";
import type { Flight } from "@/lib/clearpath-data";
import { getRiskBucket } from "@/lib/recommendations";
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  MapPin,
  Navigation,
  Route as RouteIcon,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { addRegisterItem } from "@/lib/register.functions";
import {
  CLOSURE_REFS,
  formatRemaining,
  isClosed,
  useClosures,
} from "@/lib/closures";
import { LiveNotamsStrip } from "./LiveNotamsStrip";

// Simple terminal -> stand catalog used to score gate suggestions.
// Coordinates are in an abstract 100x60 grid (apron diagram below).
interface Stand {
  id: string;
  terminal: "A" | "B" | "C" | "D";
  x: number;
  y: number;
  taxiTimeMin: number; // typical taxi from runway threshold
  flexible: boolean; // can host narrow + wide body
  remoteBus: boolean;
  available: boolean;
}

const STANDS: Stand[] = [
  { id: "A11", terminal: "A", x: 18, y: 14, taxiTimeMin: 8, flexible: true, remoteBus: false, available: true },
  { id: "A23", terminal: "A", x: 28, y: 18, taxiTimeMin: 9, flexible: true, remoteBus: false, available: true },
  { id: "B14", terminal: "B", x: 44, y: 30, taxiTimeMin: 11, flexible: false, remoteBus: false, available: true },
  { id: "B22", terminal: "B", x: 52, y: 8, taxiTimeMin: 12, flexible: false, remoteBus: false, available: false },
  { id: "B30", terminal: "B", x: 58, y: 38, taxiTimeMin: 13, flexible: true, remoteBus: false, available: true },
  { id: "C14", terminal: "C", x: 70, y: 26, taxiTimeMin: 14, flexible: true, remoteBus: false, available: true },
  { id: "C20", terminal: "C", x: 76, y: 22, taxiTimeMin: 15, flexible: true, remoteBus: false, available: true },
  { id: "D02", terminal: "D", x: 84, y: 44, taxiTimeMin: 18, flexible: true, remoteBus: true, available: true },
  { id: "D08", terminal: "D", x: 88, y: 48, taxiTimeMin: 19, flexible: true, remoteBus: true, available: true },
];

// Runway exit point on the grid; suggestions draw a path from here to the stand.
const RUNWAY_EXIT = { x: 6, y: 50, label: "RWY 25L Exit" };

interface GateSuggestion {
  stand: Stand;
  score: number;
  rationale: string[];
  savedMin: number;
}

function suggestGates(flight: Flight): GateSuggestion[] {
  const bucket = getRiskBucket(flight.risk);
  const isWide = /77|78|74|35|33|38|A33|A35|A38|B74|B77|B78/i.test(flight.aircraftType);
  const tightTurn = flight.turnaround.remainingMin < flight.turnaround.minimumMin;
  const currentStand = STANDS.find((s) => s.id === flight.gate);
  const currentTaxi = currentStand?.taxiTimeMin ?? 14;

  const scored: GateSuggestion[] = STANDS.filter((s) => s.available && s.id !== flight.gate).map(
    (s) => {
      const rationale: string[] = [];
      let score = 100;

      // Severity-driven priority: high = minimize taxi, prefer flexible.
      if (bucket === "high") {
        score -= s.taxiTimeMin * 3;
        if (s.flexible) {
          score += 12;
          rationale.push("Flexible stand — parallel handling unlocked");
        }
        if (s.remoteBus) {
          score -= 18;
          rationale.push("Remote bus stand adds boarding overhead");
        }
      } else if (bucket === "medium") {
        score -= s.taxiTimeMin * 2;
        if (s.flexible) {
          score += 6;
          rationale.push("Flexible stand reduces gate-conflict risk");
        }
      } else {
        score -= s.taxiTimeMin;
      }

      // Aircraft fit
      if (isWide && !s.flexible) {
        score -= 80;
        rationale.push("Cannot accept wide-body");
      } else if (isWide && s.flexible) {
        rationale.push("Wide-body capable");
      }

      // Tight turn → push for terminal where ground crew already prepped
      if (tightTurn && s.terminal === currentStand?.terminal) {
        score += 8;
        rationale.push("Same terminal — crews already in position");
      }

      const savedMin = Math.max(0, currentTaxi - s.taxiTimeMin);
      if (savedMin > 0) rationale.push(`Saves ~${savedMin} min taxi vs ${flight.gate}`);

      return { stand: s, score, rationale, savedMin };
    },
  );

  // sort high-to-low, cap at 3, ensure rationale is never empty
  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((g) => ({
      ...g,
      rationale: g.rationale.length ? g.rationale : ["Lower taxi distance from runway exit"],
    }));
}

function pathFor(stand: Stand): string {
  // Bezier path from runway exit to stand for the SVG taxiway visualization
  const mx = (RUNWAY_EXIT.x + stand.x) / 2;
  return `M ${RUNWAY_EXIT.x} ${RUNWAY_EXIT.y} Q ${mx} ${Math.min(RUNWAY_EXIT.y, stand.y) - 8} ${stand.x} ${stand.y}`;
}

const TERMINAL_COLOR: Record<Stand["terminal"], string> = {
  A: "#34D399",
  B: "#FBBF24",
  C: "#60A5FA",
  D: "#C084FC",
};

export function TaxiPathPanel({ flight }: { flight: Flight }) {
  const closures = useClosures();
  const suggestions = useMemo(() => suggestGates(flight), [flight]);
  const [selectedId, setSelectedId] = useState<string>(suggestions[0]?.stand.id ?? "");
  const addItem = useServerFn(addRegisterItem);
  const qc = useQueryClient();
  const logGateChange = useMutation({
    mutationFn: addItem,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["register-items"] }),
  });
  const bucket = getRiskBucket(flight.risk);
  const selected = suggestions.find((s) => s.stand.id === selectedId) ?? suggestions[0];
  const currentStand = STANDS.find((s) => s.id === flight.gate);

  // Closure-aware runway exit: if the active runway is fully closed, depart
  // off the alternate (north) runway instead.
  const activeRwyClosure = isClosed(CLOSURE_REFS.activeRunway, closures);
  const altRwyClosure = isClosed(CLOSURE_REFS.altRunway, closures);
  const useAltRunway = activeRwyClosure?.severity === "full";
  const runwayExit = useAltRunway
    ? { x: 6, y: 11, label: "RWY 25R exit (alt)" }
    : RUNWAY_EXIT;
  const taxiPathFor = (stand: Stand) => {
    const mx = (runwayExit.x + stand.x) / 2;
    return `M ${runwayExit.x} ${runwayExit.y} Q ${mx} ${Math.min(runwayExit.y, stand.y) - 8} ${stand.x} ${stand.y}`;
  };

  const severityColor =
    bucket === "high" ? "text-red-300" : bucket === "medium" ? "text-amber-300" : "text-emerald-300";
  const severityBg =
    bucket === "high" ? "bg-red-500/10 border-red-500/30" : bucket === "medium" ? "bg-amber-500/10 border-amber-500/30" : "bg-emerald-500/10 border-emerald-500/30";



  // Taxiway / connector segments (id → path geometry) so we can render base
  // taxiways and matching closure overlays from a single source of truth.
  const TAXIWAYS: { id: string; d: string; opacity?: number }[] = [
    { id: "TWY-PERI-NORTH", d: "M 4 13 L 96 13" },
    { id: "TWY-PERI-SOUTH", d: "M 4 46 L 96 46" },
    { id: "TWY-PERI-WEST", d: "M 4 13 L 4 46" },
    { id: "TWY-PERI-EAST", d: "M 96 13 L 96 46" },
    { id: "TWY-CROSS-MID", d: "M 35 13 L 35 46", opacity: 0.55 },
    { id: "TWY-CROSS-EAST", d: "M 65 13 L 65 46", opacity: 0.55 },
    { id: "CONN-6", d: "M 6 46 L 6 49" },
    { id: "CONN-20", d: "M 20 46 L 20 49" },
    { id: "CONN-50", d: "M 50 46 L 50 49" },
    { id: "CONN-80", d: "M 80 46 L 80 49" },
  ];

  const closureFor = (ref: string) => isClosed(ref, closures);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className={`rounded-lg border p-3 flex items-start gap-3 ${severityBg}`}>
        <Sparkles className={`h-4 w-4 mt-0.5 ${severityColor}`} />
        <div className="flex-1 text-xs leading-relaxed text-white/85">
          <span className="font-semibold text-white">Gate &amp; taxi optimizer · </span>
          Ranking apron stands by taxi-out savings, terminal fit and aircraft type for current{" "}
          <span className={severityColor}>{bucket}</span> delay severity. Currently parked at{" "}
          <span className="font-mono text-white">{flight.gate}</span>
          {currentStand && (
            <>
              {" "}
              (Terminal {currentStand.terminal} · ~{currentStand.taxiTimeMin} min taxi)
            </>
          )}
          .
        </div>
      </div>

      {/* Live NOTAM closures */}
      <LiveNotamsStrip />

      {/* Apron diagram */}
      <div className="rounded-xl border border-white/10 bg-[#06101f] overflow-hidden">
        <div className="px-3 py-2 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-white/50">
            <Navigation className="h-3 w-3" /> Apron taxi map
          </div>
          <div className="flex items-center gap-2 text-[10px] text-white/40">
            {(["A", "B", "C", "D"] as const).map((t) => (
              <span key={t} className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full" style={{ background: TERMINAL_COLOR[t] }} />
                T{t}
              </span>
            ))}
          </div>
        </div>
        <svg viewBox="0 0 100 60" className="w-full h-56 block">
          <defs>
            <pattern
              id="closure-hatch"
              patternUnits="userSpaceOnUse"
              width="2.2"
              height="2.2"
              patternTransform="rotate(45)"
            >
              <rect width="2.2" height="2.2" fill="rgba(239,68,68,0.22)" />
              <line x1="0" y1="0" x2="0" y2="2.2" stroke="#ef4444" strokeWidth="0.5" />
            </pattern>
          </defs>

          {/* Apron base */}
          <rect x="0" y="0" width="100" height="60" fill="#06101f" />
          <rect x="2" y="8" width="96" height="44" fill="#0a1a2f" rx="2" />

          {/* Runways (two parallel) */}
          <g>
            <rect x="2" y="8" width="96" height="3" fill="#1f2937" />
            <line x1="2" y1="9.5" x2="98" y2="9.5" stroke="#6b7280" strokeWidth="0.25" strokeDasharray="2 1.5" />
            <text x="3" y="7" fontSize="2" fill="#64748b">07L</text>
            <text x="94" y="7" fontSize="2" fill="#64748b">25R</text>

            <rect x="2" y="49" width="96" height="3" fill="#1f2937" />
            <line x1="2" y1="50.5" x2="98" y2="50.5" stroke="#9ca3af" strokeWidth="0.3" strokeDasharray="2 1.5" />
            <text x="3" y="55.5" fontSize="2" fill="#94a3b8">07R</text>
            <text x="94" y="55.5" fontSize="2" fill="#94a3b8">25L</text>
          </g>

          {/* Perimeter & cross taxiways (base) */}
          <g stroke="#1e3a5f" strokeWidth="1.6" fill="none" strokeLinecap="round">
            {TAXIWAYS.map((t) => (
              <path key={t.id} d={t.d} opacity={t.opacity ?? 1} />
            ))}
          </g>

          {/* Terminal buildings */}
          <g>
            <rect x="12" y="16" width="22" height="5" rx="1" fill="#0f2540" stroke="#1e3a5f" strokeWidth="0.3" />
            <text x="13" y="19.7" fontSize="2.2" fill="#34D399" opacity="0.7">Terminal A</text>
            <rect x="40" y="32" width="22" height="5" rx="1" fill="#0f2540" stroke="#1e3a5f" strokeWidth="0.3" />
            <text x="41" y="35.7" fontSize="2.2" fill="#FBBF24" opacity="0.7">Terminal B</text>
            <rect x="66" y="19" width="16" height="5" rx="1" fill="#0f2540" stroke="#1e3a5f" strokeWidth="0.3" />
            <text x="67" y="22.7" fontSize="2.2" fill="#60A5FA" opacity="0.7">Terminal C</text>
            <rect x="80" y="40" width="14" height="5" rx="1" fill="#0f2540" stroke="#1e3a5f" strokeWidth="0.3" />
            <text x="81" y="43.7" fontSize="2.2" fill="#C084FC" opacity="0.7">Term D</text>
          </g>

          {/* Closure overlays — runways */}
          {altRwyClosure && (
            <g>
              <rect x="2" y="8" width="96" height="3" fill="url(#closure-hatch)" />
              <rect x="2" y="8" width="96" height="3" fill="none" stroke="#ef4444" strokeWidth="0.4" strokeDasharray="1 0.6" />
              <text x="50" y="6.4" fontSize="2.2" fill="#fecaca" textAnchor="middle">
                NOTAM · {altRwyClosure.label} · {formatRemaining(altRwyClosure.endsAt)}
              </text>
            </g>
          )}
          {activeRwyClosure && (
            <g>
              <rect x="2" y="49" width="96" height="3" fill="url(#closure-hatch)" />
              <rect x="2" y="49" width="96" height="3" fill="none" stroke="#ef4444" strokeWidth="0.4" strokeDasharray="1 0.6" />
              <text x="50" y="55.5" fontSize="2.2" fill="#fecaca" textAnchor="middle">
                NOTAM · {activeRwyClosure.label} · {formatRemaining(activeRwyClosure.endsAt)}
              </text>
            </g>
          )}

          {/* Closure overlays — taxiways */}
          {TAXIWAYS.map((t) => {
            const c = closureFor(t.id);
            if (!c) return null;
            return (
              <g key={`cl-${t.id}`}>
                <path
                  d={t.d}
                  fill="none"
                  stroke="url(#closure-hatch)"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                />
                <path
                  d={t.d}
                  fill="none"
                  stroke="#ef4444"
                  strokeWidth="0.4"
                  strokeDasharray="1 0.6"
                />
              </g>
            );
          })}

          {/* Runway exit marker (may switch to alt runway when active closed) */}
          <circle cx={runwayExit.x} cy={runwayExit.y} r="1.4" fill="#f87171" />
          <text x={runwayExit.x + 2} y={runwayExit.y + 1} fontSize="2.4" fill="#f87171">
            {useAltRunway ? "RWY exit (alt)" : "RWY exit"}
          </text>

          {/* Suggested taxi paths */}
          {suggestions.map((s) => {
            const isSelected = s.stand.id === selectedId;
            return (
              <path
                key={`p-${s.stand.id}`}
                d={taxiPathFor(s.stand)}
                fill="none"
                stroke={isSelected ? TERMINAL_COLOR[s.stand.terminal] : "#475569"}
                strokeOpacity={isSelected ? 0.95 : 0.35}
                strokeWidth={isSelected ? 0.9 : 0.45}
                strokeDasharray={isSelected ? "0" : "1.5 1"}
              />
            );
          })}

          {/* Current stand line */}
          {currentStand && (
            <>
              <path
                d={taxiPathFor(currentStand)}
                fill="none"
                stroke="#64748b"
                strokeWidth="0.4"
                strokeDasharray="0.8 0.8"
              />
              <circle cx={currentStand.x} cy={currentStand.y} r="1.6" fill="#94a3b8" />
              <text x={currentStand.x + 2} y={currentStand.y - 1} fontSize="2.4" fill="#94a3b8">
                {currentStand.id} (now)
              </text>
            </>
          )}

          {/* Stand markers */}
          {STANDS.map((s) => {
            const sug = suggestions.find((g) => g.stand.id === s.id);
            const isSelected = s.id === selectedId;
            const baseR = sug ? 1.8 : 1.2;
            return (
              <g key={s.id} onClick={() => sug && setSelectedId(s.id)} style={{ cursor: sug ? "pointer" : "default" }}>
                <circle
                  cx={s.x}
                  cy={s.y}
                  r={isSelected ? baseR + 1 : baseR}
                  fill={s.available ? TERMINAL_COLOR[s.terminal] : "#475569"}
                  opacity={sug ? 1 : 0.4}
                  stroke={isSelected ? "white" : "none"}
                  strokeWidth="0.4"
                />
                {sug && (
                  <text x={s.x + 2.2} y={s.y + 1} fontSize="2.4" fill="white">
                    {s.id}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Suggestion cards */}
      <div className="space-y-2">
        <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-white/40">
          <RouteIcon className="h-3 w-3" /> Ranked gate suggestions
        </div>
        {suggestions.map((g, idx) => {
          const isSelected = g.stand.id === selectedId;
          return (
            <button
              key={g.stand.id}
              type="button"
              onClick={() => setSelectedId(g.stand.id)}
              className={`w-full text-left rounded-lg border p-3 transition-colors ${
                isSelected
                  ? "border-sky-400/40 bg-sky-500/10"
                  : "border-white/10 bg-white/[0.03] hover:bg-white/[0.05]"
              }`}
            >
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className="h-6 w-6 rounded grid place-items-center text-[10px] font-bold text-black"
                  style={{ background: TERMINAL_COLOR[g.stand.terminal] }}
                >
                  {g.stand.terminal}
                </span>
                <span className="font-mono text-sm font-bold text-white">{g.stand.id}</span>
                {idx === 0 && (
                  <span className="text-[9px] uppercase tracking-widest px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Recommended
                  </span>
                )}
                <span className="ml-auto flex items-center gap-3 text-[11px] text-white/70">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" /> ~{g.stand.taxiTimeMin} min taxi
                  </span>
                  {g.savedMin > 0 && (
                    <span className="text-emerald-300">−{g.savedMin} min</span>
                  )}
                </span>
              </div>
              <ul className="mt-2 text-[11px] text-white/70 space-y-0.5 pl-1">
                {g.rationale.map((r, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <CheckCircle2 className="h-3 w-3 text-emerald-400/80 mt-0.5 shrink-0" />
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            </button>
          );
        })}
        {suggestions.length === 0 && (
          <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4 text-xs text-white/60">
            No alternate stands available right now. Hold at {flight.gate}.
          </div>
        )}
      </div>

      {/* Action */}
      {selected && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.03] p-3">
          <div className="text-xs text-white/70 flex items-center gap-2">
            <MapPin className="h-3.5 w-3.5 text-sky-300" />
            Reassign{" "}
            <span className="font-mono text-white">{flight.flightNumber}</span> from{" "}
            <span className="font-mono text-white">{flight.gate}</span>
            <ArrowRight className="h-3 w-3" />
            <span className="font-mono text-white">{selected.stand.id}</span>
          </div>
          <button
            type="button"
            disabled={logGateChange.isPending}
            onClick={() => {
              const fromGate = flight.gate;
              const toGate = selected.stand.id;
              logGateChange.mutate(
                {
                  data: {
                    flight_id_ref: flight.id,
                    flight_number: flight.flightNumber,
                    flight_origin: flight.origin,
                    flight_destination: flight.destination,
                    action_id: `gate-change-${flight.id}-${Date.now()}`,
                    action_title: `Gate change ${fromGate} → ${toGate}`,
                    action_description: `${flight.flightNumber} reassigned from gate ${fromGate} to ${toGate} (terminal ${selected.stand.terminal}, ~${selected.stand.taxiTimeMin} min taxi). Rationale: ${selected.rationale.join("; ") || "operator request"}.`,
                    action_level: "act",
                  },
                },
                {
                  onSuccess: () =>
                    toast.success(`Gate reassignment logged: ${fromGate} → ${toGate}`, {
                      description: `${flight.flightNumber} — added to Activity Log.`,
                    }),
                  onError: (err) =>
                    toast.error("Failed to log gate change", {
                      description: err instanceof Error ? err.message : String(err),
                    }),
                },
              );
            }}
            className="text-xs px-3 py-1.5 rounded-md bg-sky-500 hover:bg-sky-400 disabled:opacity-60 text-sky-950 font-medium"
          >
            {logGateChange.isPending ? "Logging…" : "Request reassignment"}
          </button>
        </div>
      )}
    </div>
  );
}
