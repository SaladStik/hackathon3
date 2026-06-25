#!/usr/bin/env python3
"""
ctrain_wait.py — live CTrain wait times from Calgary Transit GTFS-RT.

Pulls the realtime Trip Updates feed (updated ~every 30s) and reports, for a
CTrain station/platform:
  - the next few predicted arrivals (live countdown)
  - the current headway (gap between consecutive trains)
  - the expected wait for a passenger arriving now (~half the headway)

Station names come from the static GTFS schedule, downloaded once and cached.

Usage:
  python ctrain_wait.py                 # list all CTrain stations
  python ctrain_wait.py sirocco         # arrivals + avg wait for matching stops
  python ctrain_wait.py "69 street" -w  # --watch: refresh every 30s
  python ctrain_wait.py --refresh       # re-download cached station names

Data: https://data.calgary.ca/  (Trip Updates: gs4m-mdc2, Schedule: npk7-z3bj)
"""
import argparse
import csv
import io
import json
import os
import sys
import time
import zipfile

import requests
from google.transit import gtfs_realtime_pb2

TRIP_UPDATES_URL = "https://data.calgary.ca/download/gs4m-mdc2/application%2Foctet-stream"
STATIC_GTFS_URL = "https://data.calgary.ca/download/npk7-z3bj/application%2Fx-zip-compressed"
CTRAIN_ROUTES = {"201": "Red Line", "202": "Blue Line"}
CACHE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "ctrain_stops.json")


def load_station_names(refresh=False):
    """Return {stop_id: stop_name} for CTrain platforms, cached locally."""
    if os.path.exists(CACHE) and not refresh:
        with open(CACHE) as f:
            return json.load(f)
    print("Downloading static GTFS (one-time, ~29 MB)...", file=sys.stderr)
    data = requests.get(STATIC_GTFS_URL, timeout=120).content
    z = zipfile.ZipFile(io.BytesIO(data))
    names = {}
    reader = csv.DictReader(io.TextIOWrapper(z.open("stops.txt"), encoding="utf-8-sig"))
    for row in reader:
        if "CTrain" in row.get("stop_name", ""):
            names[row["stop_id"]] = row["stop_name"]
    with open(CACHE, "w") as f:
        json.dump(names, f)
    print(f"Cached {len(names)} CTrain platforms -> {CACHE}", file=sys.stderr)
    return names


def fetch_feed():
    """Return (feed_timestamp, {stop_id: [(arrival_epoch, route_id), ...]})."""
    raw = requests.get(TRIP_UPDATES_URL, timeout=60).content
    feed = gtfs_realtime_pb2.FeedMessage()
    feed.ParseFromString(raw)
    by_stop = {}
    for e in feed.entity:
        if not e.HasField("trip_update"):
            continue
        tu = e.trip_update
        if tu.trip.route_id not in CTRAIN_ROUTES:
            continue
        for stu in tu.stop_time_update:
            if not stu.HasField("arrival"):
                continue
            t = stu.arrival.time
            if t <= 0:  # -1 placeholder / no prediction
                continue
            by_stop.setdefault(stu.stop_id, []).append((t, tu.trip.route_id))
    return feed.header.timestamp, by_stop


def summarize(arrivals, now):
    """Given sorted future arrival epochs, compute countdowns, headway, avg wait."""
    future = sorted(t for t, _ in arrivals if t > now)
    mins = [(t - now) / 60 for t in future]
    headways = [(b - a) / 60 for a, b in zip(future, future[1:])]
    avg_headway = sum(headways) / len(headways) if headways else None
    return mins, headways, avg_headway


def report(query, names, watch):
    # resolve matching platforms by name substring
    q = query.lower()
    matches = {sid: nm for sid, nm in names.items() if q in nm.lower()}
    if not matches:
        print(f"No CTrain platform matches '{query}'. Run with no args to list stations.")
        return 1

    while True:
        feed_ts, by_stop = fetch_feed()
        now = int(time.time())
        age = now - feed_ts if feed_ts else None
        hdr = f"\nCTrain live — feed age {age}s — {time.strftime('%H:%M:%S')}"
        print(hdr)
        print("=" * len(hdr.strip()))
        for sid in sorted(matches, key=lambda s: names[s]):
            arrivals = by_stop.get(sid, [])
            mins, _, avg_h = summarize(arrivals, now)
            print(f"\n{names[sid]}  (stop {sid})")
            if not mins:
                print("  no upcoming trains predicted")
                continue
            nxt = "  ".join(f"{m:.0f}m" for m in mins[:5])
            print(f"  next: {nxt}")
            if avg_h is not None:
                print(f"  headway ~{avg_h:.1f} min  ->  expected wait ~{avg_h / 2:.1f} min")
            else:
                print(f"  only one train in window (in {mins[0]:.0f}m); headway needs 2+")
        if not watch:
            return 0
        time.sleep(30)


def list_stations(names):
    # collapse WB/EB into station groupings for readability
    stations = sorted(set(names.values()))
    print(f"{len(stations)} CTrain platforms (search by any part of the name):\n")
    for nm in stations:
        print(" ", nm)


def main():
    ap = argparse.ArgumentParser(description="Live CTrain wait times (Calgary Transit GTFS-RT)")
    ap.add_argument("query", nargs="?", help="station name substring, e.g. 'sirocco'")
    ap.add_argument("-w", "--watch", action="store_true", help="refresh every 30s")
    ap.add_argument("--refresh", action="store_true", help="re-download station name cache")
    args = ap.parse_args()

    names = load_station_names(refresh=args.refresh)
    if not args.query:
        list_stations(names)
        return 0
    return report(args.query, names, args.watch)


if __name__ == "__main__":
    sys.exit(main())
