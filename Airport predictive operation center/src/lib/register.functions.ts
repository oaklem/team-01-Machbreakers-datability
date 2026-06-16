import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export interface RegisterItem {
  id: string;
  flight_id_ref: string;
  flight_number: string;
  flight_origin: string;
  flight_destination: string;
  action_id: string;
  action_title: string;
  action_description: string;
  action_level: "monitor" | "prepare" | "act";
  status: "open" | "done";
  assignee: string | null;
  notes: string | null;
  created_by: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export const addRegisterItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: {
    flight_id_ref: string;
    flight_number: string;
    flight_origin: string;
    flight_destination: string;
    action_id: string;
    action_title: string;
    action_description: string;
    action_level: "monitor" | "prepare" | "act";
  }) => input)
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("register_items")
      .insert({ ...data, created_by: context.userId })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row as RegisterItem;
  });

export const listRegisterItems = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { status?: "open" | "done" } | undefined) => input ?? {})
  .handler(async ({ data, context }) => {
    let q = context.supabase.from("register_items").select("*").order("created_at", { ascending: false });
    if (data.status) q = q.eq("status", data.status);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return (rows ?? []) as RegisterItem[];
  });

export const updateRegisterItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: {
    id: string;
    status?: "open" | "done";
    assignee?: string | null;
    notes?: string | null;
  }) => input)
  .handler(async ({ data, context }) => {
    const patch: {
      status?: "open" | "done";
      completed_at?: string | null;
      assignee?: string | null;
      notes?: string | null;
    } = {};
    if (data.status !== undefined) {
      patch.status = data.status;
      patch.completed_at = data.status === "done" ? new Date().toISOString() : null;
    }
    if (data.assignee !== undefined) patch.assignee = data.assignee;
    if (data.notes !== undefined) patch.notes = data.notes;

    const { data: row, error } = await context.supabase
      .from("register_items")
      .update(patch)
      .eq("id", data.id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row as RegisterItem;
  });

export const deleteRegisterItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("register_items").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
