import { Users } from "lucide-react";
import type { Flight } from "@/lib/clearpath-data";
import { InfoTip } from "../InfoTip";

export function CrewPanel({ flight }: { flight: Flight }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-widest text-white/40">
        <Users className="h-3.5 w-3.5" /> Crew duty status
        <InfoTip label="Crew duty">
          Crew members can only fly for a limited number of hours per day. If their legal time runs out before landing, the flight cannot depart with that crew.
        </InfoTip>
      </div>
      {flight.crew.map((c) => {
        const warn = c.minutesRemaining < 480; // less than 8h buffer
        return (
          <div
            key={c.role}
            className={`flex items-center justify-between rounded-md border p-3 ${
              warn ? "border-amber-500/30 bg-amber-500/5" : "border-white/10 bg-white/[0.03]"
            }`}
          >
            <div>
              <div className="text-sm text-white font-medium">{c.role}</div>
              <div className="text-xs text-white/55">{c.name}</div>
            </div>
            <div className="text-right">
              <div className={`text-sm font-mono tabular-nums ${warn ? "text-amber-300" : "text-white"}`}>
                {Math.floor(c.minutesRemaining / 60)}h {c.minutesRemaining % 60}m
              </div>
              <div className="text-[10px] uppercase tracking-widest text-white/40">Legal until {c.legalUntil}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
