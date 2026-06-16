import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import {
  listRegisterItems,
  updateRegisterItem,
  deleteRegisterItem,
  type RegisterItem,
} from "@/lib/register.functions";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle2, RotateCcw, Trash2, ClipboardList, LogOut } from "lucide-react";

export const Route = createFileRoute("/_authenticated/register")({
  head: () => ({
    meta: [{ title: "APOC Decision Register — ClearPath OPS" }],
  }),
  component: RegisterPage,
});

type Tab = "open" | "done" | "all";

const LEVEL_STYLES: Record<RegisterItem["action_level"], string> = {
  monitor: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  prepare: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  act: "bg-red-500/15 text-red-300 border-red-500/30",
};

function RegisterPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("open");

  const list = useServerFn(listRegisterItems);
  const update = useServerFn(updateRegisterItem);
  const del = useServerFn(deleteRegisterItem);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["register-items"],
    queryFn: () => list({ data: {} }),
  });

  const updateMut = useMutation({
    mutationFn: (vars: Parameters<typeof update>[0]["data"]) => update({ data: vars }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["register-items"] }),
    onError: (e) => toast.error(e instanceof Error ? e.message : "Update failed"),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["register-items"] });
      toast.success("Item removed");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Delete failed"),
  });

  const filtered = items.filter((i) => (tab === "all" ? true : i.status === tab));
  const counts = {
    open: items.filter((i) => i.status === "open").length,
    done: items.filter((i) => i.status === "done").length,
    all: items.length,
  };

  async function signOut() {
    await supabase.auth.signOut();
    queryClient.clear();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen bg-[#0B1628] text-white">
      <header className="border-b border-white/5 bg-[#081020]/60 backdrop-blur px-6 py-5">
        <div className="flex items-center justify-between gap-4 flex-wrap max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-sky-500 to-indigo-600 grid place-items-center">
              <ClipboardList className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-semibold">APOC Decision Register</h1>
              <p className="text-xs text-white/50">
                Shared queue of queued actions across the operations team
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/"
              className="flex items-center gap-2 text-sm text-white/70 hover:text-white px-3 py-1.5 rounded-md border border-white/10 hover:bg-white/5"
            >
              <ArrowLeft className="h-4 w-4" /> Dashboard
            </Link>
            <button
              onClick={signOut}
              className="flex items-center gap-2 text-sm text-white/70 hover:text-white px-3 py-1.5 rounded-md border border-white/10 hover:bg-white/5"
            >
              <LogOut className="h-4 w-4" /> Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-6 space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <Stat label="Open" value={counts.open} accent="text-amber-300" />
          <Stat label="Done" value={counts.done} accent="text-emerald-300" />
          <Stat label="Total" value={counts.all} accent="text-white" />
        </div>

        <div className="flex gap-1 border border-white/10 rounded-lg p-1 w-fit bg-white/[0.03]">
          {(["open", "done", "all"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-1.5 text-xs rounded-md capitalize ${
                tab === t ? "bg-sky-500/20 text-sky-200" : "text-white/60 hover:text-white"
              }`}
            >
              {t} ({counts[t]})
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="text-sm text-white/50">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="rounded-lg border border-white/10 bg-white/[0.03] p-10 text-center text-sm text-white/50">
            No items here. Queue an action from any flight card's “Take this action” button.
          </div>
        ) : (
          <ul className="space-y-2">
            {filtered.map((item) => (
              <RegisterRow
                key={item.id}
                item={item}
                onToggleStatus={() =>
                  updateMut.mutate({
                    id: item.id,
                    status: item.status === "open" ? "done" : "open",
                  })
                }
                onAssignee={(v) => updateMut.mutate({ id: item.id, assignee: v || null })}
                onNotes={(v) => updateMut.mutate({ id: item.id, notes: v || null })}
                onDelete={() => deleteMut.mutate(item.id)}
              />
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
      <div className="text-[10px] uppercase tracking-widest text-white/40">{label}</div>
      <div className={`text-2xl font-bold mt-1 ${accent}`}>{value}</div>
    </div>
  );
}

function RegisterRow({
  item,
  onToggleStatus,
  onAssignee,
  onNotes,
  onDelete,
}: {
  item: RegisterItem;
  onToggleStatus: () => void;
  onAssignee: (v: string) => void;
  onNotes: (v: string) => void;
  onDelete: () => void;
}) {
  const [assignee, setAssignee] = useState(item.assignee ?? "");
  const [notes, setNotes] = useState(item.notes ?? "");

  return (
    <li
      className={`rounded-lg border p-3 ${
        item.status === "done"
          ? "border-white/5 bg-white/[0.015] opacity-70"
          : "border-white/10 bg-white/[0.03]"
      }`}
    >
      <div className="flex items-start gap-3">
        <button
          onClick={onToggleStatus}
          title={item.status === "open" ? "Mark done" : "Reopen"}
          className={`shrink-0 h-7 w-7 rounded-md grid place-items-center border ${
            item.status === "done"
              ? "border-emerald-500/40 bg-emerald-500/20 text-emerald-300"
              : "border-white/15 text-white/60 hover:bg-white/10"
          }`}
        >
          {item.status === "done" ? (
            <RotateCcw className="h-3.5 w-3.5" />
          ) : (
            <CheckCircle2 className="h-3.5 w-3.5" />
          )}
        </button>

        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-white">{item.flight_number}</span>
            <span className="text-[11px] text-white/50">
              {item.flight_origin} → {item.flight_destination}
            </span>
            <span
              className={`text-[9px] uppercase tracking-widest px-1.5 py-0.5 rounded border ${LEVEL_STYLES[item.action_level]}`}
            >
              {item.action_level}
            </span>
            {item.status === "done" && (
              <span className="text-[9px] uppercase tracking-widest px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                done
              </span>
            )}
          </div>

          <div>
            <div className="text-sm font-medium text-white">{item.action_title}</div>
            <div className="text-xs text-white/65 mt-0.5">{item.action_description}</div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <input
              value={assignee}
              onChange={(e) => setAssignee(e.target.value)}
              onBlur={() => assignee !== (item.assignee ?? "") && onAssignee(assignee)}
              placeholder="Assignee"
              className="rounded-md bg-white/5 border border-white/10 px-2 py-1.5 text-xs outline-none focus:border-sky-400"
            />
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onBlur={() => notes !== (item.notes ?? "") && onNotes(notes)}
              placeholder="Notes"
              className="rounded-md bg-white/5 border border-white/10 px-2 py-1.5 text-xs outline-none focus:border-sky-400"
            />
          </div>

          <div className="flex items-center justify-between text-[10px] text-white/40">
            <span>
              Created {new Date(item.created_at).toLocaleString()}
              {item.completed_at && ` · Done ${new Date(item.completed_at).toLocaleString()}`}
            </span>
            <button
              onClick={onDelete}
              className="text-white/40 hover:text-red-300 flex items-center gap-1"
            >
              <Trash2 className="h-3 w-3" /> Remove
            </button>
          </div>
        </div>
      </div>
    </li>
  );
}
