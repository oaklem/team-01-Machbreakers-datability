# Starter Kit: Ready for Takeoff
**Aerospace Build Days, 15-16 June 2026**

This handout supports teams in the DATAbility "Ready for Takeoff" challenge. The provided dataset features pre-joined real data, allowing you to bypass data wrangling and immediately focus on model training and interface sketching.

## Kit Contents
- **`flights_weather_sample.csv`**: Contains 9,197 actual flights representing a week of departures from Chicago O'Hare and Denver (US DOT, Jan 2015). Each record is joined to Open-Meteo weather data at the origin and labeled with delay durations and causes.
- **`data_dictionary.md`**: Explains every column, distinguishes inputs from the answer key, and provides instructions for building the cascade signal.
- **`ops_controller_primer.docx`**: A one-page briefing on the role of an operations desk.
- **`delay_facts.docx`**: National delay statistics spanning 2003 to 2022, detailing frequency and primary causes to support your problem statement.
- **`build_starter_dataset.py`**: The standard library script used to generate this data slice. Point it at the raw US DOT download to expand your dataset.

## Quick Start Guide
1. Open `flights_weather_sample.csv` to review scheduled flights, origin weather, and outcomes.
2. Predict `delayed_15` or `dep_delay_min` using the input columns. Derive a cascade feature using `tail_number` (based on the previous leg's `arr_delay_min`).
3. Explain the drivers behind flagged flights and recommend specific controller actions. Use the `delay_cause` column to validate your explanations against actual historical reasons.
4. To acquire more data, run `python3 build_starter_dataset.py` on the raw US DOT file.

## Critical Warnings
- **Prevent Data Leakage**: Train your model strictly on schedule data, weather data, and your derived cascade feature. Do not train on outcome columns (`dep_delay_min`, `arr_delay_min`, `delayed_15`, `cancelled`, `delay_cause`, `late_aircraft_delay_min`, `weather_delay_min`).
- **Cause Columns**: These are post-hoc tags applied only to already-delayed flights; treat them as an answer key, not predictive inputs.
- **Cancellations**: Cancelled rows lack `dep_delay_min` values. You must decide whether to drop these rows or model cancellations separately.
- **Real Data is Noisy**: A perfect prediction score strongly indicates data leakage.
- **Scope**: This sample covers only two hubs during one winter week. Use the build script if you need broader coverage.

## Key Signal Sources
- **Weather**: Origin weather events (gusts, precipitation, snow) drive delays and cancellations across the entire airport.
- **The Cascade**: The largest single driver of delays is the late arrival of the inbound aircraft. Building this feature from `tail_number` yields high predictive value.
- **Congestion**: Evening and early-morning banks experience higher rates of congestion (cause: `nas`).
- **Baselines**: Because most flights are on time, the base rate of `delayed_15` is the benchmark your model must beat.
- **Partner Bonus**: Successfully naming the specific variables affecting a flagged flight earns a partner bonus.

## Data Limitations
- **Flight Data**: Sourced from the public US DOT on-time performance dataset.
- **Weather Data**: Uses Open-Meteo's ERA5 reanalysis matched to the scheduled departure hour. This is close to, but not identical to, live METAR readings.
- **Exclusions**: The dataset does not account for crew duty limits, aircraft types, air-traffic slot details, or the full multi-leg network beyond simple `tail_number` chaining. Clearly state any assumptions your solution makes regarding these missing variables.
