import React, { useEffect, useState } from 'react';
import { DIRECTIONS } from '../data.js';
import { busyness } from '../busyness.js';
import { computeWait, fetchFeed } from '../realtime.js';
import { getState, setState } from '../store.js';
import { useStore } from './useStore.js';

export default function TripPanel() {
  const { loading, error, feed, fetchedAt } = useStore();
  const [dirIndex, setDirIndex] = useState(0);
  const [stopId, setStopId] = useState(DIRECTIONS[0].boarding[0].stop_id);
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);

  const dirObj = DIRECTIONS[dirIndex];

  // keep the background train pointed the chosen way
  useEffect(() => { setState({ dir: dirObj.dir }); }, [dirIndex]);

  // recompute whenever the feed or the selection changes
  useEffect(() => {
    if (!feed) return;
    let alive = true;
    computeWait(feed, dirObj.route, stopId).then((r) => { if (alive) setResult(r); });
    return () => { alive = false; };
  }, [feed, dirIndex, stopId]);

  const onDir = (i) => {
    setDirIndex(i);
    setStopId(DIRECTIONS[i].boarding[0].stop_id);
  };

  const refresh = async () => {
    setBusy(true);
    setState({ loading: true, error: null });
    try {
      const { feed: f, fetchedAt: at } = await fetchFeed();
      setState({ feed: f, fetchedAt: at, loading: false });
    } catch (e) {
      setState({ error: String(e.message || e), loading: false });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="panel">
      <div className="panel-grip" />

      <span className="field-label">Heading toward</span>
      <div className="dir-grid">
        {DIRECTIONS.map((d, i) => (
          <button
            key={d.key}
            className={`dir ${i === dirIndex ? 'dir-sel' : ''}`}
            onClick={() => onDir(i)}
            aria-pressed={i === dirIndex}
          >
            <span className="dir-term">{d.terminus}</span>
            <span className="dir-line">{d.line}</span>
          </button>
        ))}
      </div>

      <label className="field-label" htmlFor="board">Getting on at</label>
      <select id="board" className="select" value={stopId} onChange={(e) => setStopId(e.target.value)}>
        {dirObj.boarding.map((s) => (
          <option key={s.stop_id} value={s.stop_id}>{s.name}</option>
        ))}
      </select>

      <Result loading={loading} error={error} result={result} dirObj={dirObj} />

      <div className="panel-foot">
        <span className="stamp">{fetchedAt ? `Live data ${timeAgo(fetchedAt)}` : 'Loading data'}</span>
        <button className="refresh" onClick={refresh} disabled={busy || loading}>
          {busy ? 'Refreshing' : 'Refresh'}
        </button>
      </div>
    </div>
  );
}

function Result({ loading, error, result, dirObj }) {
  if (error) return <div className="result result-msg">Could not load live data. {error}</div>;
  if (loading && !result) return <div className="result result-msg">Pulling the latest feed</div>;
  if (!result) return <div className="result result-msg">Pick your stop to see the next train.</div>;
  if (result.upcoming === 0) {
    return <div className="result result-msg">No trains toward {dirObj.terminus} predicted from this stop right now.</div>;
  }

  const wait = round1(result.avgWaitMin);
  const next = result.nextEtaMin != null ? Math.round(result.nextEtaMin) : null;
  const delay = result.avgDelayMin;

  return (
    <div className="result">
      <div className="result-big">{wait} min</div>
      <div className="result-cap">average wait toward {dirObj.terminus}</div>
      <div className="result-row">
        <Stat label="Next train" value={next != null ? `${next} min` : 'n/a'} />
        <Stat label="Average delay" value={delay != null ? signed(delay) : 'n/a'} tone={delayTone(delay)} />
        <Stat label="Train load" value={`${Math.round(busyness() * 100)}%`} />
      </div>
    </div>
  );
}

function Stat({ label, value, tone }) {
  return (
    <div className="stat">
      <div className={`stat-value ${tone || ''}`}>{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

function round1(v) { return v == null ? 'n/a' : (Math.round(v * 10) / 10); }
function signed(v) { const r = Math.round(v * 10) / 10; return `${r >= 0 ? '+' : ''}${r} min`; }
function delayTone(v) { if (v == null) return ''; if (v > 2) return 'tone-late'; if (v < -1) return 'tone-early'; return 'tone-ok'; }
function timeAgo(ts) {
  const s = Math.max(0, Math.round((Date.now() - ts) / 1000));
  if (s < 60) return `${s}s ago`;
  return `${Math.round(s / 60)}m ago`;
}
