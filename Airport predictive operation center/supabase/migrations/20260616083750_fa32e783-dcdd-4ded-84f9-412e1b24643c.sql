CREATE TABLE public.register_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flight_id_ref TEXT NOT NULL,
  flight_number TEXT NOT NULL,
  flight_origin TEXT NOT NULL,
  flight_destination TEXT NOT NULL,
  action_id TEXT NOT NULL,
  action_title TEXT NOT NULL,
  action_description TEXT NOT NULL,
  action_level TEXT NOT NULL CHECK (action_level IN ('monitor','prepare','act')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','done')),
  assignee TEXT,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.register_items TO authenticated;
GRANT ALL ON public.register_items TO service_role;

ALTER TABLE public.register_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read register items"
  ON public.register_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert register items"
  ON public.register_items FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Authenticated users can update register items"
  ON public.register_items FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete register items"
  ON public.register_items FOR DELETE TO authenticated USING (true);

CREATE TRIGGER update_register_items_updated_at
  BEFORE UPDATE ON public.register_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX register_items_status_created_idx ON public.register_items (status, created_at DESC);