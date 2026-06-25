import { transit_realtime } from 'gtfs-realtime-bindings';

const FEED_URL = 'https://data.calgary.ca/download/gs4m-mdc2/application%2Foctet-stream';
const SCHEDULE_URL = import.meta.env.BASE_URL + 'schedule.json';

let schedulePromise = null;
function loadSchedule() {
  if (!schedulePromise) schedulePromise = fetch(SCHEDULE_URL).then((r) => r.json());
  return schedulePromise;
}

function toNum(v) {
  if (v == null) return null;
  if (typeof v === 'number') return v;
  if (typeof v.toNumber === 'function') return v.toNumber();
  return Number(v);
}

// Midnight (service day start) in Calgary time, as epoch seconds.
function calgaryMidnight() {
  const now = new Date();
  const ymd = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Edmonton', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(now);
  const [y, m, d] = ymd.split('-').map(Number);

  const off = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Edmonton', timeZoneName: 'shortOffset' })
    .formatToParts(now).find((p) => p.type === 'timeZoneName').value; // e.g. "GMT-6"
  const match = off.match(/GMT([+-]\d+)(?::(\d+))?/);
  const offsetSec = match ? (Number(match[1]) * 3600 + (match[2] ? Number(match[2]) * 60 : 0)) : -6 * 3600;

  return Math.floor(Date.UTC(y, m - 1, d) / 1000) - offsetSec;
}

// Pull the latest realtime feed and decode it.
export async function fetchFeed() {
  const res = await fetch(FEED_URL, { cache: 'no-store' });
  if (!res.ok) throw new Error('feed http ' + res.status);
  const buf = new Uint8Array(await res.arrayBuffer());
  const feed = transit_realtime.FeedMessage.decode(buf);
  await loadSchedule();
  return { feed, fetchedAt: Date.now() };
}

// Compute the wait + delay for the train you are trying to catch:
// trains on `route` calling at platform `stopId`, heading your way.
export async function computeWait(feed, route, stopId) {
  const schedule = await loadSchedule();
  const now = Math.floor(Date.now() / 1000);
  const midnight = calgaryMidnight();

  const arrivals = [];
  const delays = [];
  for (const e of feed.entity) {
    const tu = e.tripUpdate;
    if (!tu || !tu.trip || tu.trip.routeId !== route) continue;
    for (const stu of tu.stopTimeUpdate || []) {
      if (stu.stopId !== stopId) continue;
      const at = toNum(stu.arrival && stu.arrival.time);
      if (!at || at <= 0) continue;
      arrivals.push(at);
      const sched = schedule[tu.trip.tripId] && schedule[tu.trip.tripId][stopId];
      if (sched != null) {
        const d = at - (midnight + sched);
        if (Math.abs(d) <= 3 * 3600) delays.push(d);
      }
    }
  }

  arrivals.sort((a, b) => a - b);
  const future = arrivals.filter((a) => a > now);
  const nextEta = future.length ? future[0] - now : null;

  const headways = [];
  for (let i = 1; i < future.length; i++) headways.push(future[i] - future[i - 1]);
  const avgHeadway = headways.length ? headways.reduce((s, x) => s + x, 0) / headways.length : null;

  const avgWait = avgHeadway != null ? avgHeadway / 2 : nextEta;
  const avgDelay = delays.length ? delays.reduce((s, x) => s + x, 0) / delays.length : null;

  return {
    nextEtaMin: nextEta != null ? nextEta / 60 : null,
    avgWaitMin: avgWait != null ? avgWait / 60 : null,
    avgDelayMin: avgDelay != null ? avgDelay / 60 : null,
    upcoming: future.length,
    delaySamples: delays.length,
  };
}
