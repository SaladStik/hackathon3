import React, { useState } from 'react';
import { STATION_NAMES, DIRECTIONS } from '../data.js';
import { getState, setState } from '../store.js';
import { useStore } from './useStore.js';

export default function RouteMenu() {
  const { menuOpen } = useStore();
  const [dirIndex, setDirIndex] = useState(0);
  const [destIndex, setDestIndex] = useState(1);

  if (!menuOpen) {
    return (
      <button className="pill pill-left" onClick={() => setState({ menuOpen: true, riding: false })}>
        Route
      </button>
    );
  }

  const start = () => {
    const d = DIRECTIONS[dirIndex];
    setState({
      menuOpen: false,
      riding: true,
      dir: d.dir,
      terminus: d.term,
      destIndex,
    });
  };

  return (
    <div className="overlay" role="dialog" aria-label="Plan your trip">
      <div className="card">
        <h1 className="card-title">Plan your trip</h1>
        <p className="card-lead">Pick a direction and where you are getting off.</p>

        <span className="field-label">Heading toward</span>
        <div className="dir-grid">
          {DIRECTIONS.map((d, i) => (
            <button
              key={d.term}
              className={`dir ${i === dirIndex ? 'dir-sel' : ''}`}
              onClick={() => setDirIndex(i)}
              aria-pressed={i === dirIndex}
            >
              <span className="dir-term">{d.term}</span>
              <span className="dir-line">{d.line}</span>
            </button>
          ))}
        </div>

        <label className="field-label" htmlFor="dest">Destination station</label>
        <select
          id="dest"
          className="select"
          value={destIndex}
          onChange={(e) => setDestIndex(Number(e.target.value))}
        >
          {STATION_NAMES.map((name, i) => (
            <option key={name} value={i}>{name}</option>
          ))}
        </select>

        <button className="primary" onClick={start}>Start riding</button>
      </div>
    </div>
  );
}
