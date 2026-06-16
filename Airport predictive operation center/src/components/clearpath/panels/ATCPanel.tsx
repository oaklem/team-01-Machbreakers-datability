import { Radio, Timer, FileText, Clock } from "lucide-react";
import type { Flight, ATCRestrictionType } from "@/lib/clearpath-data";
import { InfoTip } from "../InfoTip";

const RESTRICTION_TIP: Record<ATCRestrictionType, string> = {
  GDP: "Ground Delay Program — air traffic control is holding flights on the ground to manage arrival capacity at the destination airport.",
  AFP: "Airspace Flow Program — flights crossing a constrained piece of airspace are metered to avoid overload.",
  "Sector Capacity": "A specific air traffic control sector has reduced capacity, often due to weather or staffing.",
  Reroute: "Air traffic control has issued an alternate route, usually to avoid weather or congestion.",
  NOTAM: "Notice to Airmen — an official advisory affecting the airport, runway, or airspace.",
};

export function ATCPanel({ flight }: { flight: Flight }) {
  const { restrictions, expectedHoldMin, expectedTaxiOutMin, notams } = flight.atc;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Metric
          icon={Clock}
          label="Expected airborne hold"
          value={`${expectedHoldMin} min`}
          tip="How long this flight is expected to circle in the air waiting for landing clearance at its destination."
          warn={expectedHoldMin > 10}
        />
        <Metric
          icon={Timer}
          label="Expected taxi-out delay"
          value={`${expectedTaxiOutMin} min`}
          tip="Extra minutes between pushback and lift-off, usually caused by departure queues."
          warn={expectedTaxiOutMin > 15}
        />
      </div>

      <div>
        <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-widest text-white/40 mb-2">
          Active flow restrictions
          <InfoTip label="Flow restrictions">
            Air traffic control measures that limit how many flights can enter an airport or sector at a given time.
          </InfoTip>
        </div>
        {restrictions.length === 0 ? (
          <div className="text-xs text-white/50 italic">No active restrictions affecting this flight.</div>
        ) : (
          <div className="space-y-2">
            {restrictions.map((r, i) => (
              <div key={i} className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
                <div className="flex items-center gap-2">
                  <Radio className="h-4 w-4 text-amber-400" />
                  <span className="text-xs font-semibold text-amber-300 uppercase tracking-wider">{r.type}</span>
                  <span className="text-sm text-white">{r.label}</span>
                  <InfoTip label={r.type}>{RESTRICTION_TIP[r.type]}</InfoTip>
                </div>
                <div className="text-xs text-white/70 mt-1 pl-6">{r.detail}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {notams.length > 0 && (
        <div>
          <div className="text-[11px] uppercase tracking-widest text-white/40 mb-2 flex items-center gap-1.5">
            <FileText className="h-3.5 w-3.5" /> NOTAMs
          </div>
          <ul className="space-y-1.5">
            {notams.map((n, i) => (
              <li key={i} className="text-xs text-white/75 rounded-md border border-white/10 bg-white/[0.03] px-3 py-2">
                {n}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
  tip,
  warn,
}: {
  icon: typeof Clock;
  label: string;
  value: string;
  tip: string;
  warn?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border p-3 ${
        warn ? "border-amber-500/30 bg-amber-500/5" : "border-white/10 bg-white/[0.03]"
      }`}
    >
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-white/40">
        <Icon className="h-3.5 w-3.5" />
        {label}
        <InfoTip label={label}>{tip}</InfoTip>
      </div>
      <div className={`text-lg font-bold mt-1 ${warn ? "text-amber-300" : "text-white"}`}>{value}</div>
    </div>
  );
}
