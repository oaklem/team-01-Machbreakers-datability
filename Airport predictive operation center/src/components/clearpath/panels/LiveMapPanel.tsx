import { useState, useEffect } from "react";
import { ExternalLink, Radio, Wifi, WifiOff } from "lucide-react";
import type { Flight } from "@/lib/clearpath-data";

// Coordinates for key airports to center the regional view when plane is offline
const AIRPORT_COORDS: Record<string, { lat: number; lon: number; zoom: number }> = {
  FRA: { lat: 50.0379, lon: 8.5622, zoom: 10 },
  JFK: { lat: 40.6413, lon: -73.7781, zoom: 9 },
  DUB: { lat: 53.4264, lon: -6.2687, zoom: 10 },
  LHR: { lat: 51.4700, lon: -0.4543, zoom: 10 },
  CDG: { lat: 49.0097, lon: 2.5479, zoom: 10 },
  FCO: { lat: 41.8003, lon: 12.2389, zoom: 10 },
  ZRH: { lat: 47.4582, lon: 8.5555, zoom: 11 },
  MUC: { lat: 48.3538, lon: 11.7861, zoom: 10 },
};

/**
 * Embedded live aircraft tracking map. Uses globe.adsbexchange.com (iframe-friendly)
 * If the flight's aircraft tail number (registration) is active/online, tracks that specific plane.
 * Otherwise, displays currently online aircraft in the origin region.
 */
export function LiveMapPanel({ flight }: { flight: Flight }) {
  const callsign = flight.flightNumber.replace(/\s+/g, "").toUpperCase();
  const registration = flight.registration;

  // Let's realistically mock active status:
  // LH445 is an active inbound, let's default it to active.
  // We can let the user toggle active status to test both flows beautifully.
  const [isActive, setIsActive] = useState<boolean>(() => {
    // LH445 is currently inbound, let's treat it as active by default
    return flight.id === "LH445" || flight.id === "AF1119";
  });

  // Get coords for centering general map
  const originCoords = AIRPORT_COORDS[flight.origin] || { lat: 50.0379, lon: 8.5622, zoom: 8 };

  // Build appropriate tracking URLs
  // Track specific plane via registration/tail number if active
  const trackUrl = `https://globe.adsbexchange.com/?registration=${encodeURIComponent(registration)}&zoom=7`;
  // Show currently online general traffic around origin airport if offline
  const generalUrl = `https://globe.adsbexchange.com/?lat=${originCoords.lat}&lon=${originCoords.lon}&zoom=${originCoords.zoom}`;

  const currentMapUrl = isActive ? trackUrl : generalUrl;
  const openSkyUrl = `https://opensky-network.org/network/explorer?reg=${encodeURIComponent(registration)}`;

  return (
    <div className="space-y-4">
      {/* Active Status Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border border-white/10 bg-white/[0.02]">
        <div className="flex items-center gap-3">
          <div className="relative">
            {isActive ? (
              <>
                <span className="absolute inline-flex h-3 w-3 animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500"></span>
              </>
            ) : (
              <span className="relative inline-flex h-3 w-3 rounded-full bg-zinc-500"></span>
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-white">
                Transponder Beacon
              </span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-medium ${
                isActive ? "bg-emerald-500/20 text-emerald-400" : "bg-zinc-500/20 text-zinc-400"
              }`}>
                {isActive ? "ACTIVE & BROADCASTING" : "STANDBY / OFFLINE"}
              </span>
            </div>
            <p className="text-xs text-white/50 mt-0.5">
              {isActive 
                ? `Tracking tail number ${registration} (${callsign}) live` 
                : `Tail number ${registration} is on stand. Showing active regional traffic near ${flight.origin}.`
              }
            </p>
          </div>
        </div>

        {/* Toggle switch to test different states */}
        <button
          onClick={() => setIsActive(!isActive)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
            isActive 
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20" 
              : "border-white/10 bg-white/5 text-white/70 hover:bg-white/10"
          }`}
        >
          {isActive ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
          <span>Simulate {isActive ? "Offline (Standby)" : "Active (Airborne)"}</span>
        </button>
      </div>

      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 text-xs text-white/70">
          <Radio className={`h-3.5 w-3.5 ${isActive ? "text-emerald-400 animate-pulse" : "text-sky-400"}`} />
          {isActive ? (
            <span>
              Live ADS-B tracking for tail <span className="font-mono text-emerald-400 font-bold">{registration}</span>
            </span>
          ) : (
            <span>
              Currently online aircraft near <span className="font-mono text-sky-300 font-bold">{flight.origin} Airport</span>
            </span>
          )}
        </div>
        <a
          href={openSkyUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-sky-300 hover:text-sky-200"
        >
          Open in OpenSky <ExternalLink className="h-3 w-3" />
        </a>
      </div>

      <div className="rounded-xl border border-white/10 overflow-hidden bg-black/40">
        <iframe
          key={currentMapUrl}
          src={currentMapUrl}
          title={isActive ? `Live map for ${registration}` : `Currently online traffic near ${flight.origin}`}
          className="w-full h-[460px] block"
          loading="lazy"
          referrerPolicy="no-referrer"
        />
      </div>

      <p className="text-[11px] text-white/40 leading-relaxed">
        Map data via ADS-B Exchange / OpenSky Network. If the aircraft is active, we track its specific transponder signal.
        Otherwise, the radar view displays other live flights currently online around {flight.origin} airport.
      </p>
    </div>
  );
}
