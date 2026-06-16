## Plan: Import uploaded CSVs into the database

The `airlines`, `airports`, and `flights` tables already exist with matching columns and are currently empty (0 rows each). No schema changes are needed — just data load.

### What I'll import
- **airlines.csv** → `public.airlines` (14 rows): `IATA_CODE`→`iata_code`, `AIRLINE`→`name`
- **airports.csv** → `public.airports` (322 rows): `IATA_CODE,AIRPORT,CITY,STATE,COUNTRY,LATITUDE,LONGITUDE` → `iata_code,name,city,state,country,latitude,longitude`
- **flights_weather_sample.csv** → `public.flights` (9,197 rows): column names already match the table 1:1.

### How
Use `psql \copy` from the sandbox to stream each CSV into a temp staging table, then `INSERT … ON CONFLICT DO NOTHING` into the live tables so re-runs are safe and any duplicate IATA codes / flight_ids are skipped. Empty numeric fields in `flights` (e.g. `late_aircraft_delay_min`, `weather_delay_min`) will be loaded as NULL.

### After load
Report row counts inserted per table so you can confirm the dashboard now has real data to render.

No app code changes — the dashboard already reads from these tables via `getFlightsForLatestDate`.