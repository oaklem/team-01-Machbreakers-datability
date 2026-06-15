# Data dictionary: flights_weather_sample.csv

Real data. One week of departures from Chicago O'Hare (ORD) and Denver (DEN), 5 to 11 January 2015, from the US DOT on-time performance dataset, joined to real Open-Meteo weather at the origin for the scheduled departure hour. 9,197 flights.

One row per scheduled flight. The columns split into what you would know before the flight (inputs) and what happened (the answer key). Never train on the answer-key columns.

## Pre-flight inputs (known before departure)

| Column | Meaning |
|---|---|
| `flight_id` | `date_carrierFlightnumber`, unique per row. |
| `date` | Scheduled date (YYYY-MM-DD). |
| `day_of_week` | 1 = Monday … 7 = Sunday. |
| `carrier` | Airline code (see airlines.csv in the raw download for names). |
| `flight_number` | Flight number. |
| `tail_number` | The physical aircraft. Chain a tail's flights in time order to reconstruct how late the inbound aircraft is, the real cascade signal (see below). |
| `origin` | Departure airport (IATA): ORD or DEN in this slice. |
| `origin_lat`, `origin_lon` | Origin coordinates. Use them to pull weather for any other airport if you extend the data. |
| `dest` | Arrival airport (IATA). |
| `sched_dep_local` | Scheduled departure, local time, HH:MM. |
| `dep_hour` | Hour of scheduled departure, 0-23. Evening and early-morning banks run hotter. |
| `scheduled_arr_local` | Scheduled arrival, local time. |
| `distance_km` | Leg distance. |
| `temp_c` | Origin temperature at the departure hour. |
| `wind_speed_kmh` | Origin sustained wind. |
| `wind_gust_kmh` | Origin gusts. Gusts move ground operations more than steady wind. |
| `precip_mm` | Origin precipitation that hour. |
| `snowfall_cm` | Origin snowfall that hour. It is January in Chicago and Denver, so this matters. |
| `cloud_cover_pct` | Origin cloud cover. |
| `weather_code` | WMO code: 0 clear, 3 cloudy, 45 fog, 51-67 rain, 71-77 snow, 80-82 showers, 95 thunderstorm. |

## Outcomes and answer key (never use these as model inputs)

| Column | Meaning |
|---|---|
| `dep_delay_min` | Minutes late off the gate (negative = early). The main prediction target. Empty when cancelled. |
| `arr_delay_min` | Minutes late on arrival. |
| `delayed_15` | 1 if `dep_delay_min` >= 15, else 0. Empty when cancelled. The easy binary target. |
| `cancelled` | 1 if the flight was cancelled. |
| `delay_cause` | Dominant cause: `none`, `weather`, `late_aircraft`, `nas` (airport / air-traffic congestion), `carrier`, `security`, or `cancelled_other`. Derived from the official cause breakdown. |
| `late_aircraft_delay_min` | Minutes of this flight's delay the airline attributed to a late inbound aircraft. |
| `weather_delay_min` | Minutes attributed to weather. |

**These cause columns are post-hoc.** The airline assigns them only to flights that were already delayed (15+ minutes on arrival), so they describe what happened, not what you could see coming. Use them as the answer key to check whether your model's explanation found the real reason. Do not feed them in as features, that is leakage.

## Deriving the inbound-aircraft state (the network signal)

There is no ready-made "the inbound aircraft is currently 40 minutes late" column, because that is not something the dataset hands you. You reconstruct it: group by `tail_number`, sort each aircraft's flights by scheduled time, and the previous leg's `arr_delay_min` is roughly what the operations desk knows before this flight pushes back. That derivation is the network part of the challenge, and `late_aircraft_delay_min` lets you check it.

## A suggested starting question

> For a day of departures, which flights are most likely to be 15+ minutes late,
> what is the single biggest reason for each, and what should the controller do?

Predict `delayed_15` (or `dep_delay_min`) from the inputs, including a cascade
feature you build from `tail_number`. Then, for any flight you flag, show what
drove it and turn it into a recommendation. `delay_cause` checks your reasoning.
