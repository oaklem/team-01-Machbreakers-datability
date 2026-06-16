export type RiskTag =
  | "Weather"
  | "Late Aircraft"
  | "Crew"
  | "ATC Flow"
  | "Ground Handling"
  | "Maintenance";

export type ATCRestrictionType =
  | "GDP"
  | "AFP"
  | "Sector Capacity"
  | "Reroute"
  | "NOTAM";

export interface RotationLeg {
  flight: string;
  from: string;
  to: string;
  time: string;
  risk: number; // 0-100
  downstreamDelay: number;
}

export interface TurnaroundTask {
  name: string;
  progress: number; // 0-100
  bottleneck?: boolean;
  note?: string;
}

export interface CrewMember {
  role: string;
  name: string;
  legalUntil: string;
  minutesRemaining: number;
}

export interface DownstreamLeg {
  flight: string;
  route: string;
  std: string;
  paxConnecting: number;
  crewDependency: boolean;
  impactRisk: number; // 0-100
}

export interface ATCRestriction {
  type: ATCRestrictionType;
  label: string;
  detail: string;
}

export interface ContributingFactor {
  name: string;
  weight: number; // 0-100 contribution to overall risk
  status: "ok" | "watch" | "alert";
}

export interface Flight {
  id: string;
  flightNumber: string;
  airline: string;
  airlineCode: string;
  airlineColor: string;
  origin: string;
  destination: string;
  destinationCity?: string;
  destinationCountry?: string;
  distanceKm?: number;
  delayCause?: string; // weather | late_aircraft | nas | carrier | security | none
  cancelled?: boolean;
  depHour?: number;
  dayOfWeek?: number; // 1=Mon..7=Sun (or 0=Sun depending on source)
  windGustKmh?: number;
  precipMm?: number;
  snowfallCm?: number;
  cloudCoverPct?: number;
  weatherCode?: number;
  aircraftType: string;
  registration: string;
  std: string;
  etd: string;
  gate: string;
  gateConflict?: string;
  estDelay: number;
  risk: number; // 0-100
  rootCause: string;
  tags: RiskTag[];
  factors: ContributingFactor[];

  atc: {
    restrictions: ATCRestriction[];
    expectedHoldMin: number;
    expectedTaxiOutMin: number;
    notams: string[];
  };

  weather: {
    metar: string;
    enroute: string;
    thunderstorms: boolean;
    lowVisibility: boolean;
    crosswindKt: number;
    deicingRequired: boolean;
  };

  turnaround: {
    remainingMin: number;
    minimumMin: number;
    tasks: TurnaroundTask[];
  };

  crew: CrewMember[];

  network: {
    downstream: DownstreamLeg[];
    paxConnectionsAtRisk: number;
    aircraftChain: string[];
  };

  detail: {
    aircraft: string;
    rootCauseLong: string;
    propagation: string[];
    recommendation: string;
  };

  rotation: RotationLeg[];
}

// helpers ---------------------------------------------------------------

export function riskColor(risk: number) {
  if (risk >= 60) return "#EF4444";
  if (risk >= 30) return "#F59E0B";
  return "#10B981";
}

export function riskLabel(risk: number): "HIGH" | "MED" | "LOW" {
  if (risk >= 60) return "HIGH";
  if (risk >= 30) return "MED";
  return "LOW";
}

export function riskScore01(risk: number) {
  return (risk / 100).toFixed(2);
}

// ------------------------------------------------------------------------
// Mock fleet — 8 European departures from FRA
// ------------------------------------------------------------------------

