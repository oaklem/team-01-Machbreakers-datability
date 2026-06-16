import { useMemo } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Flight } from "@/lib/clearpath-data";
import { AlertOctagon, CheckCircle2, AlertTriangle, X } from "lucide-react";
import { toast } from "sonner";
import { useClosureImpact } from "@/lib/closures";
import { RiskMeter } from "./panels/RiskMeter";
import { OverviewPanel } from "./panels/OverviewPanel";
import { ATCPanel } from "./panels/ATCPanel";
import { WeatherPanel } from "./panels/WeatherPanel";
import { TurnaroundPanel } from "./panels/TurnaroundPanel";
import { CrewPanel } from "./panels/CrewPanel";
import { NetworkPanel } from "./panels/NetworkPanel";
import { ActionsPanel } from "./panels/ActionsPanel";
import { LiveMapPanel } from "./panels/LiveMapPanel";
import { TaxiPathPanel } from "./panels/TaxiPathPanel";

export function DetailDrawer({
  flight,
  open,
  onOpenChange,
}: {
  flight: Flight | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!flight) return null;
  return <DrawerBody flight={flight} open={open} onOpenChange={onOpenChange} />;
}

function DrawerBody({
  flight,
  open,
  onOpenChange,
}: {
  flight: Flight;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const closureImpact = useClosureImpact(flight);
  const adjustedFlight = useMemo(
    () => ({ ...flight, risk: Math.min(100, flight.risk + closureImpact.delta) }),
    [flight, closureImpact.delta],
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-[720px] bg-[#0B1628] border-l border-white/10 text-white overflow-y-auto p-0"
      >
        <div className="p-6 pb-2">
          <SheetHeader>
            <SheetTitle className="text-white">
              <div className="flex items-center gap-3">
                <div
                  className="h-10 w-10 rounded-full grid place-items-center text-white text-xs font-bold"
                  style={{ backgroundColor: flight.airlineColor }}
                >
                  {flight.airlineCode}
                </div>
                <div className="flex-1">
                  <div className="text-lg font-bold">
                    {flight.flightNumber} · {flight.origin} → {flight.destination}
                  </div>
                  <div className="text-xs font-normal text-white/50 mt-0.5">
                    STD {flight.std} → ETD {flight.etd} · {flight.aircraftType} ({flight.registration})
                  </div>
                </div>
              </div>
            </SheetTitle>
          </SheetHeader>
        </div>

        <div className="px-6 pb-4">
          <RiskMeter flight={adjustedFlight} />
        </div>

        <div className="px-6">
          <div className="flex gap-3 rounded-lg border border-red-500/20 bg-red-500/5 p-3 mb-4">
            <AlertOctagon className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
            <p className="text-xs text-white/85 leading-relaxed">
              <span className="font-semibold text-white">Why severity is elevated: </span>
              {flight.detail.rootCauseLong}
              {closureImpact.delta > 0 && (
                <>
                  {" "}
                  <span className="text-red-300">
                    Live NOTAM impact (+{closureImpact.delta}): {closureImpact.reasons.join("; ")}.
                  </span>
                </>
              )}
            </p>
          </div>
        </div>


        <div className="px-6 pb-4">
          <Tabs defaultValue="overview">
            <TabsList className="bg-white/[0.04] border border-white/10 w-full grid grid-cols-3 sm:grid-cols-9 h-auto">
              <TabsTrigger value="overview" className="text-xs data-[state=active]:bg-sky-500/20 data-[state=active]:text-sky-200">Overview</TabsTrigger>
              <TabsTrigger value="map" className="text-xs data-[state=active]:bg-sky-500/20 data-[state=active]:text-sky-200">Live Map</TabsTrigger>
              <TabsTrigger value="taxi" className="text-xs data-[state=active]:bg-sky-500/20 data-[state=active]:text-sky-200">Taxi Path</TabsTrigger>
              <TabsTrigger value="atc" className="text-xs data-[state=active]:bg-sky-500/20 data-[state=active]:text-sky-200">ATC Flow</TabsTrigger>
              <TabsTrigger value="weather" className="text-xs data-[state=active]:bg-sky-500/20 data-[state=active]:text-sky-200">Weather</TabsTrigger>
              <TabsTrigger value="turnaround" className="text-xs data-[state=active]:bg-sky-500/20 data-[state=active]:text-sky-200">Turnaround</TabsTrigger>
              <TabsTrigger value="crew" className="text-xs data-[state=active]:bg-sky-500/20 data-[state=active]:text-sky-200">Crew</TabsTrigger>
              <TabsTrigger value="network" className="text-xs data-[state=active]:bg-sky-500/20 data-[state=active]:text-sky-200">Network</TabsTrigger>
              <TabsTrigger value="actions" className="text-xs data-[state=active]:bg-sky-500/20 data-[state=active]:text-sky-200">Actions</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-4"><OverviewPanel flight={flight} /></TabsContent>
            <TabsContent value="map" className="mt-4"><LiveMapPanel flight={flight} /></TabsContent>
            <TabsContent value="taxi" className="mt-4"><TaxiPathPanel flight={flight} /></TabsContent>
            <TabsContent value="atc" className="mt-4"><ATCPanel flight={flight} /></TabsContent>
            <TabsContent value="weather" className="mt-4"><WeatherPanel flight={flight} /></TabsContent>
            <TabsContent value="turnaround" className="mt-4"><TurnaroundPanel flight={flight} /></TabsContent>
            <TabsContent value="crew" className="mt-4"><CrewPanel flight={flight} /></TabsContent>
            <TabsContent value="network" className="mt-4"><NetworkPanel flight={flight} /></TabsContent>
            <TabsContent value="actions" className="mt-4"><ActionsPanel flight={flight} /></TabsContent>
          </Tabs>
        </div>

        <div className="px-6 pb-6 pt-2 sticky bottom-0 bg-gradient-to-t from-[#0B1628] via-[#0B1628] to-transparent">
          <div className="flex flex-wrap gap-2 pt-3">
            <Button
              onClick={() => {
                toast.success(`${flight.flightNumber} acknowledged`, {
                  description: "Logged to APOC decision register.",
                });
                onOpenChange(false);
              }}
              className="bg-emerald-500 hover:bg-emerald-400 text-emerald-950"
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Acknowledge
            </Button>
            <Button
              onClick={() =>
                toast.warning(`Escalated ${flight.flightNumber} to airline OCC`, {
                  description: "Notification sent to operations control.",
                })
              }
              className="bg-amber-500 hover:bg-amber-400 text-amber-950"
            >
              <AlertTriangle className="h-4 w-4 mr-2" />
              Escalate to Airline OCC
            </Button>
            <Button
              onClick={() => {
                toast(`${flight.flightNumber} dismissed`);
                onOpenChange(false);
              }}
              variant="outline"
              className="border-white/15 bg-transparent text-white hover:bg-white/5 hover:text-white"
            >
              <X className="h-4 w-4 mr-2" />
              Dismiss
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
