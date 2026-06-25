import React from 'react';
import { useStore } from './useStore.js';

export default function Hud() {
  const { loading, error } = useStore();
  return (
    <header className="hud">
      <div className="hud-title">Calgary CTrain</div>
      <div className="hud-sub">
        {error ? 'Live data offline' : loading ? 'Loading live data' : 'Live arrivals'}
      </div>
    </header>
  );
}
