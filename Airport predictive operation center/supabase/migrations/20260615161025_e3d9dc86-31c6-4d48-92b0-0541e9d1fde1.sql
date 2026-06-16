
CREATE TABLE public.airlines (
  iata_code text PRIMARY KEY,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.airlines TO anon, authenticated;
GRANT ALL ON public.airlines TO service_role;
ALTER TABLE public.airlines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Airlines are publicly readable" ON public.airlines FOR SELECT USING (true);

CREATE TABLE public.airports (
  iata_code text PRIMARY KEY,
  name text NOT NULL,
  city text,
  state text,
  country text,
  latitude numeric,
  longitude numeric,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.airports TO anon, authenticated;
GRANT ALL ON public.airports TO service_role;
ALTER TABLE public.airports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Airports are publicly readable" ON public.airports FOR SELECT USING (true);

CREATE TABLE public.flights (
  flight_id text PRIMARY KEY,
  date date NOT NULL,
  day_of_week smallint,
  carrier text REFERENCES public.airlines(iata_code),
  flight_number integer,
  tail_number text,
  origin text REFERENCES public.airports(iata_code),
  origin_lat numeric,
  origin_lon numeric,
  dest text REFERENCES public.airports(iata_code),
  sched_dep_local time,
  dep_hour smallint,
  scheduled_arr_local time,
  distance_km numeric,
  temp_c numeric,
  wind_speed_kmh numeric,
  wind_gust_kmh numeric,
  precip_mm numeric,
  snowfall_cm numeric,
  cloud_cover_pct numeric,
  weather_code smallint,
  dep_delay_min integer,
  arr_delay_min integer,
  delayed_15 smallint,
  cancelled smallint,
  delay_cause text CHECK (delay_cause IS NULL OR delay_cause IN ('none','weather','late_aircraft','nas','carrier','security','cancelled_other')),
  late_aircraft_delay_min integer,
  weather_delay_min integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.flights TO authenticated;
GRANT SELECT ON public.flights TO anon;
GRANT ALL ON public.flights TO service_role;
ALTER TABLE public.flights ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Flights are publicly readable" ON public.flights FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert flights" ON public.flights FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update flights" ON public.flights FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete flights" ON public.flights FOR DELETE TO authenticated USING (true);

CREATE INDEX flights_date_idx ON public.flights(date);
CREATE INDEX flights_origin_idx ON public.flights(origin);
CREATE INDEX flights_carrier_idx ON public.flights(carrier);
CREATE INDEX flights_tail_chain_idx ON public.flights(tail_number, date, sched_dep_local);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_flights_updated_at
BEFORE UPDATE ON public.flights
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
