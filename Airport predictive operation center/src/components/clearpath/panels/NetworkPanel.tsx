import { GitBranch, Users, Plane } from "lucide-react";
import type { Flight } from "@/lib/clearpath-data";
import { riskColor, riskLabel } from "@/lib/clearpath-data";
import { InfoTip } from "../InfoTip";

export function NetworkPanel({ flight }: { flight: Flight }) {
  const { downstream, paxConnectionsAtRisk, aircraftChain } = flight.network;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-white/40">
            <Users className="h-3.5 w-3.5" />
            Connecting passengers
            <InfoTip label="Connecting passengers">
              Passengers whose onward flight depends on this one arriving on time. If they miss the connection, the airline must re-book them.
            </InfoTip>
          </div>
          <div className="text-2xl font-bold text-white mt-1 tabular-nums">{paxConnectionsAtRisk}</div>
          <div className="text-xs text-white/50">at risk of missing connection</div>
        </div>
        <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-white/40">
            <GitBranch className="h-3.5 w-3.5" />
            Downstream legs
            <InfoTip label="Downstream legs">
              The next flights this same aircraft (and sometimes crew) is scheduled to operate today. A delay here can ripple through all of them.
            </InfoTip>
          </div>
          <div className="text-2xl font-bold text-white mt-1 tabular-nums">{downstream.length}</div>
          <div className="text-xs text-white/50">linked rotations</div>
        </div>
      </div>

      <div>
        <div className="text-[11px] uppercase tracking-widest text-white/40 mb-2">Aircraft rotation chain</div>
        <div className="flex flex-wrap gap-1.5">
          {aircraftChain.map((leg, i) => (
            <span
              key={i}
              className={`text-[11px] px-2 py-1 rounded-md border ${
                leg.startsWith(flight.flightNumber)
                  ? "border-sky-400/50 bg-sky-400/10 text-sky-200"
                  : "border-white/10 bg-white/[0.03] text-white/70"
              }`}
            >
              {leg}
            </span>
          ))}
        </div>
      </div>

      {downstream.length > 0 && (
        <div className="space-y-2">
          <div className="text-[11px] uppercase tracking-widest text-white/40">Impact on downstream legs</div>
          {downstream.map((d) => {
            const color = riskColor(d.impactRisk);
            return (
              <div key={d.flight} className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
                <div className="flex items-center gap-3">
                  <Plane className="h-4 w-4 text-white/40" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-white font-semibold">{d.flight}</span>
                      <span className="text-xs text-white/55">{d.route}</span>
                      <span className="text-[10px] text-white/40 font-mono">STD {d.std}</span>
                    </div>
                    <div className="text-[11px] text-white/55 mt-0.5">
                      {d.paxConnecting} connecting pax · {d.crewDependency ? "Same crew pairing" : "Separate crew"}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold tabular-nums" style={{ color }}>
                      {(d.impactRisk / 100).toFixed(2)}
                    </div>
                    <div className="text-[9px] uppercase tracking-widest" style={{ color }}>
                      {riskLabel(d.impactRisk)}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
