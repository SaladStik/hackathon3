# Calgary CTrain

Two tools plus a 3D web sim for Calgary Transit CTrain:

- **`ctrain_wait.py`** — live wait times from GTFS-RT (headway, next arrivals)
- **`ctrain_busy.py`** — busyness estimate (GTFS-RT + Google Places/Routes APIs)
- **Web app** — Vite + React + Three.js 3D city loop (`npm run dev`)

## Setup

### Python tools

```bash
python -m venv .venv
.venv\Scripts\pip install -r requirements.txt   # Windows
# source .venv/bin/activate && pip install -r requirements.txt   # macOS/Linux
cp .env.example .env   # then add your Google Maps API key for ctrain_busy.py
```

### Web app

```bash
npm install
npm run dev    # http://localhost:5173/hackathon3/
npm run build  # outputs to docs/ for GitHub Pages
```

## Usage

### Wait times

```bash
.venv\Scripts\python ctrain_wait.py                 # list all CTrain stations
.venv\Scripts\python ctrain_wait.py sirocco         # arrivals + avg wait
.venv\Scripts\python ctrain_wait.py "69 street" -w  # refresh every 30s
```

### Busyness

Requires `GOOGLE_MAPS_API_KEY` in `.env` (Places + Routes APIs enabled):

```bash
.venv\Scripts\python ctrain_busy.py sirocco
.venv\Scripts\python ctrain_busy.py "69 street" -w
```

## Contributing

Push to [SaladStik/hackathon3](https://github.com/SaladStik/hackathon3):

```bash
git pull origin main
git checkout -b my-feature
git add .
git commit -m "Describe your change"
git push -u origin my-feature
```

`origin` → `https://github.com/SaladStik/hackathon3.git`

## Notes

- Times are **predictions**, recomputed each refresh — countdowns shift as trains move.
- The "average wait" is the *current* headway (≈ half), not a daily/historical average.
- Only trains within the feed's prediction window are shown (typically the next few per platform).
- Known gap: downtown free-fare-zone stations (e.g. City Hall / Bow Valley) aren't named
  "CTrain" in the schedule, so they're not yet picked up by the name filter.

Data: City of Calgary Open Data — Trip Updates `gs4m-mdc2`, Schedule `npk7-z3bj`.

_Demo push verified by amadeusk1._
