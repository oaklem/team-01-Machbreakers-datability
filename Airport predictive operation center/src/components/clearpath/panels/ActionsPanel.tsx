import { toast } from "sonner";
import type { Flight } from "@/lib/clearpath-data";
import { getRecommendations, levelStyles, getRiskBucket } from "@/lib/recommendations";
import { InfoTip } from "../InfoTip";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { addRegisterItem } from "@/lib/register.functions";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "@tanstack/react-router";


const BUCKET_LABEL: Record<ReturnType<typeof getRiskBucket>, string> = {
  low: "Low delay severity (0.00 – 0.29)",
  medium: "Medium delay severity (0.30 – 0.59)",
  high: "High delay severity (0.60 – 1.00)",
};

export function ActionsPanel({ flight }: { flight: Flight }) {
  const recs = getRecommendations(flight);
  const bucket = getRiskBucket(flight.risk);
  const queryClient = useQueryClient();
  const addItem = useServerFn(addRegisterItem);

  const addMut = useMutation({
    mutationFn: (vars: Parameters<typeof addItem>[0]["data"]) => addItem({ data: vars }),
    onSuccess: (_row, vars) => {
      queryClient.invalidateQueries({ queryKey: ["register-items"] });
      toast.success(`Action queued: ${vars.action_title}`, {
        description: `${flight.flightNumber} — added to the decision register.`,
        action: { label: "Open register", onClick: () => window.location.assign("/register") },
      });
    },
    onError: async (err) => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        toast.error("Sign in to queue actions", {
          description: "The decision register is shared across the team.",
          action: { label: "Sign in", onClick: () => window.location.assign("/auth") },
        });
        return;
      }
      toast.error(err instanceof Error ? err.message : "Could not queue action");
    },
  });


  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
        <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-white/40">
          Recommendation level
          <InfoTip label="Recommendation level">
            Actions are grouped by how urgent they are. Low = just monitor, Medium = prepare resources, High = act now to break the cascade.
          </InfoTip>
        </div>
        <div className="text-sm text-white font-medium mt-1">{BUCKET_LABEL[bucket]}</div>
      </div>

      <div className="grid grid-cols-1 gap-2">
        {recs.map((r) => {
          const c = levelStyles(r.level);
          return (
            <div
              key={r.id}
              className="rounded-lg border p-3 flex gap-3"
              style={{ backgroundColor: c.bg, borderColor: c.border }}
            >
              <div
                className="h-9 w-9 rounded-md grid place-items-center shrink-0"
                style={{ backgroundColor: c.border, color: c.text }}
              >
                <r.icon className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm font-semibold" style={{ color: c.text }}>
                    {r.title}
                  </div>
                  <span
                    className="text-[9px] uppercase tracking-widest px-1.5 py-0.5 rounded"
                    style={{ backgroundColor: c.border, color: c.text }}
                  >
                    {r.level}
                  </span>
                </div>
                <div className="text-xs text-white/75 mt-0.5">{r.description}</div>
                <div className="mt-2">
                  <button
                    type="button"
                    disabled={addMut.isPending}
                    onClick={async () => {
                      const { data } = await supabase.auth.getSession();
                      if (!data.session) {
                        toast.error("Sign in to queue actions", {
                          description: "The decision register is shared across the team.",
                          action: {
                            label: "Sign in",
                            onClick: () => window.location.assign("/auth"),
                          },
                        });
                        return;
                      }
                      addMut.mutate({
                        flight_id_ref: flight.id ?? flight.flightNumber,
                        flight_number: flight.flightNumber,
                        flight_origin: flight.origin,
                        flight_destination: flight.destination,
                        action_id: r.id,
                        action_title: r.title,
                        action_description: r.description,
                        action_level: r.level,
                      });
                    }}
                    className="text-[11px] px-2 py-1 rounded-md bg-white/10 hover:bg-white/15 text-white/85 disabled:opacity-50"
                  >
                    {addMut.isPending ? "Adding…" : "Take this action"}
                  </button>

                </div>

              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
