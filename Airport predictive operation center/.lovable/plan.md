We will change the "Avg delay propagation" KPI tile to show the "number of flights departing in the next hour" (based on Chicago local time matching the flights' scheduled times).

### Steps:
1. **Calculate the next hour's departures** in `src/routes/index.tsx`:
   - Get the current time in the `America/Chicago` timezone.
   - Parse each flight's scheduled time of departure (`f.std`).
   - Count flights where the departure time falls within the next 60 minutes from the current Chicago local time.
   - Pass this count to the `KpiBar` component.

2. **Update `KpiBar.tsx`**:
   - Change the third tile's label to "Departures next hour".
   - Repurpose/rename the prop or value slot to display the count of next hour flights.
   - Change the suffix to "flights" instead of "min".
   - Change the icon from `Timer` to `Plane`.
   - Update the tooltip to describe the count of flights departing in the next 60 minutes.
