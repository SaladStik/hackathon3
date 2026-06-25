# Calgary CTrain live wait times

Reads Calgary Transit's [GTFS-RT Trip Updates feed](https://data.calgary.ca/Transportation-Transit/Calgary-Transit-Realtime-Trip-Updates-GTFS-RT/gs4m-mdc2)
(refreshed ~every 30s) and reports, for a CTrain station/platform:

- the next  few predicted arrivals (live countdown)
- the current headway (gap between consecutive trains)
- the expected wait for a passenger arriving now (~half the headway)

Station names come from the static GTFS schedule, downloaded once

## Setup

```bash
python -m venv .venv
.venv\Scripts\pip install -r requirements.txt   # Windows
# source .venv/bin/activate && pip install -r requirements.txt   # macOS/Linux
```

## Contributing

Push directly to [SaladStik/hackathon3](https://github.com/SaladStik/hackathon3):

```bash
git fetch origin
git pull origin main
git checkout -b my-feature
git add .
git commit -m "Describe your change"
git push -u origin my-feature
```

`origin` is `https://github.com/SaladStik/hackathon3.git`. Track work on the [project board](https://github.com/SaladStik/hackathon3/projects).

## Usage

```bash
./.venv/bin/python ctrain_wait.py                 # list all CTrain stations
./.venv/bin/python ctrain_wait.py sirocco         # arrivals + avg wait for matching stops
./.venv/bin/python ctrain_wait.py "69 street" -w  # --watch: refresh every 30s
./.venv/bin/python ctrain_wait.py --refresh       # re-download cached station names
```

## Notes

- Times are **predictions**, recomputed each refresh — countdowns shift as trains move.
- The "average wait" is the *current* headway (≈ half), not a daily/historical average.
- Only trains within the feed's prediction window are shown (typically the next few per platform).
- Known gap: downtown free-fare-zone stations (e.g. City Hall / Bow Valley) aren't named
  "CTrain" in the schedule, so they're not yet picked up by the name filter.

Data: City of Calgary Open Data — Trip Updates `gs4m-mdc2`, Schedule `npk7-z3bj`.
