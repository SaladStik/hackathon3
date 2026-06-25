// Calgary does not publish live CTrain occupancy in its GTFS-RT feeds, so this
// is a ridership estimate from time of day (morning and afternoon peaks).
// Returns 0..1.
export function busyness(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Edmonton', hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(date);
  const hh = Number(parts.find((p) => p.type === 'hour').value);
  const mm = Number(parts.find((p) => p.type === 'minute').value);
  const h = hh + mm / 60;

  const peak = (c, w) => Math.exp(-((h - c) ** 2) / (2 * w * w));
  const v = 0.16 + 0.82 * peak(8, 1.3) + 0.85 * peak(17, 1.6) + 0.22 * peak(12, 2.2);
  return Math.max(0.08, Math.min(1, v));
}
