import { Plane, MapPin, Clock, Users, AlertTriangle, AlertOctagon } from "lucide-react";
import type { Flight } from "@/lib/clearpath-data";
import { InfoTip } from "../InfoTip";
import { useClosureImpact } from "@/lib/closures";

export function OverviewPanel({ flight }: { flight: Flight }) {
  const closureImpact = useClosureImpact(flight);
  const items: { label: string; value: string; tip?: string; warn?: boolean }[] = [
    { label: "Aircraft", value: `${flight.aircraftType} · ${flight.registration}` },
    { label: "Route", value: `${flight.origin} → ${flight.destination}` },
    {
      label: "STD / ETD",
      value: `${flight.std} → ${flight.etd}`,
      tip: "STD is the scheduled time of departure; ETD is the estimated time of departure based on current operational status.",
      warn: flight.estDelay > 0,
    },
    {
      label: "Gate",
      value: flight.gateConflict ? `${flight.gate} ⚠ conflict` : flight.gate,
      tip: "Assigned departure gate. A conflict means another aircraft is occupying the stand longer than expected.",
      warn: !!flight.gateConflict,
    },
    {
      label: "Turnaround left",
      value: `${flight.turnaround.remainingMin} min (min ${flight.turnaround.minimumMin})`,
      tip: "Time remaining before pushback. If it drops below the minimum, the aircraft cannot be made ready on schedule.",
      warn: flight.turnaround.remainingMin < flight.turnaround.minimumMin,
    },
    {
      label: "Crew legality",
      value: `${Math.min(...flight.crew.map((c) => c.minutesRemaining))} min remaining`,
      tip: "How much longer the crew can legally remain on duty today. Going below the flight time forces a crew swap.",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3">
      {items.map((it) => (
        <div
          key={it.label}
          className={`rounded-lg border p-3 ${
            it.warn ? "border-amber-500/30 bg-amber-500/5" : "border-white/10 bg-white/[0.03]"
          }`}
        >
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-white/40">
            {it.label}
            {it.tip && <InfoTip label={it.label}>{it.tip}</InfoTip>}
          </div>
          <div className="text-sm text-white font-medium mt-1">{it.value}</div>
        </div>
      ))}

      {flight.gateConflict && (
        <div className="col-span-2 flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-200">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold">Gate conflict:</span> {flight.gateConflict}
          </div>
        </div>
      )}

      {closureImpact.delta > 0 && (
        <div className="col-span-2 rounded-lg border border-red-500/30 bg-red-500/[0.06] p-3">
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-red-300">
            <AlertOctagon className="h-3.5 w-3.5" />
            Airfield closure · risk +{closureImpact.delta}
          </div>
          <ul className="mt-1.5 space-y-0.5 text-xs text-red-100/90">
            {closureImpact.reasons.map((r, i) => (
              <li key={i} className="flex items-start gap-1.5">
                <span className="text-red-400 mt-0.5">•</span>
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