export const FLIGHTS: Flight[] = [
  {
    id: "LH445",
    flightNumber: "LH445",
    airline: "Lufthansa",
    airlineCode: "LH",
    airlineColor: "#05164D",
    origin: "FRA",
    destination: "JFK",
    aircraftType: "A350-900",
    registration: "D-AIXY",
    std: "09:15",
    etd: "09:47",
    gate: "C14",
    gateConflict: "LH112 occupying until 08:55",
    estDelay: 32,
    risk: 86,
    rootCause: "Late inbound from MUC (+42 min) — fog at origin",
    tags: ["Weather", "Late Aircraft", "Ground Handling"],
    factors: [
      { name: "Inbound aircraft delay", weight: 38, status: "alert" },
      { name: "Weather (MUC origin)", weight: 22, status: "alert" },
      { name: "Turnaround compression", weight: 14, status: "alert" },
      { name: "Gate conflict", weight: 8, status: "watch" },
      { name: "Crew legality", weight: 4, status: "watch" },
    ],
    atc: {
      restrictions: [
        { type: "GDP", label: "JFK Ground Delay Program", detail: "Average delay 25 min, scope all arrivals" },
        { type: "Sector Capacity", label: "EDGG sector capacity -20%", detail: "Convective wx in central Germany" },
      ],
      expectedHoldMin: 8,
      expectedTaxiOutMin: 22,
      notams: ["FRA RWY 18 closed 09:00–10:30 for inspection"],
    },
    weather: {
      metar: "FRA 080750Z 27014KT 6500 OVC008 04/03 Q1014",
      enroute: "Headwinds 80kt, mod turbulence FL340 over BIKNI",
      thunderstorms: false,
      lowVisibility: true,
      crosswindKt: 8,
      deicingRequired: true,
    },
    turnaround: {
      remainingMin: 27,
      minimumMin: 35,
      tasks: [
        { name: "Cleaning", progress: 100 },
        { name: "Catering", progress: 80 },
        { name: "Fueling", progress: 60, bottleneck: true, note: "Fueler delayed by parallel turn" },
        { name: "Baggage loading", progress: 40, bottleneck: true },
        { name: "Boarding", progress: 0, note: "Not started — aircraft inbound" },
        { name: "Technical checks", progress: 20 },
      ],
    },
    crew: [
      { role: "Captain", name: "M. Hoffmann", legalUntil: "18:30", minutesRemaining: 545 },
      { role: "First Officer", name: "S. Becker", legalUntil: "18:30", minutesRemaining: 545 },
      { role: "Cabin Lead", name: "J. Vogel", legalUntil: "19:10", minutesRemaining: 585 },
    ],
    network: {
      downstream: [
        { flight: "LH446", route: "JFK→FRA", std: "22:10", paxConnecting: 0, crewDependency: true, impactRisk: 58 },
        { flight: "LH7722", route: "FRA→VIE", std: "11:30", paxConnecting: 8, crewDependency: false, impactRisk: 40 },
      ],
      paxConnectionsAtRisk: 8,
      aircraftChain: ["LH112 FRA→MUC", "LH113 MUC→FRA", "LH445 FRA→JFK", "LH446 JFK→FRA"],
    },
    detail: {
      aircraft: "D-AIXY",
      rootCauseLong:
        "Inbound aircraft (D-AIXY) delayed at MUC by 42 minutes due to low visibility fog. Current ETA at FRA: 08:48. Turnaround compressed to 27 min vs 35 min minimum.",
      propagation: [
        "MUC fog delay +42 min",
        "Late arrival FRA 08:48",
        "Turnaround compressed to 27 min (min 35)",
        "Likely pushback delay 25–35 min",
      ],
      recommendation:
        "Trigger aircraft swap to standby D-AIXZ. Reassign gate to A23. Notify network control of cascade exposure.",
    },
    rotation: [
      { flight: "LH444", from: "JFK", to: "FRA", time: "22:10→11:30", risk: 30, downstreamDelay: 0 },
      { flight: "LH112", from: "FRA", to: "MUC", time: "06:00→07:10", risk: 55, downstreamDelay: 18 },
      { flight: "LH113", from: "MUC", to: "FRA", time: "07:55→08:48", risk: 80, downstreamDelay: 42 },
      { flight: "LH445", from: "FRA", to: "JFK", time: "09:15→09:47", risk: 86, downstreamDelay: 32 },
    ],
  },
  {
    id: "FR2208",
    flightNumber: "FR2208",
    airline: "Ryanair",
    airlineCode: "FR",
    airlineColor: "#073590",
    origin: "FRA",
    destination: "DUB",
    aircraftType: "B737-800",
    registration: "EI-DCL",
    std: "07:40",
    etd: "08:08",
    gate: "B22",
    estDelay: 28,
    risk: 74,
    rootCause: "Ground handling shortage at stand B22",
    tags: ["Ground Handling", "Late Aircraft"],
    factors: [
      { name: "Ground handling capacity", weight: 32, status: "alert" },
      { name: "Inbound aircraft delay", weight: 22, status: "watch" },
      { name: "Turnaround compression", weight: 14, status: "alert" },
      { name: "ATC taxi-out delay", weight: 6, status: "watch" },
    ],
    atc: {
      restrictions: [
        { type: "Sector Capacity", label: "Manchester ACC -15%", detail: "Staffing reduction 06:00–10:00" },
      ],
      expectedHoldMin: 0,
      expectedTaxiOutMin: 14,
      notams: [],
    },
    weather: {
      metar: "FRA 080720Z 27012KT CAVOK 05/01 Q1015",
      enroute: "Clear, light tailwind",
      thunderstorms: false,
      lowVisibility: false,
      crosswindKt: 4,
      deicingRequired: false,
    },
    turnaround: {
      remainingMin: 22,
      minimumMin: 25,
      tasks: [
        { name: "Cleaning", progress: 100 },
        { name: "Catering", progress: 100 },
        { name: "Fueling", progress: 55, bottleneck: true, note: "Started 18 min late" },
        { name: "Baggage loading", progress: 70 },
        { name: "Boarding", progress: 30 },
        { name: "Technical checks", progress: 80 },
      ],
    },
    crew: [
      { role: "Captain", name: "R. O'Connor", legalUntil: "16:45", minutesRemaining: 425 },
      { role: "First Officer", name: "P. Walsh", legalUntil: "16:45", minutesRemaining: 425 },
      { role: "Cabin Lead", name: "L. Murphy", legalUntil: "17:30", minutesRemaining: 470 },
    ],
    network: {
      downstream: [
        { flight: "FR2209", route: "DUB→FRA", std: "10:30", paxConnecting: 0, crewDependency: true, impactRisk: 52 },
        { flight: "FR2210", route: "FRA→STN", std: "13:00", paxConnecting: 0, crewDependency: true, impactRisk: 42 },
      ],
      paxConnectionsAtRisk: 0,
      aircraftChain: ["FR2207 DUB→FRA", "FR2208 FRA→DUB", "FR2209 DUB→FRA", "FR2210 FRA→STN"],
    },
    detail: {
      aircraft: "EI-DCL",
      rootCauseLong:
        "Aircraft arrived on schedule but ground handling team delayed by parallel turnaround at B21. Fueling started 18 min late.",
      propagation: ["Late fueling +18 min", "Boarding +10 min", "Pushback 08:08 (+28)"],
      recommendation:
        "Reassign second handling team from B30 to B22. Inform Ryanair OCC. No downstream impact if recovered by 08:15.",
    },
    rotation: [
      { flight: "FR2207", from: "DUB", to: "FRA", time: "04:55→07:10", risk: 35, downstreamDelay: 0 },
      { flight: "FR2208", from: "FRA", to: "DUB", time: "07:40→08:08", risk: 74, downstreamDelay: 28 },
      { flight: "FR2209", from: "DUB", to: "FRA", time: "10:30→10:55", risk: 50, downstreamDelay: 25 },
      { flight: "FR2210", from: "FRA", to: "STN", time: "13:00→13:18", risk: 42, downstreamDelay: 18 },
    ],
  },
  {
    id: "BA903",
    flightNumber: "BA903",
    airline: "British Airways",
    airlineCode: "BA",
    airlineColor: "#075AAA",
    origin: "FRA",
    destination: "LHR",
    aircraftType: "A320neo",
    registration: "G-EUUE",
    std: "08:25",
    etd: "08:47",
    gate: "A11",
    estDelay: 22,
    risk: 64,
    rootCause: "Cabin crew swap in progress — duty rest window tight",
    tags: ["Crew", "Late Aircraft"],
    factors: [
      { name: "Crew legality / swap", weight: 30, status: "alert" },
      { name: "Inbound aircraft delay", weight: 18, status: "watch" },
      { name: "LHR arrival flow", weight: 12, status: "watch" },
      { name: "Turnaround pressure", weight: 4, status: "ok" },
    ],
    atc: {
      restrictions: [
        { type: "AFP", label: "LHR arrival flow program", detail: "Crosswinds — single-runway ops" },
      ],
      expectedHoldMin: 12,
      expectedTaxiOutMin: 16,
      notams: ["LHR RWY 09L closed until 12:00 — single-runway ops"],
    },
    weather: {
      metar: "FRA 080820Z 26011KT CAVOK 06/02 Q1015",
      enroute: "LHR 22kt 090°, gusting 28kt — crosswind",
      thunderstorms: false,
      lowVisibility: false,
      crosswindKt: 22,
      deicingRequired: false,
    },
    turnaround: {
      remainingMin: 30,
      minimumMin: 30,
      tasks: [
        { name: "Cleaning", progress: 100 },
        { name: "Catering", progress: 100 },
        { name: "Fueling", progress: 90 },
        { name: "Baggage loading", progress: 85 },
        { name: "Boarding", progress: 0, bottleneck: true, note: "Awaiting reserve cabin crew" },
        { name: "Technical checks", progress: 100 },
      ],
    },
    crew: [
      { role: "Captain", name: "H. Patel", legalUntil: "17:00", minutesRemaining: 470 },
      { role: "First Officer", name: "T. Davies", legalUntil: "17:00", minutesRemaining: 470 },
      { role: "Cabin Lead", name: "(Reserve incoming)", legalUntil: "17:30", minutesRemaining: 500 },
    ],
    network: {
      downstream: [
        { flight: "BA904", route: "LHR→FRA", std: "11:20", paxConnecting: 4, crewDependency: true, impactRisk: 45 },
      ],
      paxConnectionsAtRisk: 4,
      aircraftChain: ["BA902 LHR→FRA", "BA903 FRA→LHR", "BA904 LHR→FRA"],
    },
    detail: {
      aircraft: "G-EUUE",
      rootCauseLong:
        "Cabin crew member exceeded duty hours overnight; reserve crew dispatched 07:50, ETA on stand 08:20.",
      propagation: ["Crew swap +15 min", "Late boarding 08:35", "Push +22 min"],
      recommendation:
        "Confirm crew arrival by 08:20. Hold ATC slot. Prepare G-EUYJ as fallback if crew slips beyond 08:30.",
    },
    rotation: [
      { flight: "BA902", from: "LHR", to: "FRA", time: "05:55→07:30", risk: 25, downstreamDelay: 0 },
      { flight: "BA903", from: "FRA", to: "LHR", time: "08:25→08:47", risk: 64, downstreamDelay: 22 },
      { flight: "BA904", from: "LHR", to: "FRA", time: "11:20→11:35", risk: 40, downstreamDelay: 15 },
    ],
  },
  {
    id: "AF1119",
    flightNumber: "AF1119",
    airline: "Air France",
    airlineCode: "AF",
    airlineColor: "#002157",
    origin: "FRA",
    destination: "CDG",
    aircraftType: "A220-300",
    registration: "F-GRHQ",
    std: "10:05",
    etd: "10:23",
    gate: "D08",
    estDelay: 18,
    risk: 58,
    rootCause: "CDG arrival flow regulation — thunderstorms in Paris TMA",
    tags: ["Weather", "ATC Flow"],
    factors: [
      { name: "ATC flow regulation (CDG)", weight: 28, status: "alert" },
      { name: "Convective weather destination", weight: 22, status: "alert" },
      { name: "Downstream rotation", weight: 6, status: "watch" },
      { name: "Turnaround", weight: 2, status: "ok" },
    ],
    atc: {
      restrictions: [
        { type: "GDP", label: "CDG Ground Delay Program", detail: "Arrival rate 32/hr (normal 48). CTOT 10:23." },
        { type: "Reroute", label: "Reroute via OKRIX", detail: "+12 NM, +3 min flight time" },
      ],
      expectedHoldMin: 10,
      expectedTaxiOutMin: 12,
      notams: ["CDG TWY S closed for works"],
    },
    weather: {
      metar: "FRA 080950Z 24008KT CAVOK 08/03 Q1014",
      enroute: "TS in CDG TMA, mod–severe between FL200–FL280",
      thunderstorms: true,
      lowVisibility: false,
      crosswindKt: 6,
      deicingRequired: false,
    },
    turnaround: {
      remainingMin: 35,
      minimumMin: 30,
      tasks: [
        { name: "Cleaning", progress: 100 },
        { name: "Catering", progress: 95 },
        { name: "Fueling", progress: 80 },
        { name: "Baggage loading", progress: 70 },
        { name: "Boarding", progress: 0 },
        { name: "Technical checks", progress: 100 },
      ],
    },
    crew: [
      { role: "Captain", name: "C. Laurent", legalUntil: "19:00", minutesRemaining: 535 },
      { role: "First Officer", name: "M. Garnier", legalUntil: "19:00", minutesRemaining: 535 },
      { role: "Cabin Lead", name: "E. Roux", legalUntil: "19:45", minutesRemaining: 580 },
    ],
    network: {
      downstream: [
        { flight: "AF1120", route: "CDG→FRA", std: "12:40", paxConnecting: 0, crewDependency: true, impactRisk: 38 },
      ],
      paxConnectionsAtRisk: 0,
      aircraftChain: ["AF1118 CDG→FRA", "AF1119 FRA→CDG", "AF1120 CDG→FRA"],
    },
    detail: {
      aircraft: "F-GRHQ",
      rootCauseLong:
        "Eurocontrol flow regulation on CDG arrivals due to thunderstorms in Paris TMA. CTOT issued for 10:23.",
      propagation: ["CTOT 10:23 (+18)", "AF1120 knock-on ~12 min"],
      recommendation:
        "Accept CTOT, board on time and hold at A1 if cleared early. Monitor CDG TAF.",
    },
    rotation: [
      { flight: "AF1118", from: "CDG", to: "FRA", time: "07:20→08:55", risk: 30, downstreamDelay: 0 },
      { flight: "AF1119", from: "FRA", to: "CDG", time: "10:05→10:23", risk: 58, downstreamDelay: 18 },
      { flight: "AF1120", from: "CDG", to: "FRA", time: "12:40→12:52", risk: 45, downstreamDelay: 12 },
    ],
  },
  {
    id: "LH712",
    flightNumber: "LH712",
    airline: "Lufthansa",
    airlineCode: "LH",
    airlineColor: "#05164D",
    origin: "FRA",
    destination: "FCO",
    aircraftType: "A321neo",
    registration: "D-AIBL",
    std: "11:30",
    etd: "11:44",
    gate: "A23",
    estDelay: 14,
    risk: 52,
    rootCause: "Inbound from ZRH expected -10 min, tight turnaround",
    tags: ["Late Aircraft"],
    factors: [
      { name: "Inbound aircraft delay", weight: 28, status: "watch" },
      { name: "Turnaround compression", weight: 14, status: "watch" },
      { name: "Crew", weight: 6, status: "ok" },
      { name: "Weather", weight: 4, status: "ok" },
    ],
    atc: {
      restrictions: [],
      expectedHoldMin: 0,
      expectedTaxiOutMin: 10,
      notams: [],
    },
    weather: {
      metar: "FRA 081050Z 25010KT CAVOK 10/04 Q1014",
      enroute: "Clear, light tailwind into FCO",
      thunderstorms: false,
      lowVisibility: false,
      crosswindKt: 5,
      deicingRequired: false,
    },
    turnaround: {
      remainingMin: 32,
      minimumMin: 35,
      tasks: [
        { name: "Cleaning", progress: 80 },
        { name: "Catering", progress: 70 },
        { name: "Fueling", progress: 60 },
        { name: "Baggage loading", progress: 50 },
        { name: "Boarding", progress: 0 },
        { name: "Technical checks", progress: 100 },
      ],
    },
    crew: [
      { role: "Captain", name: "K. Weiss", legalUntil: "19:30", minutesRemaining: 575 },
      { role: "First Officer", name: "L. Schäfer", legalUntil: "19:30", minutesRemaining: 575 },
      { role: "Cabin Lead", name: "A. Berger", legalUntil: "20:10", minutesRemaining: 615 },
    ],
    network: {
      downstream: [
        { flight: "LH713", route: "FCO→FRA", std: "14:25", paxConnecting: 6, crewDependency: true, impactRisk: 35 },
      ],
      paxConnectionsAtRisk: 6,
      aircraftChain: ["LH1191 ZRH→FRA", "LH712 FRA→FCO", "LH713 FCO→FRA"],
    },
    detail: {
      aircraft: "D-AIBL",
      rootCauseLong:
        "Inbound LH1191 from ZRH delayed 10 min. Turnaround compressed to 32 min vs 35 standard.",
      propagation: ["Inbound -10 min", "Turn 32 min", "Push +14 min"],
      recommendation: "Push fueling ahead of catering. Brief crew on expedited turn. Likely recoverable within 10 min.",
    },
    rotation: [
      { flight: "LH1190", from: "FRA", to: "ZRH", time: "08:15→08:20", risk: 35, downstreamDelay: 5 },
      { flight: "LH1191", from: "ZRH", to: "FRA", time: "09:45→10:58", risk: 48, downstreamDelay: 10 },
      { flight: "LH712", from: "FRA", to: "FCO", time: "11:30→11:44", risk: 52, downstreamDelay: 14 },
      { flight: "LH713", from: "FCO", to: "FRA", time: "14:25→14:36", risk: 40, downstreamDelay: 11 },
    ],
  },
  {
    id: "BA905",
    flightNumber: "BA905",
    airline: "British Airways",
    airlineCode: "BA",
    airlineColor: "#075AAA",
    origin: "FRA",
    destination: "LHR",
    aircraftType: "A320",
    registration: "G-EUYP",
    std: "12:50",
    etd: "13:00",
    gate: "A14",
    estDelay: 10,
    risk: 46,
    rootCause: "De-icing queue forecast — light freezing precipitation",
    tags: ["Weather", "Ground Handling"],
    factors: [
      { name: "De-icing queue", weight: 24, status: "watch" },
      { name: "Weather origin", weight: 12, status: "watch" },
      { name: "Turnaround", weight: 6, status: "ok" },
      { name: "Crew", weight: 4, status: "ok" },
    ],
    atc: {
      restrictions: [],
      expectedHoldMin: 0,
      expectedTaxiOutMin: 18,
      notams: [],
    },
    weather: {
      metar: "FRA 081220Z 28009KT 8000 -FZRA SCT012 OVC020 M01/M02 Q1013",
      enroute: "Clear into LHR",
      thunderstorms: false,
      lowVisibility: false,
      crosswindKt: 7,
      deicingRequired: true,
    },
    turnaround: {
      remainingMin: 40,
      minimumMin: 30,
      tasks: [
        { name: "Cleaning", progress: 100 },
        { name: "Catering", progress: 100 },
        { name: "Fueling", progress: 100 },
        { name: "Baggage loading", progress: 100 },
        { name: "Boarding", progress: 60 },
        { name: "De-icing", progress: 0, note: "Pad 2 of 3 active — queue 3 aircraft" },
      ],
    },
    crew: [
      { role: "Captain", name: "J. Reid", legalUntil: "20:00", minutesRemaining: 600 },
      { role: "First Officer", name: "F. Clarke", legalUntil: "20:00", minutesRemaining: 600 },
      { role: "Cabin Lead", name: "S. Khan", legalUntil: "20:45", minutesRemaining: 645 },
    ],
    network: {
      downstream: [],
      paxConnectionsAtRisk: 0,
      aircraftChain: ["BA904 LHR→FRA", "BA905 FRA→LHR"],
    },
    detail: {
      aircraft: "G-EUYP",
      rootCauseLong: "Light freezing rain forecast 12:20–13:00. De-ice pad queue expected 3 aircraft.",
      propagation: ["De-ice queue +10 min", "Push 13:00"],
      recommendation: "Pre-book de-ice slot 12:40. Reassess if precipitation increases.",
    },
    rotation: [
      { flight: "BA904", from: "LHR", to: "FRA", time: "11:20→11:35", risk: 40, downstreamDelay: 15 },
      { flight: "BA905", from: "FRA", to: "LHR", time: "12:50→13:00", risk: 46, downstreamDelay: 10 },
    ],
  },
  {
    id: "AF1422",
    flightNumber: "AF1422",
    airline: "Air France",
    airlineCode: "AF",
    airlineColor: "#002157",
    origin: "FRA",
    destination: "NCE",
    aircraftType: "A319",
    registration: "F-HEPI",
    std: "06:35",
    etd: "06:39",
    gate: "D02",
    estDelay: 4,
    risk: 28,
    rootCause: "Nominal — minor cargo loading variance",
    tags: [],
    factors: [
      { name: "Cargo re-weight", weight: 16, status: "watch" },
      { name: "Weather", weight: 6, status: "ok" },
      { name: "Crew", weight: 4, status: "ok" },
      { name: "ATC", weight: 2, status: "ok" },
    ],
    atc: {
      restrictions: [],
      expectedHoldMin: 0,
      expectedTaxiOutMin: 8,
      notams: [],
    },
    weather: {
      metar: "FRA 080620Z 25008KT CAVOK 03/01 Q1015",
      enroute: "Clear",
      thunderstorms: false,
      lowVisibility: false,
      crosswindKt: 3,
      deicingRequired: false,
    },
    turnaround: {
      remainingMin: 18,
      minimumMin: 25,
      tasks: [
        { name: "Cleaning", progress: 100 },
        { name: "Catering", progress: 100 },
        { name: "Fueling", progress: 100 },
        { name: "Baggage loading", progress: 90, note: "Cargo re-weight in progress" },
        { name: "Boarding", progress: 80 },
        { name: "Technical checks", progress: 100 },
      ],
    },
    crew: [
      { role: "Captain", name: "P. Moreau", legalUntil: "14:15", minutesRemaining: 465 },
      { role: "First Officer", name: "N. Dubois", legalUntil: "14:15", minutesRemaining: 465 },
      { role: "Cabin Lead", name: "I. Petit", legalUntil: "15:00", minutesRemaining: 510 },
    ],
    network: {
      downstream: [
        { flight: "AF1423", route: "NCE→FRA", std: "09:10", paxConnecting: 0, crewDependency: true, impactRisk: 20 },
      ],
      paxConnectionsAtRisk: 0,
      aircraftChain: ["AF1422 FRA→NCE", "AF1423 NCE→FRA"],
    },
    detail: {
      aircraft: "F-HEPI",
      rootCauseLong: "Cargo manifest revised at 06:10, requiring quick re-weight. No material delay expected.",
      propagation: ["Cargo re-weight +4 min", "Push 06:39"],
      recommendation: "No action required. Monitor.",
    },
    rotation: [
      { flight: "AF1422", from: "FRA", to: "NCE", time: "06:35→06:39", risk: 28, downstreamDelay: 4 },
      { flight: "AF1423", from: "NCE", to: "FRA", time: "09:10→09:12", risk: 22, downstreamDelay: 2 },
    ],
  },
  {
    id: "FR4501",
    flightNumber: "FR4501",
    airline: "Ryanair",
    airlineCode: "FR",
    airlineColor: "#073590",
    origin: "FRA",
    destination: "BCN",
    aircraftType: "B737-MAX8",
    registration: "EI-EBA",
    std: "13:55",
    etd: "13:55",
    gate: "B30",
    estDelay: 0,
    risk: 18,
    rootCause: "On track — all systems nominal",
    tags: [],
    factors: [
      { name: "Weather", weight: 4, status: "ok" },
      { name: "ATC", weight: 4, status: "ok" },
      { name: "Crew", weight: 4, status: "ok" },
      { name: "Turnaround", weight: 6, status: "ok" },
    ],
    atc: {
      restrictions: [],
      expectedHoldMin: 0,
      expectedTaxiOutMin: 10,
      notams: [],
    },
    weather: {
      metar: "FRA 081320Z 25010KT CAVOK 11/04 Q1014",
      enroute: "Clear, smooth ride",
      thunderstorms: false,
      lowVisibility: false,
      crosswindKt: 4,
      deicingRequired: false,
    },
    turnaround: {
      remainingMin: 60,
      minimumMin: 25,
      tasks: [
        { name: "Cleaning", progress: 100 },
        { name: "Catering", progress: 100 },
        { name: "Fueling", progress: 100 },
        { name: "Baggage loading", progress: 100 },
        { name: "Boarding", progress: 0 },
        { name: "Technical checks", progress: 100 },
      ],
    },
    crew: [
      { role: "Captain", name: "G. Rossi", legalUntil: "22:00", minutesRemaining: 485 },
      { role: "First Officer", name: "M. Ferrari", legalUntil: "22:00", minutesRemaining: 485 },
      { role: "Cabin Lead", name: "S. Bianchi", legalUntil: "22:45", minutesRemaining: 530 },
    ],
    network: {
      downstream: [],
      paxConnectionsAtRisk: 0,
      aircraftChain: ["FR4500 BCN→FRA", "FR4501 FRA→BCN"],
    },
    detail: {
      aircraft: "EI-EBA",
      rootCauseLong: "Aircraft and crew on schedule, no constraints identified.",
      propagation: ["On time"],
      recommendation: "No action.",
    },
    rotation: [
      { flight: "FR4500", from: "BCN", to: "FRA", time: "10:40→10:40", risk: 18, downstreamDelay: 0 },
      { flight: "FR4501", from: "FRA", to: "BCN", time: "13:55→13:55", risk: 18, downstreamDelay: 0 },
    ],
  },
];

export const AIRLINES = Array.from(new Set(FLIGHTS.map((f) => f.airline)));
export const ATC_TYPES: ATCRestrictionType[] = ["GDP", "AFP", "Sector Capacity", "Reroute", "NOTAM"];
