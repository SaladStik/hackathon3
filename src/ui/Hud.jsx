import React from 'react';
import { useStore } from './useStore.js';

export default function Hud() {
  const { hud, riding, terminus } = useStore();
  return (
    <>
      <header className="hud">
        <div className="hud-title">Calgary CTrain</div>
        <div className="hud-sub">{riding ? `Toward ${terminus}` : 'Choose your route'}</div>
      </header>
      <section className="status" aria-live="polite">
        <div className="status-now">{hud.now}</div>
        <div className="status-next">{hud.next}</div>
      </section>
    </>
  );
}
