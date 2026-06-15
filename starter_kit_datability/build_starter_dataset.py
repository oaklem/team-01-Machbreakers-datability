#!/usr/bin/env python3
"""
build_starter_dataset.py - DATAbility "Ready for Takeoff" challenge

Builds the real flights-and-weather slice that ships with this kit:
a week of departures from two busy US hubs (US DOT data), joined to real
Open-Meteo weather by airport and hour. Pure standard library, no pip installs.

The kit already ships the output (`flights_weather_sample.csv`), so you only
need this script if you want more: other airports, a longer window, more data.

To rebuild or extend, you need the raw US DOT file (it is 565 MB, too big to
ship):
    1. Download https://www.kaggle.com/datasets/usdot/flight-delays
    2. Unzip so you have flights.csv and airports.csv in one folder.
    3. python3 build_starter_dataset.py --raw /path/to/that/folder \\
           --origins ORD,DEN,ATL --start 2015-01-05 --end 2015-01-18

Note: in this dataset the airport columns switch from codes (ORD) to numbers in
October 2015, so pick a window outside October.

Weather comes from the Open-Meteo archive API (free, no key). It needs network
access while building; the shipped CSV already has it baked in.
"""

import kagglehub

# Download latest version
path = kagglehub.dataset_download("usdot/flight-delays")

print("Path to dataset files:", path)


import argparse, csv, json, os, urllib.request, urllib.parse

CAUSE = {"weather": "WEATHER_DELAY", "late_aircraft": "LATE_AIRCRAFT_DELAY",
         "nas": "AIR_SYSTEM_DELAY", "carrier": "AIRLINE_DELAY", "security": "SECURITY_DELAY"}
CANCEL = {"A": "carrier", "B": "weather", "C": "nas", "D": "security"}

FIELDS = ["flight_id","date","day_of_week","carrier","flight_number","tail_number","origin",
          "origin_lat","origin_lon","dest","sched_dep_local","dep_hour","scheduled_arr_local","distance_km",
          "temp_c","wind_speed_kmh","wind_gust_kmh","precip_mm","snowfall_cm","cloud_cover_pct","weather_code",
          "dep_delay_min","arr_delay_min","delayed_15","cancelled","delay_cause",
          "late_aircraft_delay_min","weather_delay_min"]

DOWNLOAD_RECIPE = """\
No raw US DOT file found. The kit already ships the built slice
(flights_weather_sample.csv); you only need the raw file to rebuild or extend.

  1. Download https://www.kaggle.com/datasets/usdot/flight-delays (free account)
  2. Unzip; keep flights.csv and airports.csv together in one folder.
  3. Re-run with --raw /path/to/that/folder
"""

def fnum(s):
    return float(s) if s not in ("", None) else None

def hhmm(s):
    s = (s or "").zfill(4)
    return f"{s[:2]}:{s[2:]}" if len(s) == 4 else ""

def load_coords(path):
    coords = {}
    for r in csv.DictReader(open(path)):
        try:
            coords[r["IATA_CODE"]] = (float(r["LATITUDE"]), float(r["LONGITUDE"]))
        except (ValueError, KeyError):
            pass
    return coords

def fetch_weather(lat, lon, start, end):
    """Hourly weather for one location, keyed by (date, hour) in local time."""
    q = urllib.parse.urlencode({
        "latitude": lat, "longitude": lon, "start_date": start, "end_date": end,
        "hourly": "temperature_2m,wind_speed_10m,wind_gusts_10m,precipitation,snowfall,cloud_cover,weather_code",
        "timezone": "auto"})
    url = "https://archive-api.open-meteo.com/v1/archive?" + q
    last = None
    for _ in range(3):
        try:
            with urllib.request.urlopen(url, timeout=30) as resp:
                h = json.load(resp)["hourly"]
            wx = {}
            for i, t in enumerate(h["time"]):
                date, hh = t.split("T")
                wx[(date, int(hh[:2]))] = (h["temperature_2m"][i], h["wind_speed_10m"][i],
                    h["wind_gusts_10m"][i], h["precipitation"][i], h["snowfall"][i],
                    h["cloud_cover"][i], h["weather_code"][i])
            return wx
        except Exception as e:
            last = e
    raise last

