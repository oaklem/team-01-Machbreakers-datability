// Lightweight in-app store for "live" runway/taxiway NOTAM closures.
// No backend — a module-level array with a tick that expires entries and
// occasionally rotates in a new mock closure so the feed feels live.

import { useSyncExternalStore } from "react";
import type { Flight } from "./clearpath-data";

export type ClosureKind = "runway" | "taxiway";
export type ClosureSeverity = "partial" | "full";
export type TerminalLetter = "A" | "B" | "C" | "D";

export interface Closure {
  id: string;
  kind: ClosureKind;
  /** Stable IDs that match the `data-closure-id` attributes in the SVG. */
  refs: string[];
  /** Human label shown in NOTAM strip, e.g. "RWY 07L/25R" or "TWY Cross-Mid". */
  label: string;
  reason: string;
  severity: ClosureSeverity;
  /** Terminals whose flights are most affected by this closure. */
  terminals?: TerminalLetter[];
  /** Epoch ms — when the closure clears. */
  endsAt: number;
}

const ACTIVE_RUNWAY_REF = "RWY-07R-25L";
const ALT_RUNWAY_REF = "RWY-07L-25R";

const now = () => Date.now();
const minutes = (m: number) => m * 60_000;

// Seed three closures. One is the alternate runway (so the active runway
// stays usable), one taxiway crossing, one connector.
let closures: Closure[] = [
  {
    id: "ntm-1",
    kind: "runway",
    refs: [ALT_RUNWAY_REF],
    label: "RWY 07L/25R",
    reason: "Pavement inspection",
    severity: "full",
    endsAt: now() + minutes(22),
  },
  {
    id: "ntm-2",
    kind: "taxiway",
    refs: ["TWY-CROSS-MID"],
    label: "TWY Cross-Mid",
    reason: "Disabled tug — recovery in progress",
    severity: "partial",
    terminals: ["B", "C"],
    endsAt: now() + minutes(8),
  },
  {
    id: "ntm-3",
    kind: "taxiway",
    refs: ["CONN-20"],
    label: "TWY Connector C20",
    reason: "FOD reported on surface",
    severity: "full",
    terminals: ["A"],
    endsAt: now() + minutes(14),
  },
];

// pool of mock NOTAMs we can rotate in when one expires
const ROTATING_POOL: Omit<Closure, "id" | "endsAt">[] = [
  {
    kind: "taxiway",
    refs: ["TWY-CROSS-EAST"],
    label: "TWY Cross-East",
    reason: "Disabled aircraft on taxiway",
    severity: "full",
    terminals: ["C", "D"],
  },
  {
    kind: "taxiway",
    refs: ["TWY-PERI-NORTH"],
    label: "TWY North perimeter",
    reason: "Marking re-paint",
    severity: "partial",
    terminals: ["A", "C"],
  },
  {
    kind: "runway",
    refs: [ACTIVE_RUNWAY_REF],
    label: "RWY 07R/25L",
    reason: "Bird activity — temporary hold",
    severity: "partial",
  },
  {
    kind: "taxiway",
    refs: ["CONN-80"],
    label: "TWY Connector D08",
    reason: "Fuel spill cleanup",
    severity: "full",
    terminals: ["D"],
  },
];

const listeners = new Set<() => void>();
let snapshot: readonly Closure[] = closures;

function publish() {
  snapshot = [...closures];
  for (const l of listeners) l();
}

function tick() {
  const t = now();
  const before = closures.length;
  closures = closures.filter((c) => c.endsAt > t);

  // Occasionally introduce a new closure so the feed feels alive.
  // Probability per 5-second tick: ~1/4 when we have <=2 active.
  if (closures.length <= 2 && Math.random() < 0.25) {
    const pool = ROTATING_POOL.filter(
      (p) => !closures.some((c) => c.refs[0] === p.refs[0]),
    );
    if (pool.length) {
      const pick = pool[Math.floor(Math.random() * pool.length)];
      closures.push({
        ...pick,
        id: `ntm-${Math.random().toString(36).slice(2, 8)}`,
        endsAt: t + minutes(6 + Math.floor(Math.random() * 18)),
      });
    }
  }

  if (closures.length !== before || true) publish();
}

let intervalId: ReturnType<typeof setInterval> | null = null;
function ensureTicking() {
  if (intervalId == null && typeof window !== "undefined") {
    intervalId = setInterval(tick, 5_000);
  }
}

function subscribe(listener: () => void) {
  ensureTicking();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot() {
  return snapshot;
}

function getServerSnapshot() {
  return snapshot;
}

/** Subscribe React component to the live closures list. */
export function useClosures(): readonly Closure[] {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/** Synchronous snapshot for non-React call sites. */
export function getActiveClosures(): readonly Closure[] {
  return snapshot;
}

export function isClosed(ref: string, closures: readonly Closure[]): Closure | undefined {
  return closures.find((c) => c.refs.includes(ref));
}

export function formatRemaining(endsAt: number): string {
  const ms = Math.max(0, endsAt - Date.now());
  const total = Math.round(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export interface ClosureImpact {
  delta: number;
  reasons: string[];
  affected: Closure[];
}

/** Compute the risk-score bump for a flight given current closures. */
export function closureImpact(
  flight: Flight,
  closuresArg?: readonly Closure[],
): ClosureImpact {
  const list = closuresArg ?? snapshot;
  if (!list.length) return { delta: 0, reasons: [], affected: [] };

  const gateTerminal = (flight.gate?.[0] ?? "") as TerminalLetter;
  const reasons: string[] = [];
  const affected: Closure[] = [];
  let delta = 0;

  for (const c of list) {
    if (c.kind === "runway") {
      const isActive = c.refs.includes(ACTIVE_RUNWAY_REF);
      const bump = isActive
        ? c.severity === "full"
          ? 14
          : 6
        : c.severity === "full"
          ? 5
          : 2;
      delta += bump;
      affected.push(c);
      reasons.push(
        `${c.label} ${c.severity === "full" ? "closed" : "restricted"} — ${c.reason}`,
      );
    } else {
      const hitsTerminal = c.terminals?.includes(gateTerminal) ?? false;
      const bump = hitsTerminal ? (c.severity === "full" ? 6 : 3) : 2;
      delta += bump;
      affected.push(c);
      reasons.push(
        hitsTerminal
          ? `${c.label} blocks taxi to Terminal ${gateTerminal}`
          : `${c.label} ${c.severity === "full" ? "closed" : "restricted"}`,
      );
    }
  }

  // Cap so closures alone can't push a low-risk flight straight to red.
  delta = Math.min(delta, 25);
  return { delta, reasons, affected };
}

/** Convenience hook returning the impact for a single flight, live. */
export function useClosureImpact(flight: Flight): ClosureImpact {
  const list = useClosures();
  return closureImpact(flight, list);
}

export const CLOSURE_REFS = {
  activeRunway: ACTIVE_RUNWAY_REF,
  altRunway: ALT_RUNWAY_REF,
};
