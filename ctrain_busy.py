#!/usr/bin/env python3
"""
ctrain_busy.py — estimate how busy a CTrain is at a station.

Combines:
  - Google Places API (New) — resolve the station on Google Maps
  - Google Routes API — transit leg details (stops ahead on the line)
  - Calgary Transit GTFS-RT — live headway and arrival density

Usage:
  python ctrain_busy.py sirocco
  python ctrain_busy.py "69 street" -w
  GOOGLE_MAPS_API_KEY=... python ctrain_busy.py sirocco

Set GOOGLE_MAPS_API_KEY in .env or pass --api-key.
"""
import argparse
import datetime
import os
import sys
import time

import requests

from ctrain_wait import CTRAIN_ROUTES, fetch_feed, load_station_names, summarize

PLACES_SEARCH = "https://places.googleapis.com/v1/places:searchText"
PLACES_DETAIL = "https://places.googleapis.com/v1/places/{}"
ROUTES_URL = "https://routes.googleapis.com/directions/v2:computeRoutes"

BUSY_LABELS = [
    (2, "Quiet", "Plenty of room - light service or off-peak."),
    (4, "Moderate", "Typical ridership - you should get a seat."),
    (6, "Busy", "Rush-level crowding - standing room likely."),
    (99, "Very busy", "Peak crowding - expect a packed train."),
]


def load_api_key(cli_key):
    key = cli_key or os.environ.get("GOOGLE_MAPS_API_KEY")
    if not key and os.path.exists(".env"):
        with open(".env") as f:
            for line in f:
                line = line.strip()
                if line.startswith("GOOGLE_MAPS_API_KEY="):
                    key = line.split("=", 1)[1].strip().strip('"').strip("'")
                    break
    if not key:
        print(
            "Missing Google API key. Set GOOGLE_MAPS_API_KEY in .env or pass --api-key.",
            file=sys.stderr,
        )
        sys.exit(1)
    return key


def google_place_for_station(api_key, station_name):
    """Find a CTrain station via Google Places Text Search."""
    query = f"{station_name} Calgary CTrain station"
    resp = requests.post(
        PLACES_SEARCH,
        headers={
            "Content-Type": "application/json",
            "X-Goog-Api-Key": api_key,
            "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.location",
        },
        json={"textQuery": query, "regionCode": "CA"},
        timeout=30,
    )
    resp.raise_for_status()
    places = resp.json().get("places", [])
    if not places:
        return None
    p = places[0]
    loc = p.get("location", {})
    return {
        "id": p["id"],
        "name": p.get("displayName", {}).get("text", station_name),
        "address": p.get("formattedAddress", ""),
        "lat": loc.get("latitude"),
        "lng": loc.get("longitude"),
    }


def google_transit_stops_ahead(api_key, lat, lng):
    """Use Routes API to read how many stops the next train serves (crowding proxy)."""
    if lat is None or lng is None:
        return None

    # Destination ~8 km east along the line — enough to capture a multi-stop leg.
    dest_lat, dest_lng = lat, lng + 0.09
    departure = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    resp = requests.post(
        ROUTES_URL,
        headers={
            "Content-Type": "application/json",
            "X-Goog-Api-Key": api_key,
            "X-Goog-FieldMask": "routes.legs.steps.transitDetails",
        },
        json={
            "origin": {"location": {"latLng": {"latitude": lat, "longitude": lng}}},
            "destination": {"location": {"latLng": {"latitude": dest_lat, "longitude": dest_lng}}},
            "travelMode": "TRANSIT",
            "departureTime": departure,
            "transitPreferences": {"routingPreference": "FEWER_TRANSFERS"},
        },
        timeout=30,
    )
    if not resp.ok:
        return None

    for route in resp.json().get("routes", []):
        for leg in route.get("legs", []):
            for step in leg.get("steps", []):
                td = step.get("transitDetails")
                if not td:
                    continue
                line = td.get("transitLine", {})
                if line.get("vehicle", {}).get("type") != "TRAM":
                    continue
                return {
                    "line": line.get("nameShort") or line.get("name", "?"),
                    "headsign": td.get("headsign", ""),
                    "stop_count": td.get("stopCount"),
                    "departure_stop": td.get("stopDetails", {}).get("departureStop", {}).get("name"),
                }
    return None


