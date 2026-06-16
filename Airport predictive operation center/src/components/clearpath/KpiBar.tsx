import { AlertTriangle, Activity, Plane, ShieldAlert } from "lucide-react";
import { InfoTip } from "./InfoTip";

interface Props {
  highRisk: number;
  exposure: number;
  departuresNextHour: number;
  atcRestrictions: number;
}

export function KpiBar({ highRisk, exposure, departuresNextHour, atcRestrictions }: Props) {
  const tiles = [
    {
      label: "Flights at high delay severity",
      value: highRisk,
      suffix: "today",
      color: "#EF4444",
      Icon: AlertTriangle,
      tip: "Departures with a delay severity score of 0.60 or above — these are most likely to slip without action.",
    },
    {
      label: "Cascade exposure",
      value: exposure,
      suffix: "downstream legs",
      color: "#F59E0B",
      Icon: Activity,
      tip: "Number of follow-on flights (same aircraft or crew) likely to be affected if today's high-severity flights slip.",
    },
    {
      label: "Departures next hour",
      value: departuresNextHour,
      suffix: "flights",
      color: "#38BDF8",
      Icon: Plane,
      tip: "Number of flights scheduled to depart within the next 60 minutes (local airport time).",
    },
    {
      label: "Active NOTAPs",
      value: atcRestrictions,
      suffix: "programs in effect",
      color: "#38BDF8",
      Icon: ShieldAlert,
      tip: "Total number of ATC flow programs (GDP, AFP, sector limits, reroutes) affecting today's flights.",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {tiles.map((t) => (
        <div
          key={t.label}
          className="rounded-xl border border-white/10 bg-[#0F1D33] p-3.5 flex items-center gap-3"
        >
          <div
            className="h-10 w-10 rounded-lg grid place-items-center shrink-0"
            style={{ backgroundColor: `${t.color}22`, color: t.color }}
          >
            <t.Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-widest text-white/40 flex items-center gap-1">
              {t.label}
              <InfoTip label={t.label}>{t.tip}</InfoTip>
            </div>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <div className="text-2xl font-bold tabular-nums" style={{ color: t.color }}>
                {t.value}
              </div>
              {t.suffix && <div className="text-[11px] text-white/50">{t.suffix}</div>}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
