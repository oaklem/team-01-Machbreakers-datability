import { useEffect, useState } from "react";

export function ZuluClock() {
  const [mounted, setMounted] = useState(false);
  const [now, setNow] = useState(() => new Date());
  
  useEffect(() => {
    setMounted(true);
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const hh = mounted ? String(now.getUTCHours()).padStart(2, "0") : "00";
  const mm = mounted ? String(now.getUTCMinutes()).padStart(2, "0") : "00";
  const ss = mounted ? String(now.getUTCSeconds()).padStart(2, "0") : "00";

  return (
    <div className="flex items-center gap-2 rounded-md border border-white/10 bg-white/[0.03] px-3 py-1.5">
      <span className="text-[10px] uppercase tracking-widest text-white/40">Zulu</span>
      <span className="font-mono text-sm tabular-nums text-white">
        {hh}:{mm}:{ss}Z
      </span>
    </div>
  );
}
