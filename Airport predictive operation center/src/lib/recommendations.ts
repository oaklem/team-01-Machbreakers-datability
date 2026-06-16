import {
  Activity,
  AlertTriangle,
  ArrowRightLeft,
  Bell,
  CloudRain,
  Eye,
  GitBranch,
  Plane,
  Snowflake,
  Users,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import type { Flight, RiskTag } from "./clearpath-data";

export type ActionLevel = "monitor" | "prepare" | "act";

export interface Recommendation {
  id: string;
  title: string;
  description: string;
  level: ActionLevel;
  icon: LucideIcon;
  cause?: RiskTag | "Turnaround" | "Gate" | "General";
}

export type RerouteConfidence = "High" | "Medium" | "Low";

export interface RerouteOption {
  id: string;
  label: string;
  hazardAvoided: string;
  addMin: number;
  addNm: number;
  addFuelKg: number;
  confidence: RerouteConfidence;
  recommended?: boolean;
}

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function getWeatherRerouteOptions(flight: Flight): RerouteOption[] {
  if (!flight.tags.includes("Weather") || getRiskBucket(flight.risk) !== "high") return [];
  const w = flight.weather;
  if (!w) return [];
  const hasSignal = w.thunderstorms || w.lowVisibility || w.deicingRequired || (w.crosswindKt ?? 0) >= 25;
  if (!hasSignal && !flight.tags.includes("Weather")) return [];

  const distNm = Math.max(150, Math.round((flight.distanceKm ?? 1500) * 0.54));
  const wide = /77|78|74|35|33|38|A33|A35|A38|B74|B77|B78/i.test(flight.aircraftType);
  // burn kg per added NM (rough): wide-body ~12, narrow ~6
  const burnPerNm = wide ? 12 : 6;
  const seed = hashStr(flight.id || flight.flightNumber);

  const opts: RerouteOption[] = [];

  if (w.thunderstorms) {
    const addNm = 40 + (seed % 25);
    opts.push({
      id: "wx-lateral",
      label: "Lateral deviation around active cells",
      hazardAvoided: "Avoids CB cluster on filed track",
      addNm,
      addMin: Math.round(addNm / 7),
      addFuelKg: Math.round(addNm * burnPerNm),
      confidence: "High",
      recommended: true,
    });
    opts.push({
      id: "wx-climb",
      label: "Step-climb above tops (request FL400+)",
      hazardAvoided: "Clears tops of convective layer",
      addNm: 10,
      addMin: 4,
      addFuelKg: Math.round(10 * burnPerNm + 250),
      confidence: "Medium",
    });
  }

  if (w.lowVisibility || w.deicingRequired) {
    opts.push({
      id: "wx-alt",
      label: w.deicingRequired
        ? "Divert via warmer alternate, skip de-ice queue"
        : "Divert to CAT III-capable alternate",
      hazardAvoided: w.deicingRequired ? "Clear of icing layer" : "Meets CAT III minima",
      addNm: 80 + (seed % 40),
      addMin: 25 + (seed % 10),
      addFuelKg: Math.round((80 + (seed % 40)) * burnPerNm + 400),
      confidence: "Medium",
      recommended: opts.length === 0,
    });
    opts.push({
      id: "wx-hold",
      label: "Hold 20 min for visibility trend + contingency fuel",
      hazardAvoided: "Buys time for METAR improvement",
      addNm: 0,
      addMin: 20,
      addFuelKg: Math.round(burnPerNm * 30),
      confidence: "Low",
    });
  }

  if ((w.crosswindKt ?? 0) >= 25) {
    opts.push({
      id: "wx-rwy",
      label: "Request alternate runway / intersection departure",
      hazardAvoided: `Crosswind ≤ 18 kt on alt runway (currently ${w.crosswindKt} kt)`,
      addNm: 5,
      addMin: 6,
      addFuelKg: Math.round(5 * burnPerNm + 120),
      confidence: "High",
      recommended: opts.length === 0,
    });
  }

  if (opts.length === 0) {
    opts.push(
      {
        id: "wx-coord",
        label: "Coordinated reroute with dispatch",
        hazardAvoided: "Avoids forecast weather on filed track",
        addNm: 30,
        addMin: 12,
        addFuelKg: Math.round(30 * burnPerNm),
        confidence: "Medium",
        recommended: true,
      },
      {
        id: "wx-delay",
        label: "Delay 20 min for cell movement",
        hazardAvoided: "Lets system clear corridor",
        addNm: 0,
        addMin: 20,
        addFuelKg: Math.round(burnPerNm * 25),
        confidence: "Low",
      },
    );
  }

  // ensure exactly one recommended; cap to 3
  const capped = opts.slice(0, 3);
  if (!capped.some((o) => o.recommended)) capped[0].recommended = true;
  return capped;
}

const LEVEL_COLORS: Record<ActionLevel, { bg: string; border: string; text: string }> = {
  monitor: { bg: "rgba(16,185,129,0.10)", border: "rgba(16,185,129,0.35)", text: "#34D399" },
  prepare: { bg: "rgba(245,158,11,0.10)", border: "rgba(245,158,11,0.40)", text: "#FBBF24" },
  act: { bg: "rgba(239,68,68,0.12)", border: "rgba(239,68,68,0.45)", text: "#F87171" },
};

export function levelStyles(level: ActionLevel) {
  return LEVEL_COLORS[level];
}

export function getRiskBucket(risk: number): "low" | "medium" | "high" {
  if (risk >= 60) return "high";
  if (risk >= 30) return "medium";
  return "low";
}

function levelFor(bucket: "low" | "medium" | "high"): ActionLevel {
  return bucket === "high" ? "act" : bucket === "medium" ? "prepare" : "monitor";
}

// Order tags by their contributing-factor weight so the dominant cause leads
function dominantCauses(flight: Flight): RiskTag[] {
  const weightByTag: Partial<Record<RiskTag, number>> = {};
  for (const f of flight.factors) {
    const n = f.name.toLowerCase();
    const tag: RiskTag | null = n.includes("weather") || n.includes("wind") || n.includes("storm")
      ? "Weather"
      : n.includes("late") || n.includes("inbound") || n.includes("rotation")
      ? "Late Aircraft"
      : n.includes("crew")
      ? "Crew"
      : n.includes("ground") || n.includes("handling") || n.includes("turn") || n.includes("fuel")
      ? "Ground Handling"
      : n.includes("atc") || n.includes("slot") || n.includes("flow") || n.includes("ctot")
      ? "ATC Flow"
      : n.includes("maint") || n.includes("tech")
      ? "Maintenance"
      : null;
    if (tag) weightByTag[tag] = (weightByTag[tag] ?? 0) + f.weight;
  }
  return [...flight.tags].sort(
    (a, b) => (weightByTag[b] ?? 0) - (weightByTag[a] ?? 0),
  );
}

export function getRecommendations(flight: Flight): Recommendation[] {
  const bucket = getRiskBucket(flight.risk);
  const lv = levelFor(bucket);
  const tightTurn = flight.turnaround.remainingMin < flight.turnaround.minimumMin;
  const causes = dominantCauses(flight);
  const recs: Recommendation[] = [];

  for (const cause of causes) {
    switch (cause) {
      case "Weather": {
        const snowy = flight.weather?.deicingRequired || /snow|ice|freez|fzra|sn/i.test(flight.weather?.metar ?? "");
        const tstorm = flight.weather?.thunderstorms;
        recs.push({
          id: "wx-route",
          cause: "Weather",
          title: snowy
            ? "Book de-ice pad slot now"
            : tstorm
            ? "Request weather-avoidance reroute"
            : "Coordinate weather watch with dispatch",
          description: snowy
            ? "Pre-book de-ice bay and confirm hold-over time to protect pushback window."
            : tstorm
            ? "Work with dispatch and ATC for routing around the active cells."
            : "Monitor METAR/TAF trend and brief crew on alternates.",
          level: lv,
          icon: snowy ? Snowflake : CloudRain,
        });
        if (bucket !== "low") {
          recs.push({
            id: "wx-fuel",
            cause: "Weather",
            title: "Add contingency fuel for hold/divert",
            description: "Brief crew on alternate and uplift extra fuel for expected airborne hold.",
            level: lv,
            icon: Plane,
          });
        }
        break;
      }
      case "Late Aircraft": {
        recs.push({
          id: "la-swap",
          cause: "Late Aircraft",
          title: bucket === "high" ? "Trigger aircraft swap" : "Pre-stage standby airframe",
          description:
            bucket === "high"
              ? "Activate standby aircraft to break the cascade on this rotation."
              : "Identify a swap candidate and warm crew/handling in case inbound slips further.",
          level: lv,
          icon: ArrowRightLeft,
        });
        recs.push({
          id: "la-downstream",
          cause: "Late Aircraft",
          title: "Protect downstream legs",
          description: `Pre-notify ${flight.network.downstream.length || "next"} downstream leg(s) so crew and pax connections are protected.`,
          level: lv,
          icon: GitBranch,
        });
        break;
      }
      case "Crew": {
        recs.push({
          id: "crew-reserve",
          cause: "Crew",
          title: bucket === "high" ? "Call reserve crew now" : "Place reserve crew on alert",
          description:
            bucket === "high"
              ? "Dispatch reserve crew immediately and update duty roster before legality expires."
              : "Confirm reserve crew availability and duty window in case primary times out.",
          level: lv,
          icon: Users,
        });
        recs.push({
          id: "crew-duty",
          cause: "Crew",
          title: "Recheck duty-time legality",
          description: "Validate FDP against projected ETD and identify the latest legal push time.",
          level: lv,
          icon: Eye,
        });
        break;
      }
      case "Ground Handling": {
        recs.push({
          id: "gh-priority",
          cause: "Ground Handling",
          title: bucket === "high" ? "Prioritize ground handling" : "Stage extra ground team",
          description:
            bucket === "high"
              ? "Reassign a second handling team and pre-stage fuel + GSE at this stand now."
              : "Brief handling lead to push fueling and baggage ahead of catering.",
          level: lv,
          icon: Wrench,
        });
        if (flight.gateConflict || tightTurn) {
          recs.push({
            id: "gh-gate",
            cause: "Gate",
            title: "Move to flexible gate",
            description: "Reduce gate-conflict risk and unlock parallel handling resources.",
            level: lv,
            icon: Plane,
          });
        }
        break;
      }
      case "ATC Flow": {
        recs.push({
          id: "atc-slot",
          cause: "ATC Flow",
          title: "Negotiate earlier CTOT / reroute",
          description: "Coordinate with ATC for an earlier slot or alternate routing to cut taxi and hold.",
          level: lv,
          icon: Activity,
        });
        break;
      }
      case "Maintenance": {
        recs.push({
          id: "mx-tech",
          cause: "Maintenance",
          title: bucket === "high" ? "Dispatch line maintenance now" : "Put maintenance on standby",
          description:
            bucket === "high"
              ? "Send line maintenance to the stand and pre-order any expected parts."
              : "Alert line maintenance and verify MEL options ahead of pushback.",
          level: lv,
          icon: Wrench,
        });
        break;
      }
    }
  }

  // Turnaround pressure on its own when not already covered
  if (tightTurn && !recs.some((r) => r.cause === "Ground Handling" || r.cause === "Gate")) {
    recs.push({
      id: "turn-fast",
      cause: "Turnaround",
      title: "Compress turnaround tasks in parallel",
      description: "Run cleaning, fueling and boarding concurrently; cut catering to essentials.",
      level: lv,
      icon: Wrench,
    });
  }

  // Low risk with no specific cause: safe monitoring guidance
  if (recs.length === 0 && bucket === "low") {
    recs.push(
      {
        id: "monitor",
        cause: "General",
        title: "Continue monitoring",
        description: "All key indicators within tolerance. No intervention required.",
        level: "monitor",
        icon: Eye,
      },
      {
        id: "crew-buffer",
        cause: "General",
        title: "Check crew duty buffer",
        description: "Confirm crew duty time covers any contingency delay.",
        level: "monitor",
        icon: Users,
      },
    );
  }

  // High risk: always close with hub-wide escalation
  if (bucket === "high") {
    recs.push({
      id: "notify-network",
      cause: "General",
      title: "Notify network control",
      description: "Escalate to airline OCC with current cascade exposure for hub-wide impact.",
      level: "act",
      icon: Bell,
    });
  }

  if (recs.length === 0) {
    recs.push({
      id: "monitor-high",
      cause: "General",
      title: "Monitor closely — confirm root cause",
      description: "Risk elevated but no clear primary driver. Re-check inputs.",
      level: lv,
      icon: AlertTriangle,
    });
  }

  return recs;
}
