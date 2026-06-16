import { useEffect, useState } from "react";
import { AlertOctagon, Radio } from "lucide-react";
import { formatRemaining, useClosures, type Closure } from "@/lib/closures";

function SeverityDot({ severity }: { severity: Closure["severity"] }) {
  const cls = severity === "full" ? "bg-red-400" : "bg-amber-300";
  return (
    <span className="relative inline-flex h-2 w-2">
      <span className={`absolute inset-0 rounded-full ${cls} opacity-60 animate-ping`} />
      <span className={`relative inline-flex h-2 w-2 rounded-full ${cls}`} />
    </span>
  );
}

export function LiveNotamsStrip() {
  const closures = useClosures();
  // local 1s tick so countdowns update smoothly between store ticks
  const [, setT] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setT((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);

  if (!closures.length) {
    return (
      <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 flex items-center gap-2 text-[11px] text-emerald-200/80">
        <Radio className="h-3.5 w-3.5" />
        Airfield clear — no active NOTAM closures.
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-red-500/20 bg-red-500/[0.06] p-2">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-red-300/80 px-1 pb-1">
        <AlertOctagon className="h-3 w-3" />
        Live NOTAMs · {closures.length} active
      </div>
      <ul className="space-y-1">
        {closures.map((c) => (
          <li
            key={c.id}
            className="flex items-center gap-2 rounded-md bg-black/20 border border-red-500/15 px-2 py-1.5"
          >
            <SeverityDot severity={c.severity} />
            <span className="font-mono text-[11px] text-white">{c.label}</span>
            <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded border border-white/10 text-white/55">
              {c.kind === "runway" ? "Runway" : "Taxiway"}
            </span>
            <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded border border-red-400/30 text-red-300/90">
              {c.severity === "full" ? "Closed" : "Restricted"}
            </span>
            <span className="text-[11px] text-white/65 truncate">{c.reason}</span>
            <span className="ml-auto font-mono text-[11px] tabular-nums text-red-200">
              {formatRemaining(c.endsAt)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
