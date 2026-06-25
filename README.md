# Calgary CTrain live wait times

Reads Calgary Transit's [GTFS-RT Trip Updates feed](https://data.calgary.ca/Transportation-Transit/Calgary-Transit-Realtime-Trip-Updates-GTFS-RT/gs4m-mdc2)
(refreshed ~every 30s) and reports, for a CTrain station/platform:

- the next few predicted arrivals (live countdown)
- the current headway (gap between consecutive trains)
- the expected wait for a passenger arriving now (~half the headway)

Station names come from the static GTFS schedule, downloaded once.

## Setup

```bash
python -m venv .venv
.venv\Scripts\pip install -r requirements.txt   # Windows
# source .venv/bin/activate && pip install -r requirements.txt   # macOS/Linux
```

## Contributing

This repo uses the standard fork workflow:

1. **Fork** [SaladStik/hackathon3](https://github.com/SaladStik/hackathon3/fork) on GitHub (one-time).
2. **Clone / sync** — this folder already has remotes configured:
   - `upstream` → SaladStik/hackathon3 (pull latest team changes)
   - `origin` → your fork at `amadeusk1/hackathon3`
3. **Pull latest** before you start work:
   ```bash
   git fetch upstream
   git pull upstream main
   ```
4. **Branch, commit, push** to your fork:
   ```bash
   git checkout -b my-feature
   git add .
   git commit -m "Describe your change"
   git push -u origin my-feature
   ```
5. **Open a PR** on GitHub from your fork into `SaladStik/hackathon3:main`.

`git push` defaults to `origin` so you won't accidentally push to upstream.

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