def score_busyness(headway_min, hour, trains_in_window, route_info):
    """Return (score, factors) from live signals."""
    score = 0
    factors = []

    if headway_min is not None:
        if headway_min < 6:
            score += 3
            factors.append(f"tight headway ({headway_min:.0f} min)")
        elif headway_min < 10:
            score += 2
            factors.append(f"moderate headway ({headway_min:.0f} min)")
        elif headway_min < 15:
            score += 1
            factors.append(f"relaxed headway ({headway_min:.0f} min)")
        else:
            factors.append(f"wide headway ({headway_min:.0f} min)")
    else:
        factors.append("only one train in prediction window")

    if 7 <= hour < 9 or 16 <= hour < 18:
        score += 2
        factors.append("rush-hour period")
    elif 9 <= hour < 16:
        score += 1
        factors.append("daytime service")

    n = len(trains_in_window)
    if n >= 4:
        score += 2
        factors.append(f"{n} trains in feed window")
    elif n >= 2:
        score += 1
        factors.append(f"{n} trains in feed window")

    if route_info and route_info.get("stop_count"):
        stops = route_info["stop_count"]
        if stops >= 8:
            score += 2
            factors.append(f"long in-service leg ({stops} stops ahead)")
        elif stops >= 5:
            score += 1
            factors.append(f"mid-length leg ({stops} stops ahead)")

    return score, factors


def label_busyness(score):
    for threshold, label, hint in BUSY_LABELS:
        if score <= threshold:
            return label, hint
    return BUSY_LABELS[-1][1], BUSY_LABELS[-1][2]


def bar(score, width=10):
    filled = min(width, max(1, round(score * width / 8)))
    return "[" + "#" * filled + "-" * (width - filled) + "]"


def report(query, names, api_key, watch):
    q = query.lower()
    matches = {sid: nm for sid, nm in names.items() if q in nm.lower()}
    if not matches:
        print(f"No CTrain platform matches '{query}'. Run with no args to list stations.")
        return 1

    # Group platforms by station name for one Google lookup per station.
    by_name = {}
    for sid, nm in matches.items():
        by_name.setdefault(nm, []).append(sid)

    while True:
        feed_ts, by_stop = fetch_feed()
        now = int(time.time())
        age = now - feed_ts if feed_ts else None
        hour = datetime.datetime.now().hour

        hdr = f"\nCTrain busyness - feed age {age}s - {time.strftime('%H:%M:%S')}"
        print(hdr)
        print("=" * len(hdr.strip()))

        for station_name in sorted(by_name):
            sids = by_name[station_name]
            place = google_place_for_station(api_key, station_name)
            route_info = None
            if place:
                route_info = google_transit_stops_ahead(api_key, place["lat"], place["lng"])

            print(f"\n{station_name}")
            if place:
                print(f"  Google: {place['name']} - {place['address']}")
            else:
                print("  Google: station not found (using GTFS-RT only)")

            for sid in sorted(sids):
                arrivals = by_stop.get(sid, [])
                route_ids = sorted({r for _, r in arrivals})
                lines = ", ".join(CTRAIN_ROUTES.get(r, r) for r in route_ids) or "no trains"
                mins, _, avg_h = summarize(arrivals, now)

                score, factors = score_busyness(avg_h, hour, mins, route_info)
                label, hint = label_busyness(score)

                print(f"\n  Platform {sid} ({lines})")
                if not mins:
                    print("  status: no upcoming trains — cannot estimate busyness")
                    continue
                print(f"  next: {'  '.join(f'{m:.0f}m' for m in mins[:5])}")
                print(f"  busyness: {label} {bar(score)}  (score {score}/8)")
                print(f"  detail: {hint}")
                if factors:
                    print(f"  signals: {'; '.join(factors)}")
                if route_info:
                    print(
                        f"  Google route: {route_info.get('line')} -> {route_info.get('headsign')} "
                        f"({route_info.get('stop_count')} stops on sample leg)"
                    )

        if not watch:
            return 0
        time.sleep(30)


def list_stations(names):
    stations = sorted(set(names.values()))
    print(f"{len(stations)} CTrain platforms (search by any part of the name):\n")
    for nm in stations:
        print(" ", nm)


def main():
    ap = argparse.ArgumentParser(description="Estimate CTrain busyness (Google Maps + GTFS-RT)")
    ap.add_argument("query", nargs="?", help="station name substring, e.g. 'sirocco'")
    ap.add_argument("-w", "--watch", action="store_true", help="refresh every 30s")
    ap.add_argument("--refresh", action="store_true", help="re-download station name cache")
    ap.add_argument("--api-key", help="Google Maps API key (or set GOOGLE_MAPS_API_KEY)")
    args = ap.parse_args()

    api_key = load_api_key(args.api_key)
    names = load_station_names(refresh=args.refresh)
    if not args.query:
        list_stations(names)
        return 0
    return report(args.query, names, api_key, args.watch)


if __name__ == "__main__":
    sys.exit(main())
