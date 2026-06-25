import React, { useEffect, useState } from 'react';
import { DIRECTIONS } from '../data.js';
import { busyness } from '../busyness.js';
import { computeWait, fetchFeed } from '../realtime.js';
import { getState, setState } from '../store.js';
import { useStore } from './useStore.js';

export default function TripPanel() {
  const { loading, error, feed, fetchedAt, panelOpen } = useStore();
  const [dirIndex, setDirIndex] = useState(0);
  const [stopId, setStopId] = useState(DIRECTIONS[0].boarding[0].stop_id);
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);

  const dirObj = DIRECTIONS[dirIndex];
  const lineColor = dirObj.line.includes('Blue') ? '#1f6f9c' : '#d81e2c';

  useEffect(() => { setState({ dir: dirObj.dir }); }, [dirIndex]);

  useEffect(() => {
    let alive = true;
    computeWait(feed, dirObj.route, stopId)
      .then((r) => { if (alive) setResult(r); })
      .catch(() => { if (alive) setResult(null); });
    return () => { alive = false; };
  }, [feed, dirIndex, stopId]);

  const onDir = (i) => { setDirIndex(i); setStopId(DIRECTIONS[i].boarding[0].stop_id); };

  const refresh = async () => {
    setBusy(true);
    setState({ loading: true, error: null });
    try {
      const { feed: f, fetchedAt: at } = await fetchFeed();
      setState({ feed: f, fetchedAt: at, loading: false });
    } catch (e) {
      setState({ error: String(e.message || e), loading: false });
    } finally { setBusy(false); }
  };

  if (!panelOpen) {
    return (
      <button className="pill pill-top" onClick={() => setState({ panelOpen: true })}>
        Plan a trip
      </button>
    );
  }

  return (
    <div className="panel">
      <div className="panel-head">
        <div>
          <div className="panel-title">Where are you headed?</div>
          <div className="panel-status">{error ? 'Live data offline' : loading ? 'Loading live data' : 'Live arrivals'}</div>
        </div>
        <button className="close" onClick={() => setState({ panelOpen: false })} aria-label="Hide panel">Hide</button>
      </div>

      <div className="chips">
        {DIRECTIONS.map((d, i) => (
          <button
            key={d.key}
            className={`chip ${i === dirIndex ? 'chip-on' : ''}`}
            style={i === dirIndex ? { background: d.line.includes('Blue') ? '#1f6f9c' : '#d81e2c', borderColor: 'transparent' } : undefined}
            onClick={() => onDir(i)}
          >
            <span className="chip-term">{d.terminus}</span>
            <span className="chip-line">{d.line}</span>
          </button>
        ))}
      </div>

      <div className="map" style={{ '--line': lineColor }}>
        {dirObj.stations.map((s, idx) => {
          const terminus = idx === dirObj.stations.length - 1;
          const selected = s.stop_id === stopId;
          return (
            <button
              key={s.stop_id}
              className={`stop ${selected ? 'stop-on' : ''} ${terminus ? 'stop-term' : ''}`}
              onClick={() => !terminus && setStopId(s.stop_id)}
              disabled={terminus}
            >
              <span className={`dot ${selected ? 'dot-on' : ''} ${terminus ? 'dot-term' : ''}`} />
              <span className="stop-name">{s.name}</span>
              {terminus && <span className="stop-tag">Terminus</span>}
              {selected && <span className="stop-tag">Board here</span>}
            </button>
          );
        })}
      </div>

      <Result loading={loading} result={result} dirObj={dirObj} />

      <div className="trip-foot">
        <span className="stamp">{fetchedAt ? `Updated ${timeAgo(fetchedAt)}` : 'Loading'}</span>
        <button className="link" onClick={refresh} disabled={busy || loading}>
          {busy ? 'Refreshing' : 'Refresh'}
        </button>
      </div>
    </div>
  );
}

function Result({ loading, result, dirObj }) {
  if (loading && !result) return <p className="lead-msg">Checking live arrivals</p>;
  if (!result || result.avgWaitMin == null) return <p className="lead-msg">Train times currently unavailable.</p>;

  const wait = round1(result.avgWaitMin);
  const next = result.nextEtaMin != null ? Math.round(result.nextEtaMin) : null;
  const load = Math.round(busyness() * 100);
  const loadColor = `hsl(${Math.round(120 * (1 - load / 100))}, 60%, 42%)`;

  let note = '';
  if (result.scheduled) note = ' from the timetable';
  else if (result.avgDelayMin != null) {
    const d = Math.round(result.avgDelayMin);
    note = d >= 1 ? `, about ${d} min late` : d <= -1 ? `, about ${-d} min early` : ', on time';
  }

  return (
    <div className="trip">
      <p className="trip-head"><strong>{wait}</strong> min wait</p>
      <p className="trip-sub">
        {next != null ? `Next ${dirObj.terminus} train in ${next} min` : `Toward ${dirObj.terminus}`}{note}
      </p>
      <div className="load">
        <div className="load-track"><div className="load-fill" style={{ width: `${load}%`, background: loadColor }} /></div>
        <span className="load-tag">{load}% full</span>
      </div>
    </div>
  );
}

function round1(v) { return v == null ? 'n/a' : Math.round(v * 10) / 10; }
function timeAgo(ts) {
  const s = Math.max(0, Math.round((Date.now() - ts) / 1000));
  return s < 60 ? `${s}s ago` : `${Math.round(s / 60)}m ago`;
}