def build(raw_dir, origins, start, end, out):
    coords = load_coords(os.path.join(raw_dir, "airports.csv"))
    print("fetching weather for", sorted(origins), "...")
    wx = {ap: fetch_weather(coords[ap][0], coords[ap][1], start, end) for ap in origins}
    rows = []
    with open(os.path.join(raw_dir, "flights.csv")) as f:
        rd = csv.reader(f); head = next(rd); ix = {c: i for i, c in enumerate(head)}
        for row in rd:
            org = row[ix["ORIGIN_AIRPORT"]]
            if org not in origins:
                continue
            date = f'{row[ix["YEAR"]]}-{int(row[ix["MONTH"]]):02d}-{int(row[ix["DAY"]]):02d}'
            if not (start <= date <= end):
                continue
            cancelled = row[ix["CANCELLED"]] == "1"
            dep, arr = fnum(row[ix["DEPARTURE_DELAY"]]), fnum(row[ix["ARRIVAL_DELAY"]])
            if cancelled:
                cause = CANCEL.get(row[ix["CANCELLATION_REASON"]], "cancelled_other")
            else:
                mins = {k: (fnum(row[ix[c]]) or 0.0) for k, c in CAUSE.items()}
                cause = max(mins, key=mins.get) if max(mins.values()) > 0 else "none"
            sd = row[ix["SCHEDULED_DEPARTURE"]]
            dep_hour = int(sd.zfill(4)[:2]) if sd else None
            w = wx[org].get((date, dep_hour), (None,) * 7)
            lat, lon = coords[org]
            rows.append({
                "flight_id": f'{date}_{row[ix["AIRLINE"]]}{row[ix["FLIGHT_NUMBER"]]}', "date": date,
                "day_of_week": row[ix["DAY_OF_WEEK"]], "carrier": row[ix["AIRLINE"]],
                "flight_number": row[ix["FLIGHT_NUMBER"]], "tail_number": row[ix["TAIL_NUMBER"]],
                "origin": org, "origin_lat": lat, "origin_lon": lon, "dest": row[ix["DESTINATION_AIRPORT"]],
                "sched_dep_local": hhmm(sd), "dep_hour": dep_hour if dep_hour is not None else "",
                "scheduled_arr_local": hhmm(row[ix["SCHEDULED_ARRIVAL"]]),
                "distance_km": round(float(row[ix["DISTANCE"]]) * 1.60934) if row[ix["DISTANCE"]] else "",
                "temp_c": w[0], "wind_speed_kmh": w[1], "wind_gust_kmh": w[2], "precip_mm": w[3],
                "snowfall_cm": w[4], "cloud_cover_pct": w[5], "weather_code": w[6],
                "dep_delay_min": "" if dep is None else int(dep),
                "arr_delay_min": "" if arr is None else int(arr),
                "delayed_15": "" if (cancelled or dep is None) else int(dep >= 15),
                "cancelled": int(cancelled), "delay_cause": cause,
                "late_aircraft_delay_min": "" if fnum(row[ix["LATE_AIRCRAFT_DELAY"]]) is None else int(fnum(row[ix["LATE_AIRCRAFT_DELAY"]])),
                "weather_delay_min": "" if fnum(row[ix["WEATHER_DELAY"]]) is None else int(fnum(row[ix["WEATHER_DELAY"]])),
            })
    with open(out, "w", newline="") as f:
        wr = csv.DictWriter(f, fieldnames=FIELDS); wr.writeheader(); wr.writerows(rows)
    print(f"wrote {len(rows)} rows to {out}")

def main():
    here = os.path.dirname(os.path.abspath(__file__))
    ap = argparse.ArgumentParser(description="Build the real flights+weather slice.")
    ap.add_argument("--raw", default=os.path.join(here, "..", "datability_raw"),
                    help="folder with flights.csv and airports.csv")
    ap.add_argument("--origins", default="ORD,DEN", help="comma-separated airport codes")
    ap.add_argument("--start", default="2015-01-05")
    ap.add_argument("--end", default="2015-01-11")
    ap.add_argument("--out", default=os.path.join(here, "flights_weather_sample.csv"))
    args = ap.parse_args()
    if not os.path.exists(os.path.join(args.raw, "flights.csv")):
        print(DOWNLOAD_RECIPE)
        return
    build(args.raw, set(args.origins.split(",")), args.start, args.end, args.out)

if __name__ == "__main__":
    main()
